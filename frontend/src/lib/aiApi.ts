const rawAiApiUrl = process.env.EXPO_PUBLIC_AI_API_URL?.trim() ?? '';

export const AI_API_URL = rawAiApiUrl.replace(/\/+$/, '');

export function hasAiApi(): boolean {
  return AI_API_URL.length > 0;
}

export function assertAiApi(): void {
  if (!hasAiApi()) {
    throw new Error('EXPO_PUBLIC_AI_API_URL tanımlı değil.');
  }
}
