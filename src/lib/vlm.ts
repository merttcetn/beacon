import { z } from 'zod';

const BuddyModeSchema = z.object({
  immediate_warnings: z.array(z.string()),
  upcoming_known_issues: z.array(z.string()),
  speak_text: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

const FeedbackSchema = z.object({
  has_damage: z.boolean(),
  issues: z.array(
    z.object({
      type: z.enum([
        'pothole',
        'missing_ramp',
        'missing_tactile_paving',
        'obstacle',
        'uneven_surface',
        'water_pooling',
        'narrow_passage',
        'damaged_equipment',
        'other',
      ]),
      severity: z.enum(['low', 'medium', 'high']),
      affected_users: z.array(
        z.enum(['wheelchair', 'visually_impaired', 'stroller', 'elderly']),
      ),
      description_tr: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  overall_accessibility_score: z.number().min(1).max(10),
});

const SportSchema = z.object({
  equipment_detected: z.boolean(),
  equipment_name_tr: z.string(),
  muscle_groups: z.array(z.string()),
  usage_steps_tr: z.array(z.string()),
  safety_warnings_tr: z.array(z.string()),
  speak_text: z.string(),
});

const VoiceAnswerSchema = z.object({
  interpreted_question: z.string(),
  answer_speak_text: z.string(),
  requires_camera: z.boolean(),
  requires_action: z.enum(['none', 'switch_to_buddy', 'switch_to_sport']),
  confidence: z.number().min(0).max(1),
});

export type BuddyModeResponse = z.infer<typeof BuddyModeSchema>;
export type FeedbackResponse = z.infer<typeof FeedbackSchema>;
export type SportResponse = z.infer<typeof SportSchema>;
export type VoiceAnswerResponse = z.infer<typeof VoiceAnswerSchema>;

export const vlmSchemas = {
  buddy: BuddyModeSchema,
  feedback: FeedbackSchema,
  sport: SportSchema,
  voice: VoiceAnswerSchema,
};

// TODO: VLM çağrı endpoint'i hackathon başında karar verilecek
// (client → VLM | Supabase Edge Function | custom backend).
// Spec §12 açık soru #1.
export async function callVlm<T>(
  _mode: 'buddy' | 'feedback' | 'sport',
  _payload: unknown,
): Promise<T> {
  throw new Error('VLM endpoint henüz bağlanmadı — src/lib/vlm.ts');
}
