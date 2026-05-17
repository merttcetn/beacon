// One-shot: SAMPLE_TICKETS -> SQL insert statements. Çalıştır, çıktıyı al, sonra dosyayı sil.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, '../src/constants/sampleTickets.ts'), 'utf8');

// commonsImage helper aynısı
const commonsImage = (hashPath, fileName) =>
  `https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/${hashPath}/${encodeURIComponent(
    fileName.replace(/ /g, '_'),
  )}&w=1200`;

// TS dosyayı eval ile değerlendirebilmek için commonsImage çağrılarını URL string'e çevirelim
const transformed = src.replace(
  /commonsImage\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g,
  (_, h, f) => JSON.stringify(commonsImage(h, f)),
);

const dataStart = transformed.indexOf('export const SAMPLE_TICKETS');
const arrStart = transformed.indexOf('[', dataStart);
const arrEnd = transformed.lastIndexOf('];') + 1;
const arrLiteral = transformed.slice(arrStart, arrEnd);

// `as Ticket[]` veya tip annotation yok zaten
const tickets = eval(arrLiteral);

const esc = (s) => String(s).replace(/'/g, "''");
const arrLit = (xs) => `ARRAY[${xs.map((x) => `'${esc(x)}'`).join(',')}]::text[]`;

const rows = tickets.map((t) => {
  const cols = [
    `'${esc(t.id)}'`,
    `'${esc(t.created_by)}'`,
    `${t.location.latitude}`,
    `${t.location.longitude}`,
    `'${esc(t.issue_type)}'`,
    `'${esc(t.severity)}'`,
    arrLit(t.affected_users),
    `'${esc(t.description_tr)}'`,
    arrLit(t.photo_urls),
    `${t.confidence}`,
    `'${esc(t.source)}'`,
    `${t.verification_count}`,
    `${t.verified}`,
    `'${esc(t.status)}'`,
    `'${esc(t.created_at)}'`,
    `'${esc(t.updated_at)}'`,
  ];
  return `(${cols.join(', ')})`;
});

const sql = `insert into public.tickets
  (id, created_by, lat, lng, issue_type, severity, affected_users, description_tr,
   photo_urls, confidence, source, verification_count, verified, status, created_at, updated_at)
values
${rows.join(',\n')};`;

writeFileSync(resolve(here, 'seed.sql'), sql);
console.log(`Wrote ${rows.length} rows -> scripts/seed.sql`);
