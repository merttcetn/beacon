import { AI_API_URL, assertAiApi } from './aiApi';
import { vlmSchemas, type AssistResponse } from './vlm';

export type ScreenContext = 'buddy_mode' | 'sport_mode' | 'idle';
export type AssistEvent = 'voice' | 'buddy_frame';

function inferAudioMime(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.m4a') || lower.endsWith('.aac')) return 'audio/mp4';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.3gp')) return 'audio/3gpp';
  return 'audio/mp4';
}

function inferAudioName(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.m4a') || lower.endsWith('.aac')) return 'speech.m4a';
  if (lower.endsWith('.wav')) return 'speech.wav';
  if (lower.endsWith('.mp3')) return 'speech.mp3';
  if (lower.endsWith('.webm')) return 'speech.webm';
  if (lower.endsWith('.3gp')) return 'speech.3gp';
  return 'speech.m4a';
}

export interface NearbyTicket {
  issue_type: string;
  severity: 'low' | 'medium' | 'high';
  description_tr: string;
  distance_m?: number | null;
}

interface AssistArgs {
  event: AssistEvent;
  transcript?: string | null;
  audioUri?: string | null;
  audioMime?: string | null;
  audioName?: string | null;
  frameUri?: string | null;
  screenContext?: ScreenContext;
  lat?: number | null;
  lon?: number | null;
  recentGuidance?: string | null;
  nearbyTickets?: NearbyTicket[] | null;
}

export async function assist(args: AssistArgs): Promise<AssistResponse> {
  assertAiApi();

  const form = new FormData();
  form.append('event', args.event);

  if (args.transcript && args.transcript.trim().length > 0) {
    form.append('transcript', args.transcript);
  } else if (args.audioUri) {
    form.append('audio', {
      uri: args.audioUri,
      name: args.audioName ?? inferAudioName(args.audioUri),
      type: args.audioMime ?? inferAudioMime(args.audioUri),
    } as unknown as Blob);
  }

  if (args.frameUri) {
    form.append('frame', {
      uri: args.frameUri,
      name: 'frame.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }

  form.append('screen_context', args.screenContext ?? 'idle');

  if (args.lat != null) form.append('lat', String(args.lat));
  if (args.lon != null) form.append('lon', String(args.lon));

  if (args.recentGuidance && args.recentGuidance.trim().length > 0) {
    form.append('recent_guidance', args.recentGuidance);
  }

  if (args.nearbyTickets && args.nearbyTickets.length > 0) {
    form.append('nearby_tickets', JSON.stringify(args.nearbyTickets));
  }

  const res = await fetch(`${AI_API_URL}/v1/assist`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`/v1/assist hata verdi (${res.status}): ${body.slice(0, 180)}`);
  }

  return vlmSchemas.assist.parse(await res.json());
}
