const AUTH_MIGRATION_HINT =
  'Supabase SQL Editor에서 migration_052_member_auth_global.sql 적용 후 migration_060_drop_member_login_three_arg.sql 을 실행해 주세요. (이미 migration_043~054를 적용했다면 060만 실행하면 됩니다.)'

function authRpcSetupMessage(kind: 'admin' | 'member', detail: string): string {
  const target = kind === 'admin' ? '관리자' : '회원'
  return `데이터베이스 ${target} 로그인 RPC 오류입니다. ${AUTH_MIGRATION_HINT}\n\n상세: ${detail}`
}

function isAuthRpcSetupError(message: string, code?: string): boolean {
  if (code === 'PGRST202') return true
  if (message.includes('Could not find the function')) return true
  if (message.includes('Could not choose the best candidate function')) return true
  return false
}

export function formatSupabaseError(err: unknown): string {
  if (!err || typeof err !== 'object') return '알 수 없는 오류가 발생했습니다.'

  const e = err as { message?: string; code?: string; hint?: string; details?: string }
  const msg = e.message ?? ''
  const details = e.details ? `\n${e.details}` : ''

  if (
    e.code === '23505' ||
    msg.includes('duplicate key') ||
    msg.includes('members_center_phone_uidx')
  ) {
    return '이미 등록된 전화번호입니다.'
  }

  if (
    msg.includes('member_credentials') &&
    (msg.includes('center_id') || msg.includes('23502'))
  ) {
    return (
      '회원 로그인 정보 저장에 실패했습니다. ' +
      'Supabase SQL Editor에서 supabase/migration_079_fix_member_credentials_center_id.sql 을 실행해 주세요.'
    )
  }

  if (isAuthRpcSetupError(msg, e.code)) {
    const kind =
      msg.includes('verify_member_login') || msg.includes('member_credentials')
        ? 'member'
        : 'admin'
    return authRpcSetupMessage(kind, `${msg}${details}`)
  }

  if (msg.includes('SEASON_LEVEL_NOT_REACHED')) {
    return '아직 해당 레벨에 도달하지 않았습니다.'
  }
  if (msg.includes('SEASON_REWARD_ALREADY_CLAIMED')) {
    return '이미 수령한 보상입니다.'
  }

  if (msg.includes('INSUFFICIENT_ACORNS')) {
    return '도토리가 부족합니다. 운동으로 성장치를 쌓고 도토리를 모아보세요.'
  }

  if (
    msg.includes('user_growth_balances') ||
    msg.includes('growth_transactions') ||
    msg.includes('acorn_transactions') ||
    msg.includes('growth_reward_rules') ||
    msg.includes('growth_events') ||
    msg.includes('growth_achievements') ||
    msg.includes('growth_notifications') ||
    msg.includes('center_challenges') ||
    msg.includes('user_challenge_progress') ||
    msg.includes('sync_center_challenges_for_member') ||
    msg.includes('garden_shop_items') ||
    msg.includes('get_garden_state') ||
    msg.includes('purchase_garden_shop_item') ||
    msg.includes('seasons') ||
    msg.includes('season_rewards') ||
    msg.includes('get_season_pass_state') ||
    msg.includes('claim_season_reward') ||
    msg.includes('get_growth_profile') ||
    msg.includes('post_growth_event')
  ) {
    return (
      '성장 시스템 DB가 아직 설정되지 않았습니다. ' +
      'Supabase SQL Editor에서 supabase/migration_078_platform_growth_mvp.sql, ' +
      'migration_080_growth_reward_balance.sql, migration_081_growth_events_auto_earn.sql, ' +
      'migration_083_growth_achievements_notifications.sql, migration_084_center_challenges.sql, migration_085_garden_mvp.sql, migration_086_season_pass_mvp.sql 을 실행해 주세요.'
    )
  }

  if (
    msg.includes('class_schedules') ||
    msg.includes('class_reservations') ||
    msg.includes('class_attendance') ||
    msg.includes('facility_checkins') ||
    msg.includes('locker_assignments') ||
    msg.includes('towel_rentals') ||
    msg.includes('member_session_passes')
  ) {
    return (
      '클래스·시설 기능 DB가 아직 설정되지 않았습니다. ' +
      'Supabase SQL Editor에서 supabase/migration_069_motionhub_saas_expansion.sql 을 실행해 주세요.'
    )
  }

  if (msg.includes('trainers') && (msg.includes('column') || msg.includes('display_name'))) {
    return (
      '트레이너 정보 조회 오류입니다. 앱이 최신 버전으로 배포되었는지 확인해 주세요. ' +
      '계속되면 Supabase SQL Editor에서 supabase/migration_069_motionhub_saas_expansion.sql 적용 여부를 확인해 주세요.'
    )
  }

  if (
    msg.includes('trainers') ||
    msg.includes('trainer_id') ||
    msg.includes('period_extensions') ||
    (e.code === '42P01' && !msg.includes('class'))
  ) {
    return (
      '데이터베이스 설정이 완료되지 않았습니다. ' +
      'Supabase SQL Editor에서 supabase/fix_all.sql 파일을 실행해 주세요.'
    )
  }

  if (e.code === '42501') {
    return 'DB 접근 권한이 없습니다. fix_all.sql의 RLS 정책을 실행해 주세요.'
  }

  return (msg + details).trim() || '요청 처리 중 오류가 발생했습니다.'
}

/** catch 블록에서 사용자에게 보여줄 메시지 (Supabase·Error·기타 객체 통합) */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string' && msg.trim()) {
      return formatSupabaseError(err)
    }
  }
  const formatted = formatSupabaseError(err)
  if (formatted !== '알 수 없는 오류가 발생했습니다.') return formatted
  return '요청 처리 중 오류가 발생했습니다.'
}
