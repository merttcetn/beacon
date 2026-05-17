import { AI_API_URL, assertAiApi } from './aiApi';
import { vlmSchemas, type BuddyModeResponse } from './vlm';

interface AnalyzeArgs {
  uri: string;
  lat?: number | null;
  lon?: number | null;
}

export async function analyzeBuddyFrame({
  uri,
  lat,
  lon,
}: AnalyzeArgs): Promise<BuddyModeResponse> {
  assertAiApi();

  const form = new FormData();
  form.append('frame', {
    uri,
    name: 'frame.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  if (lat != null) form.append('lat', String(lat));
  if (lon != null) form.append('lon', String(lon));

  const res = await fetch(`${AI_API_URL}/buddy/analyze`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `/buddy/analyze hata verdi (${res.status}): ${body.slice(0, 180)}`,
    );
  }

  const data = await res.json();
  return vlmSchemas.buddy.parse(data);
}
