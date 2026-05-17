import { AI_API_URL, assertAiApi } from './aiApi';

export const VAD_CONFIG = {
  SPEECH_THRESHOLD_DB: -35,
  SPEECH_START_MS: 200,
  SILENCE_END_MS: 1200,
  MAX_UTTERANCE_MS: 5000,
  POLL_INTERVAL_MS: 100,
} as const;

interface SttResponse {
  transcript?: string;
  ok?: boolean;
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

function inferNameFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.m4a') || lower.endsWith('.aac')) return 'speech.m4a';
  if (lower.endsWith('.wav')) return 'speech.wav';
  if (lower.endsWith('.mp3')) return 'speech.mp3';
  if (lower.endsWith('.webm')) return 'speech.webm';
  if (lower.endsWith('.3gp')) return 'speech.3gp';
  return 'speech.m4a';
}

export async function transcribeAudio(uri: string): Promise<string> {
  assertAiApi();

  const form = new FormData();
  form.append('audio', {
    uri,
    name: inferNameFromUri(uri),
    type: inferMimeFromUri(uri),
  } as unknown as Blob);

  const response = await fetch(`${AI_API_URL}/stt`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`/stt hata verdi (${response.status}): ${body.slice(0, 180)}`);
  }

  const data = (await response.json()) as SttResponse;
  if (!data.ok) return '';
  return (data.transcript ?? '').trim();
}
