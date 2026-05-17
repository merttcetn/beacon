import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  AffectedUser,
  IssueType,
  Severity,
  Ticket,
  TicketSource,
  TicketStatus,
} from '@/types';

const TABLE = 'tickets';
const QUERY_KEY = ['tickets'] as const;

interface TicketRow {
  id: string;
  title: string | null;
  created_by: string;
  lat: number;
  lng: number;
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

function rowToTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    title: row.title ?? undefined,
    created_by: row.created_by,
    location: { latitude: row.lat, longitude: row.lng },
    issue_type: row.issue_type,
    severity: row.severity,
    affected_users: row.affected_users ?? [],
    description_tr: row.description_tr,
    photo_urls: row.photo_urls ?? [],
    confidence: row.confidence,
    source: row.source,
    verification_count: row.verification_count,
    verified: row.verified,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function ticketToRow(t: Ticket): TicketRow {
  return {
    id: t.id,
    title: t.title ?? null,
    created_by: t.created_by,
    lat: t.location.latitude,
    lng: t.location.longitude,
    issue_type: t.issue_type,
    severity: t.severity,
    affected_users: t.affected_users,
    description_tr: t.description_tr,
    photo_urls: t.photo_urls,
    confidence: t.confidence,
    source: t.source,
    verification_count: t.verification_count,
    verified: t.verified,
    status: t.status,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

export async function fetchTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as TicketRow[]).map(rowToTicket);
}

export async function insertTicket(ticket: Ticket): Promise<Ticket> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(ticketToRow(ticket))
    .select('*')
    .single();
  if (error) throw error;
  return rowToTicket(data as TicketRow);
}

export function useTickets() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchTickets,
  });
}

export function useAddTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: insertTicket,
    onSuccess: (created) => {
      qc.setQueryData<Ticket[]>(QUERY_KEY, (prev) =>
        prev ? [created, ...prev.filter((t) => t.id !== created.id)] : [created],
      );
    },
  });
}
