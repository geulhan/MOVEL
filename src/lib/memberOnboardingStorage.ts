const FLOW_PREFIX = 'mh_member_flow:'
const LEGACY_SEEN_PREFIX = 'mh_member_onboarding_seen:'

export type MemberFlowState = {
  stepIndex: number
  complete: boolean
  dismissed: boolean
}

function storageKey(memberId: string): string {
  return `${FLOW_PREFIX}${memberId}`
}

function readLegacyComplete(memberId: string): boolean {
  try {
    return localStorage.getItem(`${LEGACY_SEEN_PREFIX}${memberId}`) === '1'
  } catch {
    return false
  }
}

export function getMemberFlowState(memberId: string): MemberFlowState {
  if (readLegacyComplete(memberId)) {
    return { stepIndex: 4, complete: true, dismissed: false }
  }

  try {
    const raw = localStorage.getItem(storageKey(memberId))
    if (!raw) {
      return { stepIndex: 0, complete: false, dismissed: false }
    }
    const parsed = JSON.parse(raw) as Partial<MemberFlowState>
    return {
      stepIndex: typeof parsed.stepIndex === 'number' ? parsed.stepIndex : 0,
      complete: Boolean(parsed.complete),
      dismissed: Boolean(parsed.dismissed),
    }
  } catch {
    return { stepIndex: 0, complete: false, dismissed: false }
  }
}

function writeMemberFlowState(memberId: string, state: MemberFlowState): void {
  try {
    localStorage.setItem(storageKey(memberId), JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function isMemberFlowActive(memberId: string): boolean {
  const state = getMemberFlowState(memberId)
  return !state.complete && !state.dismissed
}

export function ensureMemberFlowStarted(memberId: string): MemberFlowState {
  const state = getMemberFlowState(memberId)
  if (state.complete || state.dismissed) return state
  return state
}

export function advanceMemberFlow(memberId: string): MemberFlowState {
  const state = getMemberFlowState(memberId)
  if (state.complete || state.dismissed) return state

  const nextIndex = state.stepIndex + 1
  const complete = nextIndex >= 4
  const next: MemberFlowState = {
    stepIndex: complete ? 4 : nextIndex,
    complete,
    dismissed: false,
  }
  writeMemberFlowState(memberId, next)
  return next
}

export function completeMemberFlow(memberId: string): void {
  writeMemberFlowState(memberId, {
    stepIndex: 4,
    complete: true,
    dismissed: false,
  })
}

export function dismissMemberFlow(memberId: string): void {
  const state = getMemberFlowState(memberId)
  writeMemberFlowState(memberId, { ...state, dismissed: true })
}
