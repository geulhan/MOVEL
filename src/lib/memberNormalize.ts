import type { Member, MemberStatus } from '../types/database'

/** Supabase members Row → 앱 Member 타입 */
export function normalizeMember(row: Record<string, unknown>): Member {
  return {
    id: String(row.id),
    center_id: row.center_id ? String(row.center_id) : undefined,
    name: String(row.name),
    phone: String(row.phone),
    total_sessions: Number(row.total_sessions),
    remaining_sessions: Number(row.remaining_sessions),
    payment_amount: Number(row.payment_amount),
    registered_at: String(row.registered_at ?? row.created_at).slice(0, 10),
    expires_at: row.expires_at ? String(row.expires_at).slice(0, 10) : null,
    trainer_id: row.trainer_id ? String(row.trainer_id) : null,
    trainer_name: row.trainer_name ? String(row.trainer_name) : null,
    referred_by_member_id: row.referred_by_member_id
      ? String(row.referred_by_member_id)
      : null,
    status: (row.status as MemberStatus) ?? 'active',
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}
