# Runbook — Gemini 429 / `limit: 0` Quota Sorunu

> Bu doküman hem bir **sorun giderme runbook'u**, hem de bir takım arkadaşının Claude Code'una
> olduğu gibi verilebilecek **doğrulama kapılı bir aksiyon planı**dır. Her adımı çalıştır,
> çıktısını göster, doğrulama kriterini "geçti/geçmedi" diye işaretle — ancak geçtiyse ilerle.

## Belirti

Servis `429 RESOURCE_EXHAUSTED` alıyor; log'da belirleyici satır:

```
Quota exceeded ... limit: 0, model: gemini-3.1-pro ... free_tier
```

`limit: 0` = "günlük kota doldu" değil → **kullanılan Gemini key, billing (faturalandırma)
açık olmayan bir Google projesine ait.** Ücretsiz katman `gemini-3.1-pro` preview modeline
**sıfır** erişim verir. `config.py`'deki `pattern_*_llm_model` hepsi `gemini-3.1-pro-preview`
kullandığı için her pattern çağrısı 429'a düşer ve endpoint güvenli boş fallback döndürür.

## Kök neden

Makine değil, **API key**. Aynı `.env` iki makinede olsa bile farklı key devreye girebilir:

1. **Shell ortam değişkeni `.env`'i eziyor** — `pydantic-settings` önceliği:
   **OS ortam değişkeni > `.env` dosyası**. Kabukta (`~/.zshrc` vb.) `export GEMINI_API_KEY=...`
   varsa, repo'daki `.env` ne olursa olsun ezilir. **En sık sebep budur.**
2. **`google-genai` SDK'sının kendi fallback'i** — pydantic'ten boş string gelse bile SDK
   doğrudan `GEMINI_API_KEY` / `GOOGLE_API_KEY` ortam değişkenlerine ya da ADC'ye düşebilir.
3. **Yerel `.env` farklı** — `.env` repoya sonradan commit'lendi; makinede ondan önceki
   kişisel `.env` (ücretsiz key) duruyor olabilir.

Servis artık başlangıçta `Gemini API key yüklendi — son 6 hane: …XXXXXX` satırını loglar;
hangi key'in gerçekten yüklendiği buradan görülür.

**Hedef:** Makinenin, ekibin billing'li key'ini kullandığını **kanıtlamak**.

---

## Adım 1 — Repo durumunu doğrula

```bash
cd <repo>/ai
git fetch origin && git status -sb && git log --oneline -1
```

**Doğrulama:** `origin/main` ile güncel olmalı. Değilse `git pull`. ✅ → Adım 2.

## Adım 2 — Tüm key kaynaklarını tespit et

```bash
echo "GEMINI_API_KEY : ${GEMINI_API_KEY:-<yok>}"
echo "GOOGLE_API_KEY : ${GOOGLE_API_KEY:-<yok>}"
env | grep -iE 'gemini|google_api|vertex|google_application' || echo "(ilgili env yok)"
echo "Yerel .env     : $(grep -m1 GEMINI_API_KEY .env 2>/dev/null || echo '<satir yok>')"
echo "Ekip (commit)  : $(git show origin/main:.env | grep -m1 GEMINI_API_KEY)"
ls ~/.config/gcloud/application_default_credentials.json 2>/dev/null \
  && echo "  ↑ ADC dosyası VAR (SDK bunu kullanabilir)"
```

**Doğrulama / karar:**

- Herhangi bir `GEMINI_API_KEY` / `GOOGLE_API_KEY` ortam değişkeni `<yok>` **değilse** →
  `.env`'i eziyor. Adım 3a.
- Yerel `.env`'deki key commit'li sürümden **farklıysa** → yerel `.env` yanlış. Adım 3b.
- ADC dosyası varsa → Adım 3c.

## Adım 3a — Ortam değişkenlerini kaldır

```bash
unset GEMINI_API_KEY GOOGLE_API_KEY
grep -nE 'GEMINI_API_KEY|GOOGLE_API_KEY' ~/.zshrc ~/.zprofile ~/.bashrc ~/.bash_profile ~/.envrc 2>/dev/null
```

Çıkan satır(lar) varsa o dosyalardan **sil**, yeni terminal aç.
**Doğrulama:** `echo "${GEMINI_API_KEY:-<yok>}"` → `<yok>` olmalı.

## Adım 3b — `.env`'i ekip sürümüne döndür

```bash
git checkout origin/main -- .env
grep -m1 GEMINI_API_KEY .env
```

**Doğrulama:** `.env`'deki key commit'li key ile **birebir aynı** olmalı.

## Adım 3c — ADC'yi temizle (varsa)

```bash
gcloud auth application-default revoke 2>/dev/null
echo $GOOGLE_APPLICATION_CREDENTIALS
```

`GOOGLE_APPLICATION_CREDENTIALS` doluysa shell profilinden de sil.

## Adım 4 — KANIT: hangi key yüklü ve Pro'ya erişiyor mu?

```bash
uv run python - <<'EOF'
import asyncio
from google import genai
from ai_pipeline.config import settings

async def main():
    key = settings.gemini_api_key
    print(f"Yuklenen key oneki: {key[:10]}...  son 6: {key[-6:]}  (uzunluk {len(key)})")
    client = genai.Client(api_key=key)
    try:
        await client.aio.models.generate_content(
            model="gemini-3.1-pro-preview", contents="ping")
        print("OK -- Pro modeli ERISILEBILIR, key billing'li. Sorun cozuldu.")
    except Exception as e:
        msg = str(e)
        if "RESOURCE_EXHAUSTED" in msg or "429" in msg:
            print("HATA -- 429: bu key hala ucretsiz katman, Pro'ya erisimi yok.")
        else:
            print(f"HATA -- farkli hata: {msg[:200]}")

asyncio.run(main())
EOF
```

**Doğrulama:**

- "son 6" değeri ekibin doğru key tail'i ile **aynı** olmalı (ekiple karşılaştır).
- `OK -- Pro modeli ERISILEBILIR` → Adım 5.
- `HATA -- 429` → "son 6" ekibinkinden farklıysa hâlâ yanlış key yükleniyor (Adım 2-3'ü
  tekrar gözden geçir). Aynıysa commit'li key'in kendisi billing'siz/bitik demektir — ekiple
  key'i tazele.

## Adım 5 — Uçtan uca doğrulama

```bash
# 1. terminal: servisi yeniden başlat
uv run uvicorn ai_pipeline.main:app --reload --host 0.0.0.0 --port 8000
#   → başlangıç log'unda "Gemini API key yüklendi — son 6 hane: …" satırını kontrol et

# 2. terminal:
curl -s http://localhost:8000/health
curl -s -X POST http://localhost:8000/v1/assist -F "event=voice" -F "transcript=spor moduna gec"
```

**Doğrulama:** İkinci çağrı dolu/anlamlı JSON dönmeli; log'da `429` ya da
`Buddy kare analizi: VLM başarısız` **olmamalı**. ✅ → sorun çözüldü.

## Yedek plan — billing'li key hiç bulunamıyorsa

Ücretsiz katman `flash` modellerini destekler (Pro'yu desteklemez). `.env`'e ekle
(kalite düşer ama çalışır):

```env
PATTERN_A_LLM_MODEL=gemini-3.1-flash
PATTERN_B_LLM_MODEL=gemini-3.1-flash
PATTERN_C_LLM_MODEL=gemini-3.1-flash
PATTERN_D_LLM_MODEL=gemini-3.1-flash
```

Sonra Adım 5'i tekrarla.

## İlgili — log'daki STT hatası ayrı

`fal.ai STT response içinde transcript bulunamadı` 429 ile ilgisizdir; genelde kayıt çok
kısa/sessiz olduğunda ya da `falai` key'i eksikse olur. 429 çözüldükten sonra ayrıca bakılır.

## Not — paylaşılan key

Tüm ekip tek bir billing'li key kullanıyorsa günlük istek/token kotası **paylaşılır**;
yoğun kullanımda gün içi geçici 429 görülebilir (bu `limit: 0` değil, gerçek tüketim).
Gerekirse kişi başı ayrı billing'li key tercih edilir.
