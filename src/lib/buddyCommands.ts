import type { WalkDuration } from '@/constants/buddyScripts';

export type BuddySceneKind =
  | 'mode_select'
  | 'walk_duration'
  | 'walk_active'
  | 'sport_navigating'
  | 'sport_equipment'
  | 'sport_done';

export type BuddyCommand =
  | { kind: 'select_sport' }
  | { kind: 'select_walk' }
  | { kind: 'walk_duration'; minutes: WalkDuration }
  | { kind: 'next_equipment' }
  | { kind: 'stop' };

function normalizeTr(input: string): string {
  return input
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface KeywordRow {
  match: readonly string[];
  cmd: BuddyCommand;
}

const KEYWORDS: Record<BuddySceneKind, readonly KeywordRow[]> = {
  mode_select: [
    { match: ['spor', 'sport', 'egzersiz', 'antrenman', 'birinci', 'bir'], cmd: { kind: 'select_sport' } },
    { match: ['yuruyus', 'yurumek', 'yuru', 'yuruyelim', 'walk', 'ikinci', 'iki'], cmd: { kind: 'select_walk' } },
  ],
  walk_duration: [
    { match: ['otuz', '30', 'thirty'], cmd: { kind: 'walk_duration', minutes: 30 } },
    { match: ['yirmi', '20', 'twenty'], cmd: { kind: 'walk_duration', minutes: 20 } },
    { match: ['on', '10', 'ten'], cmd: { kind: 'walk_duration', minutes: 10 } },
  ],
  walk_active: [
    { match: ['dur', 'durdur', 'bitir', 'bitti', 'stop', 'yeter', 'tamam', 'iptal'], cmd: { kind: 'stop' } },
  ],
  sport_navigating: [],
  sport_equipment: [
    { match: ['siradaki', 'sonraki', 'devam', 'next', 'tamam', 'bitti', 'gecti', 'oldu', 'hadi'], cmd: { kind: 'next_equipment' } },
  ],
  sport_done: [],
};

export function parseCommand(transcript: string, sceneKind: BuddySceneKind): BuddyCommand | null {
  const norm = normalizeTr(transcript);
  if (!norm) return null;
  const padded = ` ${norm} `;
  const table = KEYWORDS[sceneKind];
  for (const row of table) {
    for (const kw of row.match) {
      if (padded.includes(` ${kw} `)) return row.cmd;
    }
  }
  return null;
}

export function defaultCommandFor(sceneKind: BuddySceneKind): BuddyCommand | null {
  if (sceneKind === 'mode_select') return { kind: 'select_sport' };
  if (sceneKind === 'walk_duration') return { kind: 'walk_duration', minutes: 20 };
  if (sceneKind === 'sport_equipment') return { kind: 'next_equipment' };
  return null;
}
