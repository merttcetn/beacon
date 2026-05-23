import { z } from 'zod';
import type { FeedbackResponse } from '@/lib/vlm';
import type { UserRole } from '@/types';

const N8N_BASE = process.env.EXPO_PUBLIC_N8N_BASE;
const WEBHOOK_PATH = '/webhook/ticket-report';
const TIMEOUT_MS = 15000;

export interface TicketReportPayload {
  transcript: string;
  categorization: FeedbackResponse;
  location: { lat: number; lon: number };
  timestamp: string;
  user: { role: UserRole };
}

const TicketReportResponseSchema = z.object({
  success: z.boolean(),
  ticket_id: z.string(),
  sent_count: z.number(),
  sent_to: z.array(
    z.object({
      authority_name: z.string(),
      email: z.string(),
      tier: z.enum(['TO', 'CC']),
    }),
  ),
  timestamp_processed: z.string(),
});

export type TicketReportResponse = z.infer<typeof TicketReportResponseSchema>;

export class N8nSubmitError extends Error {
  constructor(
    message: string,
    public readonly kind: 'config' | 'network' | 'timeout' | 'http' | 'shape',
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'N8nSubmitError';
  }
}

export async function submitTicketReport(
  payload: TicketReportPayload,
): Promise<TicketReportResponse> {
  if (!N8N_BASE) {
    throw new N8nSubmitError(
      'EXPO_PUBLIC_N8N_BASE tanımlı değil — .env dosyasını kontrol et',
      'config',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${N8N_BASE}${WEBHOOK_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new N8nSubmitError('İstek zaman aşımına uğradı', 'timeout', err);
    }
    throw new N8nSubmitError('Webhook erişilemiyor — tunnel açık mı?', 'network', err);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new N8nSubmitError(`Webhook HTTP ${res.status}`, 'http');
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch (err) {
    throw new N8nSubmitError('Webhook geçerli JSON döndürmedi', 'shape', err);
  }

  const parsed = TicketReportResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new N8nSubmitError('Webhook yanıt şeması beklenenden farklı', 'shape', parsed.error);
  }

  return parsed.data;
}
