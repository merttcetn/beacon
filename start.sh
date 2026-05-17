#!/usr/bin/env bash
# start.sh — ai servisini her cihazda DETERMİNİSTİK başlatır.
#
# Nereden çağrılırsa çağrılsın kendi dizinine (repo kökü) geçer, ön-kontrolleri
# yapar, bağımlılıkları kurar, uygulamayı doğrular ve uvicorn'u başlatır.
# Herhangi bir adım başarısız olursa: net sebep + çözüm + tam log yolu basar.
#
# Kullanım:  ./start.sh        (repo klasörünün içinden)
#            bash <yol>/start.sh   (her yerden)
# Ortam:     PORT=8001 ./start.sh  · HOST=127.0.0.1 ./start.sh

# Re-exec under bash if launched via sh/dash (BASH_SOURCE/arrays need bash).
[ -n "${BASH_VERSION:-}" ] || exec bash "$0" "$@"
set -uo pipefail

# --- 0. Konum: scriptin bulunduğu dizine geç (cwd bağımsızlığı) -------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || { echo "FATAL: $SCRIPT_DIR'e geçilemedi"; exit 1; }

# --- log altyapısı ---------------------------------------------------------
LOG_DIR="$SCRIPT_DIR/runtime"
mkdir -p "$LOG_DIR" 2>/dev/null || true
LOG_FILE="$LOG_DIR/start.log"
: > "$LOG_FILE" 2>/dev/null || LOG_FILE="/tmp/ai-start.log"

log()  { printf '%s\n' "$*" | tee -a "$LOG_FILE"; }
step() { log ""; log "▸ $*"; }
ok()   { log "  ✓ $*"; }
warn() { log "  ! $*"; }

fail() {
  log ""
  log "════════════════ BAŞLATMA BAŞARISIZ ════════════════"
  log "✗ $1"
  shift || true
  for line in "$@"; do log "  → $line"; done
  log ""
  log "Tam log:  $LOG_FILE"
  log "Takılırsan bu log dosyasını ekiple paylaş."
  log "═════════════════════════════════════════════════════"
  exit 1
}

log "🦮 ai servisi — başlatma scripti"
log "   tarih : $(date '+%Y-%m-%d %H:%M:%S')"
log "   konum : $SCRIPT_DIR"
log "   log   : $LOG_FILE"

# --- 1. Proje dizini doğru mu? --------------------------------------------
step "1/6 · Proje dizini"
if [[ ! -f pyproject.toml ]]; then
  fail "pyproject.toml burada yok — script yanlış konumda." \
       "start.sh, ai reposunun KÖKÜNDE olmalı (pyproject.toml + src/ ile aynı yerde)." \
       "Repoyu doğru klonladığından emin ol; bu dosyayı taşıma."
fi
if [[ ! -d src/ai_pipeline ]]; then
  fail "src/ai_pipeline/ bulunamadı — repo eksik veya bozuk." \
       "Çözüm:  git pull   ya da repoyu yeniden klonla."
fi
ok "pyproject.toml + src/ai_pipeline/ yerinde"

# --- 2. uv + araçlar -------------------------------------------------------
step "2/6 · Araçlar (uv, ffmpeg)"
if ! command -v uv >/dev/null 2>&1; then
  fail "uv paket yöneticisi kurulu değil." \
       "Kur:  curl -LsSf https://astral.sh/uv/install.sh | sh" \
       "Sonra YENİ bir terminal aç ve scripti tekrar çalıştır."
fi
ok "uv $(uv --version 2>&1 | awk '{print $2}')"
if command -v ffmpeg >/dev/null 2>&1; then
  ok "ffmpeg var"
else
  warn "ffmpeg yok — /dev/buddy-video ve demo script çalışmaz (ana akış etkilenmez)."
fi

# --- 3. .env yapılandırması -----------------------------------------------
step "3/6 · .env yapılandırması"
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    warn ".env yoktu — .env.example'dan kopyalandı. ANAHTARLARI DOLDURMAN GEREKİR."
  else
    fail ".env yok (.env.example de yok)." \
         "Çözüm:  git pull   — .env repoda commit'li olmalı."
  fi
fi
if grep -qE '^[[:space:]]*GEMINI_API_KEY[[:space:]]*=[[:space:]]*.+' .env; then
  ok ".env var · GEMINI_API_KEY dolu"
else
  warn ".env içinde GEMINI_API_KEY boş — VLM endpoint'leri güvenli fallback dönecek."
fi
# pydantic-settings'te OS ortam değişkeni .env'i EZER. Deterministik çalışma için
# bu çalıştırmaya özgü (sadece bu script + alt süreçleri) kabuk override'larını temizle.
for _var in GEMINI_API_KEY GOOGLE_API_KEY GOOGLE_APPLICATION_CREDENTIALS; do
  if [[ -n "${!_var:-}" ]]; then
    warn "Kabukta $_var tanımlı — .env'i ezerdi; bu çalıştırma için yok sayılıyor."
    unset "$_var"
  fi
done

# --- 4. Bağımlılıklar (uv sync) -------------------------------------------
step "4/6 · Bağımlılıklar kuruluyor (uv sync) — ilk sefer uzun sürebilir"
if ! uv sync 2>&1 | tee -a "$LOG_FILE"; then
  fail "uv sync başarısız — bağımlılıklar kurulamadı." \
       "Çıktı yukarıda + log dosyasında." \
       "Sık sebep: internet yok · Python 3.13 sağlanamadı · disk dolu."
fi
ok "Bağımlılıklar hazır (.venv)"

# --- 5. Uygulama yüklenebiliyor mu? (uvicorn'dan ÖNCE temiz hata) ----------
step "5/6 · Uygulama import testi"
if ! IMPORT_OUT="$(uv run python -c 'import ai_pipeline.main' 2>&1)"; then
  log "$IMPORT_OUT"
  fail "ai_pipeline.main import edilemedi." \
       "Yukarıdaki traceback'e bak — kod hatası ya da eksik bağımlılık." \
       "'uv sync' tekrar dene; çözülmezse log'u ekiple paylaş."
fi
ok "ai_pipeline.main sorunsuz yüklendi"

# --- 6. Port kontrolü ------------------------------------------------------
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
step "6/6 · Port $PORT"
if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  BUSY_PID="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1)"
  fail "Port $PORT zaten kullanımda (PID ${BUSY_PID:-?})." \
       "Eski servisi durdur:  kill ${BUSY_PID:-<PID>}" \
       "Ya da farklı port kullan:  PORT=8001 ./start.sh"
fi
ok "Port $PORT boş"

# --- Servisi başlat --------------------------------------------------------
log ""
log "═════════════════════════════════════════════════════"
log "✓ Tüm kontroller geçti — servis başlatılıyor"
log "   Adres : http://localhost:$PORT"
log "   Test  : http://localhost:$PORT/test"
log "   Durdur: Ctrl+C"
log "═════════════════════════════════════════════════════"
log ""

uv run uvicorn ai_pipeline.main:app --host "$HOST" --port "$PORT" --reload 2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}
# 0 = temiz çıkış · 130 = Ctrl+C (SIGINT) · 143 = kill (SIGTERM) — hepsi normal duruş.
if [[ "$EXIT_CODE" -ne 0 && "$EXIT_CODE" -ne 130 && "$EXIT_CODE" -ne 143 ]]; then
  fail "uvicorn beklenmedik şekilde durdu (çıkış kodu $EXIT_CODE)." \
       "Yukarıdaki çıktıya + log dosyasına bak."
fi
log ""
log "Servis durduruldu."
