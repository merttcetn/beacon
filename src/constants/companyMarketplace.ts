import { colors } from '@/theme';

// MOCK: Hackathon demosu icin statik B2B marketplace verisi.
export const COMPANY_FILTERS = [
  { label: 'Çankaya', value: '4 mahalle', dot: colors.accent.primary },
  { label: 'Eksik rampa · Çukur', value: '62 sinyal', dot: colors.status.new },
  { label: 'Son 30 gün', value: 'aktif', dot: colors.status.partial },
  { label: '≥ 3 doğrulama', value: '%74', dot: colors.status.verified },
] as const;

export const COMPANY_SUMMARY = [
  { label: 'Ticket', value: '247', meta: '+18 yeni', tone: colors.text.primary },
  { label: 'Doğrulama', value: '74%', meta: '183 net', tone: colors.status.verified },
  { label: 'Erişim etkisi', value: '12.4K', meta: 'kişi', tone: colors.role.visuallyImpaired },
] as const;

export const COMPANY_CATEGORIES = [
  { label: 'Eksik rampa', pct: 34, tone: colors.status.new },
  { label: 'Çukur', pct: 28, tone: colors.status.partial },
  { label: 'Yüzey hasarı', pct: 18, tone: colors.role.company },
  { label: 'Engel', pct: 12, tone: colors.role.visuallyImpaired },
  { label: 'Diğer', pct: 8, tone: colors.text.tertiary },
] as const;

export const COMPANY_BRIEF = {
  title: 'ODTÜ - Mahall erişim koridoru',
  score: '82',
  signal: 'Yüksek ihale uyumu',
  description:
    '47 doğrulanmış kaldırım ve rampa problemi aynı yaya aksında kümeleniyor.',
  chips: ['47 ticket', '30 gün', '%78 doğrulandı'],
  metrics: [
    { label: 'Tahmini paket', value: '₺4.8M' },
    { label: 'Mahalle', value: '4' },
    { label: 'Aksiyon yok', value: '21g' },
  ],
} as const;

export const COMPANY_REQUESTS = [
  {
    id: 'DR-248',
    title: 'Çankaya rampa + çukur paketi',
    createdAt: 'Bugün 14:20',
    statusLabel: 'Bildirim gönderildi',
    statusTone: colors.status.verified,
    count: '47 ticket',
    contact: 'satinalma@yapikent.com.tr',
    value: 'Yüksek ihale uyumu',
    filters: ['Çankaya', 'Eksik rampa', 'Son 30 gün'],
    progress: 1,
  },
  {
    id: 'DR-241',
    title: 'Teknokent çevresi erişim hasarı',
    createdAt: 'Dün 18:05',
    statusLabel: 'Örnek veri hazır',
    statusTone: colors.status.partial,
    count: '31 ticket',
    contact: 'planlama@yapikent.com.tr',
    value: 'Bakım önceliği',
    filters: ['ODTÜ', 'Yüzey hasarı', '3+ doğrulama'],
    progress: 0.72,
  },
  {
    id: 'DR-236',
    title: 'Bilkent yolu kaldırım engelleri',
    createdAt: '12 Mayıs',
    statusLabel: 'Kapanan talep',
    statusTone: colors.text.tertiary,
    count: '18 ticket',
    contact: 'demo@yapikent.com.tr',
    value: 'Düşük hacim',
    filters: ['Bilkent', 'Engel', 'Hepsi'],
    progress: 0.46,
  },
] as const;

export const COMPANY_ACCOUNT_STATS = [
  { label: 'Kullanıcı', value: '8' },
  { label: 'Talep', value: '24' },
  { label: 'Paket', value: '6' },
] as const;

export const COMPANY_ACCOUNT_ROWS = [
  { label: 'Sözleşme', value: 'MVP demo hesabı' },
  { label: 'Fatura adresi', value: 'Ankara Teknokent' },
  { label: 'Veri kapsamı', value: 'Anonimleştirilmiş saha sinyalleri' },
  { label: 'Bildirim maili', value: 'satinalma@yapikent.com.tr' },
] as const;
