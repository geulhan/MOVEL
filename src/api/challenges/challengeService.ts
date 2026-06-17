import { supabase } from '../../lib/supabase'

/**
 * 회원 챌린지 진행도를 서버에서 재계산합니다.
 * get_growth_profile 호출 시에도 자동 동기화되며, 성장 이벤트 직후에는 post_growth_event가 처리합니다.
 */
export async function syncMemberChallenges(
  memberId: string,
): Promise<{ completed: Array<{ challenge_id: string; title: string }> }> {
  const { data, error } = await supabase.rpc('sync_center_challenges_for_member', {
    p_member_id: memberId,
  })

  if (error) {
    // migration 미적용 시 조용히 무시
    console.warn('챌린지 동기화 실패:', error.message)
    return { completed: [] }
  }

  const raw = data as { ok?: boolean; completed?: unknown } | null
  const completed = Array.isArray(raw?.completed)
    ? raw.completed.map((item) => {
        const row = item as Record<string, unknown>
        return {
          challenge_id: String(row.challenge_id ?? ''),
          title: String(row.title ?? ''),
        }
      })
    : []

  return { completed }
}
