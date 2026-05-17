import { AI_API_URL, assertAiApi } from './aiApi';
import { vlmSchemas, type FeedbackResponse } from './vlm';

export async function categorizeFeedback(
  photoUris: string[],
): Promise<FeedbackResponse> {
  assertAiApi();

  if (photoUris.length === 0) {
    throw new Error('categorizeFeedback: en az bir fotoğraf gerekli');
  }

  const form = new FormData();
  photoUris.forEach((uri, idx) => {
    form.append('photos', {
      uri,
      name: `photo-${idx + 1}.jpg`,
      type: 'image/jpeg',
    } as unknown as Blob);
  });

  const res = await fetch(`${AI_API_URL}/v1/feedback`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `/v1/feedback hata verdi (${res.status}): ${body.slice(0, 180)}`,
    );
  }

  return vlmSchemas.feedback.parse(await res.json());
}
