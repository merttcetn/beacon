export type UserRole = 'visually_impaired' | 'volunteer' | 'company';

export type IssueType =
  | 'pothole'
  | 'missing_ramp'
  | 'missing_tactile_paving'
  | 'obstacle'
  | 'uneven_surface'
  | 'water_pooling'
  | 'narrow_passage'
  | 'damaged_equipment'
  | 'other';

export type Severity = 'low' | 'medium' | 'high';

export type AffectedUser = 'wheelchair' | 'visually_impaired' | 'stroller' | 'elderly';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';

export type TicketSource =
  | 'user_volunteer'
  | 'user_visually_impaired'
  | 'mapillary_seed'
  | 'osm_seed'
  | 'ibb_open_data';

export type VerificationType = 'confirmed' | 'denied' | 'unknown';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  display_name: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  created_by: string;
  location: { latitude: number; longitude: number };
  issue_type: IssueType;
  severity: Severity;
  affected_users: AffectedUser[];
  description_tr: string;
  photo_urls: string[];
  confidence: number;
  source: TicketSource;
  verification_count: number;
  verified: boolean;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
}

export interface Verification {
  id: string;
  ticket_id: string;
  user_id: string;
  verification_type: VerificationType;
  created_at: string;
}

export interface ConversationTurn {
  id: string;
  user_id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content_text: string;
  location: { latitude: number; longitude: number } | null;
  created_at: string;
}

export interface DataRequest {
  id: string;
  company_user_id: string;
  filter_criteria: Record<string, unknown>;
  ticket_ids: string[];
  status: 'pending' | 'fulfilled' | 'rejected';
  contact_email: string;
  created_at: string;
}
