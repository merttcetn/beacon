# CLAUDE.md — AI Servisi (`ai` repo)

> Claude Code bu repoyu işlerken bu dosyayı **ve** import edilen `AGENTS.md`'yi okur.
> Proje bağlamı, mimari, scope, teknik konvansiyonlar ve tüm agent'lar için ortak davranış kuralları **tek kaynak: `AGENTS.md`** — burada tekrarlanmaz (DRY).

@AGENTS.md

## Bu Dosya Ne Ekler?

`AGENTS.md` repoda çalışan her agent'ın ortak context'idir. Bu dosya yalnızca **Claude Code'a özel** olanı ekler: Claude ↔ Codex çalışma döngüsü ve Codex'ten gelen review'lerin değerlendirme protokolü.

İş bölümü: **Claude planlar ve uygular; Codex planları review eder.** Codex'in review'i nasıl yapacağı `AGENTS.md §11`'de tanımlı. Bu dosya Claude'un o review'i nasıl karşılayacağını tanımlar.

## Plan → Codex Review Döngüsü

Kayda değer her plan/değişiklik şu döngüden geçer:

1. **Claude plan üretir** — adımlar + **her kritik karar için gerekçe**. Gerekçesiz karar bırakma; Codex (`AGENTS.md §11`) tam da onu arar.
2. **Codex review eder** — plan Codex'e gönderilir (`codex-review` skill veya codex MCP aracı). Codex `AGENTS.md §11`'e göre değerlendirir, **APPROVED** / **NEEDS_REVISION** döner.
3. **Claude review'i değerlendirir** — aşağıdaki "Codex Review Davranışı"na göre.
4. **Kullanıcıya rapor + onay** — cross-check tablosu + hikaye/niye/fix. Kullanıcı son karar verici.
5. **NEEDS_REVISION ise** plan güncellenir; gerekirse round 2.
6. **Onaylı plan implemente edilir.**

Büyük/riskli işlerde döngü zorunlu; küçük düzeltmelerde kullanıcı atlatabilir.

## Codex Review Davranışı

Codex'ten bir review geldiğinde Claude:

1. **Objektif ve proaktif değerlendir** — bulguyu yüzeyde ne kabul et ne reddet. Codex haklı da olabilir haksız da; önce ne dediğini anla.
2. **Cross-check yap** — dosya oku, kod/komut çalıştır, `product-spec.md`'ye bak, kanıt topla. Numerik/olgusal iddialar gerçek veriyle teyit edilir.
3. **Kanıt tablosu çıkar** — her bulgu: `bulgu | severity | cross-check sonucu | kabul/red | dayanak (dosya:satır / spec § / komut çıktısı)`.
4. **Sadece doğrulananları uygula** — kanıtla destekleniyorsa plana al.
5. **Yanlış / kapsam-dışı / teknik hatalı bulguyu gerekçeli reddet** — sessiz geçme. Açıkça "bu bulgu yanlış, çünkü X (kanıt)" de. Codex'e performatif uyum gösterme.
6. **Kullanıcı son karar verici** — Codex yardımcı; ana plan kullanıcının vizyonu. Ana planla çelişen iyileştirme kullanıcı onayı ister.
7. **İmplementasyondan önce** cross-check raporu kullanıcıya sunulur.

## Codex Review'inin Kullanıcıya Sunumu

Codex'in çıktısı **olduğu gibi geçilmez** — "F1 severity HIGH location X" Codex'in internal formatıdır, kullanıcının okuduğu format değil. Sunarken:

1. **Cross-check tablosu** — severity / evidence / kabul-red kararı (zorunlu, kanıt-bazlı).
2. **Her kritik bulgu için Hikaye + Niye önemli + Fix** (3-4 satır):
   - *Hikaye:* sorun ne, neyin üzerinde oluşuyor
   - *Niye önemli:* somut etki — hangi patern / akış / endpoint fail eder
   - *Fix:* 1-2 cümlede çözüm
3. Çok bulgu varsa en kritik 2-3'ü detaylı, gerisi özet tablo.
4. Round 2/3 seçeneği sunarken "ne olacağını" açıkla — sadece "devam mı?" değil.

## Versiyon

- **v1 — 16.05.2026** — İlk sürüm. `@AGENTS.md` import'u, Plan → Codex Review döngüsü, "Codex Review Davranışı" ve "Kullanıcıya Sunum" bölümleri tanımlandı.
