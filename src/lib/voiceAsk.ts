import { AI_API_URL, assertAiApi } from './aiApi';
import { vlmSchemas, type VoiceAnswerResponse } from './vlm';

export type ScreenContext = 'buddy_mode' | 'sport_mode' | 'idle';

interface AskVoiceArgs {
  transcript: string;
  screenContext: ScreenContext;
  frameUri?: string | null;
  lat?: number | null;
  lon?: number | null;
}

export async function askVoice({
  transcript,
  screenContext,
  frameUri,
  lat,
  lon,
}: AskVoiceArgs): Promise<VoiceAnswerResponse> {
  assertAiApi();

  const form = new FormData();
  form.append('transcript', transcript);
  form.append('screen_context', screenContext);
  if (frameUri) {
    form.append('frame', {
      uri: frameUri,
      name: 'frame.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }
  if (lat != null) form.append('lat', String(lat));
  if (lon != null) form.append('lon', String(lon));

  const res = await fetch(`${AI_API_URL}/voice/ask`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`/voice/ask hata verdi (${res.status}): ${body.slice(0, 180)}`);
  }

  const data = await res.json();
  return vlmSchemas.voice.parse(data);
}
