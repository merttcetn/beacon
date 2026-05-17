import { AI_API_URL, assertAiApi } from './aiApi';
import { vlmSchemas, type BuddyModeResponse } from './vlm';

interface AnalyzeBuddyFrameArgs {
  frameUri: string;
  lat?: number | null;
  lon?: number | null;
  recentGuidance?: string | null;
  signal?: AbortSignal;
}

export async function analyzeBuddyFrame(
  args: AnalyzeBuddyFrameArgs,
): Promise<BuddyModeResponse> {
  assertAiApi();

  const form = new FormData();
  form.append('frame', {
    uri: args.frameUri,
    name: 'frame.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  if (args.lat != null) form.append('lat', String(args.lat));
  if (args.lon != null) form.append('lon', String(args.lon));

  if (args.recentGuidance && args.recentGuidance.trim().length > 0) {
    form.append('recent_guidance', args.recentGuidance);
  }

  const res = await fetch(`${AI_API_URL}/v1/buddy`, {
    method: 'POST',
    body: form,
    signal: args.signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`/v1/buddy hata verdi (${res.status}): ${body.slice(0, 180)}`);
  }

  return vlmSchemas.buddy.parse(await res.json());
}
