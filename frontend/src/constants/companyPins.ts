import type { AppMapCircle } from '@/components/AppMap';
import { colors } from '@/theme';
import type { IssueType, Severity } from '@/types';

export interface CompanyPin {
  id: string;
  latitude: number;
  longitude: number;
  category: IssueType;
  severity: Severity;
  verification_count: number;
  status: 'new' | 'partial' | 'verified';
}

interface ClusterDef {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  count: number;
  // Heat circle yarıçapı (metre) ve baz renk yoğunluğu (0..1)
  heatRadius: number;
  intensity: number;
}

// Teknokent / Mahall / ODTÜ ana giriş / Bilkent yolu civarı
const CLUSTERS: ClusterDef[] = [
  { id: 'tek-a', name: 'Teknokent A blok',  latitude: 39.8763, longitude: 32.7559, count: 14, heatRadius: 240, intensity: 0.95 },
  { id: 'tek-c', name: 'Teknokent C blok',  latitude: 39.8782, longitude: 32.7601, count: 12, heatRadius: 210, intensity: 0.80 },
  { id: 'mahall-avm', name: 'Mahall AVM',   latitude: 39.8755, longitude: 32.7479, count: 11, heatRadius: 220, intensity: 0.85 },
  { id: 'mahall-park', name: 'Mahall park', latitude: 39.8744, longitude: 32.7461, count: 9,  heatRadius: 180, intensity: 0.65 },
  { id: 'odtu-giris', name: 'ODTÜ giriş',   latitude: 39.8917, longitude: 32.7833, count: 8,  heatRadius: 200, intensity: 0.55 },
  { id: 'bilkent-yol', name: 'Bilkent yolu', latitude: 39.8676, longitude: 32.7493, count: 7,  heatRadius: 170, intensity: 0.50 },
];

// Design oran dağılımı (frontend-spec §4 + tasarım panelinden):
//  missing_ramp 34 · pothole 28 · uneven 18 · obstacle 12 · diğer 8
const CATEGORY_POOL: IssueType[] = [
  ...Array(34).fill('missing_ramp'),
  ...Array(28).fill('pothole'),
  ...Array(18).fill('uneven_surface'),
  ...Array(12).fill('obstacle'),
  ...Array(4).fill('missing_tactile_paving'),
  ...Array(4).fill('water_pooling'),
];

const STATUS_POOL: CompanyPin['status'][] = [
  ...Array(55).fill('verified'),
  ...Array(20).fill('partial'),
  ...Array(25).fill('new'),
];

const SEVERITY_POOL: Severity[] = [
  ...Array(20).fill('low'),
  ...Array(55).fill('medium'),
  ...Array(25).fill('high'),
];

// Deterministik LCG (her build aynı dağılımı versin — demo tekrarlanabilir)
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generatePins(): CompanyPin[] {
  const rng = makeRng(20260516);
  const pins: CompanyPin[] = [];

  CLUSTERS.forEach((cluster) => {
    for (let i = 0; i < cluster.count; i++) {
      // 0.0008 ≈ 90m enlem · 0.0015 ≈ 130m boylam Ankara'da
      const dLat = (rng() - 0.5) * 0.0028;
      const dLon = (rng() - 0.5) * 0.0036;
      const status = pick(rng, STATUS_POOL);
      const verification_count =
        status === 'verified' ? 3 + Math.floor(rng() * 5)
        : status === 'partial' ? 2
        : 1;

      pins.push({
        id: `${cluster.id}-${i}`,
        latitude: cluster.latitude + dLat,
        longitude: cluster.longitude + dLon,
        category: pick(rng, CATEGORY_POOL),
        severity: pick(rng, SEVERITY_POOL),
        verification_count,
        status,
      });
    }
  });

  return pins;
}

function generateHeat(): AppMapCircle[] {
  return CLUSTERS.map((cluster) => {
    // Yoğunluğa göre kırmızı→turuncu karışım
    const r = Math.round(230 * cluster.intensity + 244 * (1 - cluster.intensity));
    const g = Math.round(57  * cluster.intensity + 162 * (1 - cluster.intensity));
    const b = Math.round(70  * cluster.intensity + 97  * (1 - cluster.intensity));
    const alpha = 0.18 + cluster.intensity * 0.22;
    return {
      id: `heat-${cluster.id}`,
      latitude: cluster.latitude,
      longitude: cluster.longitude,
      radius: cluster.heatRadius,
      fillColor: `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`,
      strokeColor: `rgba(${r}, ${g}, ${b}, ${(alpha + 0.15).toFixed(2)})`,
      strokeWidth: 1,
    };
  });
}

export const COMPANY_PINS: CompanyPin[] = generatePins();
export const COMPANY_HEAT_CIRCLES: AppMapCircle[] = generateHeat();

// Türkçe etiketler — pin callout için
export const CATEGORY_LABEL_TR: Record<IssueType, string> = {
  pothole: 'Çukur',
  missing_ramp: 'Eksik rampa',
  missing_tactile_paving: 'Sarı dokunsal yüzey eksik',
  obstacle: 'Engel',
  uneven_surface: 'Yüzey hasarı',
  water_pooling: 'Su birikintisi',
  narrow_passage: 'Dar geçit',
  damaged_equipment: 'Hasarlı ekipman',
  other: 'Diğer',
};

export const SEVERITY_LABEL_TR: Record<Severity, string> = {
  low: 'düşük',
  medium: 'orta',
  high: 'yüksek',
};

export const STATUS_TO_HEX: Record<CompanyPin['status'], string> = {
  new: colors.status.new,
  partial: colors.status.partial,
  verified: colors.status.verified,
};
