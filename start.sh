#!/usr/bin/env bash
# start.sh — ai servisini her cihazda DETERMİNİSTİK başlatır.
#
# Nereden çağrılırsa çağrılsın kendi dizinine (repo kökü) geçer, ortam tanılaması
# yapar, ön-kontrolleri sırayla geçer, bağımlılıkları kurar, uygulamayı doğrular ve
# uvicorn'u başlatır. HER ŞEY runtime/start.log'a yazılır.
#
# Hata olursa: net sebep + çözüm + kök neden için ortam tanılaması + tam log yolu.
# Beklenmedik (ele alınmamış) bir hata bile yakalanır: hangi satır, hangi komut, çıkış kodu.
#
# Kullanım:  ./start.sh            (repo klasörünün içinden)
#            bash <yol>/start.sh   (her yerden)
# Ortam:     PORT=8001 ./start.sh  ·  HOST=127.0.0.1 ./start.sh

# Re-exec under bash if launched via sh/dash (BASH_SOURCE / arrays need bash).
[ -n "${BASH_VERSION:-}" ] || exec bash "$0" "$@"
set -uo pipefail

# --- 0. Konum: scriptin bulunduğu dizine geç (cwd bağımsızlığı) -------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || { echo "FATAL: $SCRIPT_DIR dizinine geçilemedi"; exit 1; }

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
  log "KÖK NEDEN için: log dosyasının başındaki 'ortam tanılaması' bölümüne bak."
  log "Tam log : $LOG_FILE"
  log "Takılırsan bu log dosyasını ekiple paylaş."
  log "═════════════════════════════════════════════════════"
  exit 1
}

# Beklenmedik (script'in açıkça ele almadığı) hatayı yakala — kök nedeni göster.
trap_err() {
  local line="$1" cmd="$2" code="$3"
  log ""
  log "════════════════ BEKLENMEDİK HATA ════════════════"
  log "✗ Script satır ${line}'da beklenmedik şekilde durdu."
  log "  Başarısız komut : ${cmd}"
  log "  Çıkış kodu      : ${code}"
  log ""
  log "Bu, script'in öngörmediği bir hata. Kök neden için:"
  log "  · log dosyasının başındaki 'ortam tanılaması' bölümü"
  log "  · yukarıdaki son adım çıktısı"
  log "Tam log : $LOG_FILE  — takılırsan bunu ekiple paylaş."
  log "═══════════════════════════════════════════════════"
  exit "$code"
}
trap 'trap_err "$LINENO" "$BASH_COMMAND" "$?"' ERR

log "🦮 ai servisi — başlatma scripti"
log "   tarih : $(date '+%Y-%m-%d %H:%M:%S')"
log "   log   : $LOG_FILE"

# --- ortam tanılaması: her hatanın kök nedeni burada görünür ---------------
log ""
log "── ORTAM TANILAMASI ──────────────────────────────────"
log "  OS       : $(uname -srm 2>/dev/null || echo '?')"
log "  Bash     : ${BASH_VERSION:-?}"
log "  cwd      : $SCRIPT_DIR"
log "  uv       : $(command -v uv >/dev/null 2>&1 && uv --version 2>&1 || echo 'KURULU DEĞİL')"
log "  python3  : $(command -v python3 2>/dev/null || echo 'yok')"
log "  ffmpeg   : $(command -v ffmpeg >/dev/null 2>&1 && echo var || echo 'yok')"
if [[ -n "${CONDA_PREFIX:-}" || -n "${CONDA_DEFAULT_ENV:-}" ]]; then
  log "  conda    : AKTİF (env=${CONDA_DEFAULT_ENV:-?}) — uv kendi .venv'ini kullanır, normalde sorun değil"
else
  log "  conda    : yok"
fi
log "  git      : $(git rev-parse --short HEAD 2>/dev/null || echo '?') / $(git branch --show-current 2>/dev/null || echo '?')"
if [[ -f .env ]]; then
  _kt="$(grep -m1 -E '^[[:space:]]*GEMINI_API_KEY[[:space:]]*=' .env 2>/dev/null | cut -d= -f2- | tr -d ' "')"
  if [[ -n "$_kt" ]]; then
    log "  .env key : …${_kt: -6} (GEMINI_API_KEY son 6 hane)"
  else
    log "  .env key : BOŞ"
  fi
else
  log "  .env     : YOK"
fi
for _v in GEMINI_API_KEY GOOGLE_API_KEY GOOGLE_APPLICATION_CREDENTIALS; do
  [[ -n "${!_v:-}" ]] && log "  ⚠ env    : kabukta $_v TANIMLI — .env'i ezer (Adım 3'te yok sayılacak)"
done
log "──────────────────────────────────────────────────────"

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
# bu çalıştırmaya özgü (yalnızca bu script + alt süreçleri) kabuk override'larını sil.
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
       "Tam çıktı yukarıda ve log dosyasında." \
       "Sık sebep: internet yok · Python 3.13 sağlanamadı · disk dolu."
fi
ok "Bağımlılıklar hazır (.venv)"

# --- 5. Uygulama yüklenebiliyor mu? (uvicorn'dan ÖNCE temiz hata) ----------
step "5/6 · Uygulama import testi"
if ! IMPORT_OUT="$(uv run python -c 'import ai_pipeline.main' 2>&1)"; then
  log ""
  log "  ── import traceback ──"
  while IFS= read -r _l; do log "  $_l"; done <<< "$IMPORT_OUT"
  fail "ai_pipeline.main import edilemedi." \
       "Yukarıdaki traceback kök nedeni gösterir (eksik bağımlılık / kod hatası / yanlış Python)." \
       "'uv sync' tekrar dene; çözülmezse log'u ekiple paylaş."
fi
PYBIN="$(uv run python -c 'import sys; print(sys.executable)' 2>/dev/null || echo '?')"
ok "ai_pipeline.main yüklendi"
log "  python   : $PYBIN"

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
log "   Loglar: $LOG_FILE  (çalışma anı hataları da buraya yazılır)"
log "   Durdur: Ctrl+C"
log "═════════════════════════════════════════════════════"
log ""

# uvicorn'un çıkışını kendimiz yorumlayacağız — ERR trap'ini bu satırda devre dışı bırak.
trap - ERR
uv run uvicorn ai_pipeline.main:app --host "$HOST" --port "$PORT" --reload 2>&1 | tee -a "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}

# 0 = temiz · 130 = Ctrl+C (SIGINT) · 143 = kill (SIGTERM) — hepsi normal duruş.
if [[ "$EXIT_CODE" -ne 0 && "$EXIT_CODE" -ne 130 && "$EXIT_CODE" -ne 143 ]]; then
  log ""
  log "════════════════ SERVİS ÇÖKTÜ ════════════════"
  log "✗ uvicorn beklenmedik şekilde durdu (çıkış kodu $EXIT_CODE)."
  log "  Çalışma anı hatasının tam dökümü yukarıda ve: $LOG_FILE"
  log "  (ör. 429 quota, port hatası, import hatası — log'da ararken 'ERROR' / 'Traceback')"
  log "═══════════════════════════════════════════════"
  exit "$EXIT_CODE"
fi
log ""
log "Servis durduruldu (çıkış kodu $EXIT_CODE)."
