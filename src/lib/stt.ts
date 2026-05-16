import Constants from 'expo-constants';
import { File } from 'expo-file-system';

const FAL_WIZPER_ENDPOINT = 'https://fal.run/fal-ai/wizper';

export const VAD_CONFIG = {
  SPEECH_THRESHOLD_DB: -35,
  SPEECH_START_MS: 200,
  SILENCE_END_MS: 1200,
  MAX_UTTERANCE_MS: 5000,
  POLL_INTERVAL_MS: 100,
} as const;

interface WizperResponse {
  text?: string;
  chunks?: { text: string }[];
}

function getFalKey() {
  const extra = Constants.expoConfig?.extra as { FAL_KEY?: string } | undefined;
  return extra?.FAL_KEY ?? '';
}

function inferMimeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.m4a') || lower.endsWith('.aac')) return 'audio/mp4';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.3gp')) return 'audio/3gpp';
  return 'audio/mp4';
}

export async function transcribeAudio(uri: string): Promise<string> {
  const falKey = getFalKey();
  if (!falKey) {
    throw new Error('FAL_KEY tanımlı değil.');
  }

  const file = new File(uri);
  const base64 = await file.base64();
  const mime = inferMimeFromUri(uri);
  const dataUrl = `data:${mime};base64,${base64}`;

  const response = await fetch(FAL_WIZPER_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: dataUrl,
      language: 'tr',
      task: 'transcribe',
      chunk_level: 'segment',
      version: '3',
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Wizper hata verdi (${response.status}): ${body.slice(0, 180)}`);
  }

  const data = (await response.json()) as WizperResponse;
  const text = data.text ?? data.chunks?.map((c) => c.text).join(' ') ?? '';
  return text.trim();
}
