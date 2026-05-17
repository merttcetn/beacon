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

const IssueTypeSchema = z.enum([
  'pothole',
  'missing_ramp',
  'missing_tactile_paving',
  'obstacle',
  'uneven_surface',
  'water_pooling',
  'narrow_passage',
  'damaged_equipment',
  'other',
]);

const SeveritySchema = z.enum(['low', 'medium', 'high']);
const AffectedUserSchema = z.enum([
  'wheelchair',
  'visually_impaired',
  'stroller',
  'elderly',
]);

const TicketSchema = z.object({
  issue_type: IssueTypeSchema,
  severity: SeveritySchema,
  affected_users: z.array(AffectedUserSchema),
  description_tr: z.string(),
  confidence: z.number().min(0).max(1),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  source: z.string(),
});

const AssistResponseSchema = z.object({
  event: z.string(),
  intent: z.string(),
  speak_text: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  ui_action: z.enum(['none', 'open_ticket', 'switch_to_buddy', 'switch_to_sport']),
  ticket: TicketSchema.nullable().optional(),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type BuddyModeResponse = z.infer<typeof BuddyModeSchema>;
export type FeedbackResponse = z.infer<typeof FeedbackSchema>;
export type SportResponse = z.infer<typeof SportSchema>;
export type VoiceAnswerResponse = z.infer<typeof VoiceAnswerSchema>;
export type AssistResponse = z.infer<typeof AssistResponseSchema>;
export type AssistTicket = z.infer<typeof TicketSchema>;

export const vlmSchemas = {
  buddy: BuddyModeSchema,
  feedback: FeedbackSchema,
  sport: SportSchema,
  voice: VoiceAnswerSchema,
  assist: AssistResponseSchema,
};
