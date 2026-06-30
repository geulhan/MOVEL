import { formatCurrency } from '../../api/members'
import type {
  AssistantMemberInsight,
  MotionHubAssistantAnswer,
  MotionHubAssistantContext,
} from '../../types/motionHubAiAssistant'

export type AssistantIntent =
  | 'net_profit'
  | 'renewal_increase'
  | 'at_risk_members'
  | 'trainer_performance'
  | 'marketing_direction'
  | 'unknown'

export function detectAssistantIntent(question: string): AssistantIntent {
  const q = question.trim().toLowerCase()

  if (/순이익|적자|마이너스|손실|왜.*부족/.test(q)) return 'net_profit'
  if (/재등록|리뉴얼|연장/.test(q) && !/마케팅|홍보|유입/.test(q)) return 'renewal_increase'
  if (/위험|이탈|환불.*가능|빠질|끊을/.test(q)) return 'at_risk_members'
  if (/트레이너|강사|성과|누가.*잘|매출.*높/.test(q)) return 'trainer_performance'
  if (/마케팅|홍보|유입|광고|프로모션|체험|소개|방향.*잡|신규.*늘리/.test(q)) {
    return 'marketing_direction'
  }

  return 'unknown'
}

function daysSince(dateYmd: string | null): number | null {
  if (!dateYmd) return null
  const ms = Date.now() - new Date(`${dateYmd}T12:00:00`).getTime()
  return Math.floor(ms / 86_400_000)
}

function riskScore(member: AssistantMemberInsight): number {
  let score = 0
  if (member.isRenewalTarget) score += 30
  if (member.remainingSessions <= 1) score += 25
  if (member.status === 'dormant') score += 20
  const sinceAttendance = daysSince(member.lastAttendanceAt)
  if (sinceAttendance == null) score += 25
  else if (sinceAttendance > 21) score += 20
  else if (sinceAttendance > 14) score += 10
  if (member.attendanceRateThisMonth != null && member.attendanceRateThisMonth < 60) {
    score += 15
  }
  if (member.noShowThisMonth >= 2) score += 15
  if (member.estimatedRefundRisk >= 500_000) score += 10
  return score
}

function answerNetProfit(ctx: MotionHubAssistantContext): MotionHubAssistantAnswer {
  const s = ctx.snapshot
  const fc = ctx.settings.fixedCosts
  const insufficient: string[] = []

  if (s.totalRecognized === 0) {
    insufficient.push('이번 달 인식매출 데이터가 없습니다.')
  }

  const sections = [
    {
      title: '순이익 계산',
      lines: [
        `인식매출 ${formatCurrency(s.totalRecognized)}`,
        `− 트레이너 인건비 ${formatCurrency(s.trainerPayroll)}`,
        `− 대표 인건비 ${formatCurrency(s.ownerPayroll)}`,
        `− 고정비 ${formatCurrency(s.fixedCostsTotal)}`,
        `− 세금 충당 ${formatCurrency(s.taxReserve)}`,
        `− 시설 충당 ${formatCurrency(s.facilityReserve)}`,
        `= 순이익 ${formatCurrency(s.netProfit)}`,
      ],
    },
    {
      title: '비용 분석',
      lines: [
        `인건비 합계 ${formatCurrency(s.trainerPayroll + s.ownerPayroll)} (인식매출의 ${s.totalRecognized > 0 ? Math.round(((s.trainerPayroll + s.ownerPayroll) / s.totalRecognized) * 100) : 0}%)`,
        `고정비 상세 — 임대 ${formatCurrency(fc.rent)} · 관리 ${formatCurrency(fc.maintenance)} · 카드수수료 ${formatCurrency(fc.cardFee)} · 통신 ${formatCurrency(fc.telecom)} · 기타 ${formatCurrency(fc.other)}`,
        `환불 가능 추정 ${formatCurrency(s.totalRefundRisk)} (PT ${formatCurrency(s.ptRefundRisk)} · 회원권 ${formatCurrency(s.centerPassRefundRisk)})`,
      ],
    },
  ]

  const causes: string[] = []
  if (s.netProfit >= 0) {
    causes.push('현재 데이터상 순이익은 플러스입니다. 마이너스가 아닙니다.')
  } else {
    if (s.trainerPayroll + s.ownerPayroll > s.totalRecognized * 0.55) {
      causes.push(
        `인건비 비중이 높습니다 (${formatCurrency(s.trainerPayroll + s.ownerPayroll)}). 인식매출 대비 정산율 점검이 필요합니다.`,
      )
    }
    if (s.fixedCostsTotal > s.totalRecognized * 0.35) {
      causes.push(
        `고정비 ${formatCurrency(s.fixedCostsTotal)}가 인식매출의 ${s.fixedCostRatioPercent}%로 부담이 큽니다.`,
      )
    }
    if (s.totalRecognized < s.cashRevenue * 0.5 && s.cashRevenue > 0) {
      causes.push(
        `결제액 ${formatCurrency(s.cashRevenue)} 대비 인식매출 ${formatCurrency(s.totalRecognized)}이 낮아, 선수금은 있으나 이번 달 인식 수익이 적습니다.`,
      )
    }
    if (causes.length === 0) {
      causes.push(
        '인식매출 대비 인건비·고정비·충당금 합이 매출을 초과했습니다. 경영 설정에서 비용 항목을 확인하세요.',
      )
    }
  }

  sections.push({ title: '원인 설명', lines: causes })

  return {
    intent: 'net_profit',
    headline: s.netProfit < 0 ? '순이익이 마이너스인 이유' : '순이익 분석',
    sections,
    evidenceNote: `${ctx.periodLabel} MotionHub 경영 데이터 기준`,
    insufficientData: insufficient.length > 0 ? insufficient : undefined,
  }
}

function answerRenewalIncrease(ctx: MotionHubAssistantContext): MotionHubAssistantAnswer {
  const targets = ctx.members
    .filter((m) => m.isRenewalTarget && m.status !== 'terminated')
    .sort((a, b) => {
      if (a.remainingSessions !== b.remainingSessions) {
        return a.remainingSessions - b.remainingSessions
      }
      const aDays = daysSince(a.lastAttendanceAt) ?? 999
      const bDays = daysSince(b.lastAttendanceAt) ?? 999
      return bDays - aDays
    })

  const priority = targets.slice(0, 8)

  const lines =
    priority.length === 0
      ? ['재등록 대상(잔여 5회 이하) 회원이 없습니다.']
      : priority.map((m, i) => {
          const attendance =
            m.lastAttendanceAt
              ? `최근 출석 ${m.lastAttendanceAt}`
              : '최근 출석 기록 없음'
          const payment =
            m.lastPaymentAt
              ? `마지막 결제 ${m.lastPaymentAt} (${formatCurrency(m.lastPaymentAmount ?? 0)})`
              : '결제 기록 없음'
          return `${i + 1}. ${m.name} — 잔여 ${m.remainingSessions}회 · ${attendance} · ${payment}${m.trainerName ? ` · 담당 ${m.trainerName}` : ''}`
        })

  return {
    intent: 'renewal_increase',
    headline: '재등록을 늘리려면',
    sections: [
      {
        title: '재등록 대상',
        lines: [
          `잔여 5회 이하 회원 ${targets.length}명`,
          `이번 달 재등록 결제 ${ctx.snapshot.cashRevenueRenewalMemberCount}명 · ${formatCurrency(ctx.snapshot.cashRevenueRenewal)}`,
          `재등록률 ${ctx.snapshot.monthlyReport.at(-1)?.renewalRate ?? 100}%`,
        ],
      },
      {
        title: '우선 연락해야 할 회원',
        lines,
      },
      {
        title: '실행 제안',
        lines: [
          '잔여 3회 이하 + 14일 이상 미출석 회원부터 1:1 상담',
          '경영관리 → 메시지 발송에서 재등록 알림톡 발송',
          '만료 30일 전 패키지 제안',
        ],
      },
    ],
    evidenceNote: '회원 잔여횟수·출석·결제 이력 기준',
    insufficientData:
      targets.length === 0
        ? ['재등록 대상 회원 데이터가 없습니다. 회원 등록·PT 횟수를 확인하세요.']
        : undefined,
  }
}

function answerAtRiskMembers(ctx: MotionHubAssistantContext): MotionHubAssistantAnswer {
  const ranked = ctx.members
    .map((m) => ({ member: m, score: riskScore(m) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  const lines =
    ranked.length === 0
      ? ['위험 신호가 있는 회원이 없습니다.']
      : ranked.map(({ member: m, score }, i) => {
          const absence =
            m.attendanceRateThisMonth != null
              ? `이번 달 출석률 ${m.attendanceRateThisMonth}% (노쇼 ${m.noShowThisMonth}회)`
              : '이번 달 예약 없음'
          return `${i + 1}. ${m.name} (위험점수 ${score}) — 잔여 ${m.remainingSessions}회 · ${absence} · 환불 추정 ${formatCurrency(m.estimatedRefundRisk)}`
        })

  return {
    intent: 'at_risk_members',
    headline: '이번 달 가장 위험한 회원',
    sections: [
      {
        title: '위험 회원 목록',
        lines,
      },
      {
        title: '판단 근거',
        lines: [
          '잔여 횟수 5회 이하(재등록 대상)',
          '14일 이상 미출석 또는 출석 기록 없음',
          '이번 달 노쇼·낮은 출석률',
          '잔여 회차 기준 환불 추정 금액',
        ],
      },
    ],
    evidenceNote: `${ctx.periodLabel} 출석·잔여회차·환불 추정 기준. 환불 가능 여부는 계약 조건에 따라 다릅니다.`,
  }
}

function answerTrainerPerformance(ctx: MotionHubAssistantContext): MotionHubAssistantAnswer {
  const trainers = ctx.trainerInsights.filter((t) => t.memberCount > 0)

  if (trainers.length === 0) {
    return {
      intent: 'trainer_performance',
      headline: '트레이너 성과 비교',
      sections: [
        {
          title: '데이터 부족',
          lines: ['담당 회원이 배정된 활성 트레이너가 없습니다.'],
        },
      ],
      insufficientData: ['강사 관리에서 트레이너를 등록하고 회원에게 담당을 배정하세요.'],
    }
  }

  const best = trainers[0]
  const comparison = trainers.map((t, i) => {
    const renewal =
      t.renewalRate != null ? `재등록률 ${t.renewalRate}%` : '재등록 대상 없음'
    const attendance =
      t.attendanceRate != null ? `출석률 ${t.attendanceRate}%` : '예약 없음'
    return `${i + 1}. ${t.trainerName} — PT 인식매출 ${formatCurrency(t.ptRecognizedRevenue)} · 이번 달 결제 ${formatCurrency(t.cashRevenueThisMonth)} · 담당 ${t.memberCount}명 · 신규 ${t.newMembersThisMonth}명 · ${renewal} · ${attendance}`
  })

  return {
    intent: 'trainer_performance',
    headline: '트레이너 성과 비교',
    sections: [
      {
        title: '가장 성과가 좋은 트레이너',
        lines: [
          `${best.trainerName}`,
          `PT 인식매출 ${formatCurrency(best.ptRecognizedRevenue)} (이번 달 1위)`,
          `담당 회원 ${best.memberCount}명 · 신규 등록 ${best.newMembersThisMonth}명`,
          best.attendanceRate != null
            ? `출석률 ${best.attendanceRate}% (${best.completedSessions}/${best.scheduledSessions}회)`
            : '이번 달 PT 예약 없음',
          best.renewalRate != null
            ? `재등록률 ${best.renewalRate}% (재등록 대상 ${best.renewalTargetCount}명 중 활성 ${best.activeRenewalTargets}명)`
            : '재등록 대상 없음',
        ],
      },
      {
        title: '전체 비교',
        lines: comparison,
      },
    ],
    evidenceNote: `${ctx.periodLabel} PT 인식매출·결제·출석·재등록 대상 데이터 기준`,
  }
}

function answerMarketingDirection(ctx: MotionHubAssistantContext): MotionHubAssistantAnswer {
  const s = ctx.snapshot
  const op = s.operational
  const prior = s.priorOperational
  const renewalShare =
    s.cashRevenue > 0 ? Math.round((s.cashRevenueRenewal / s.cashRevenue) * 100) : 0
  const newShare = s.cashRevenue > 0 ? 100 - renewalShare : 0
  const renewalTargets = ctx.members.filter((m) => m.isRenewalTarget).length
  const dormant = ctx.members.filter((m) => m.status === 'dormant').length
  const leadConversion =
    op.newLeadCount > 0
      ? Math.round((op.convertedLeadCount / op.newLeadCount) * 100)
      : null

  const diagnosis: string[] = [
    `${ctx.periodLabel} 현금매출 ${formatCurrency(s.cashRevenue)} (신규 ${newShare}% · 재등록 ${renewalShare}%)`,
    `신규 등록 ${op.newMemberCount}명${prior ? ` · 전월 ${prior.newMemberCount}명` : ''}`,
    `상담 ${op.newLeadCount}건 · 전환 ${op.convertedLeadCount}건${leadConversion != null ? ` (${leadConversion}%)` : ''}`,
    `재등록 대상 ${renewalTargets}명 · 휴면 ${dormant}명 · 순이익 ${formatCurrency(s.netProfit)}`,
  ]

  type Priority = { rank: number; title: string; why: string; action: string }
  const priorities: Priority[] = []

  if (s.netProfit < 0) {
    priorities.push({
      rank: 1,
      title: '신규 광고보다 재등록·이탈 방지 우선',
      why: `순이익 ${formatCurrency(s.netProfit)}으로 현금흐름이 압박됩니다. 신규 유치 비용 대비 기존 회원 매출 방어가 먼저입니다.`,
      action: `재등록 대상 ${renewalTargets}명 상담 · 만료 예정 ${op.expiringMemberCount}명 알림톡 · 메시지 발송 탭 활용`,
    })
  }

  if (renewalShare < 40 && s.cashRevenue > 0) {
    priorities.push({
      rank: priorities.length + 1,
      title: '재등록 마케팅 강화',
      why: `매출의 ${renewalShare}%만 재등록입니다. 신규 ${formatCurrency(s.cashRevenueNew)} vs 재등록 ${formatCurrency(s.cashRevenueRenewal)}.`,
      action: '잔여 5회 이하 회원 패키지 제안 · 재등록 혜택(1회 추가 등) 메시지',
    })
  }

  if (op.newMemberCount < 3 || (prior && op.newMemberCount < prior.newMemberCount)) {
    priorities.push({
      rank: priorities.length + 1,
      title: '신규 유입 채널 보강',
      why: `이번 달 신규 등록 ${op.newMemberCount}명${prior && op.newMemberCount < prior.newMemberCount ? ` (전월 ${prior.newMemberCount}명 대비 감소)` : ''}. 유입이 부족합니다.`,
      action: '체험 PT · 지인 소개 · 상담·리드 메뉴에 문의 등록 · 만족 회원 후기 요청',
    })
  }

  if (op.newLeadCount >= 3 && leadConversion != null && leadConversion < 40) {
    priorities.push({
      rank: priorities.length + 1,
      title: '상담 전환율 개선 (광고 확대 X)',
      why: `상담 ${op.newLeadCount}건 중 전환 ${op.convertedLeadCount}건(${leadConversion}%). 문의는 있으나 등록 전환이 낮습니다.`,
      action: '상담 후 24시간 내 follow-up · 체험 일정 즉시 제안 · 상담·리드에서 미전환 건 재연락',
    })
  } else if (op.newLeadCount < 3) {
    priorities.push({
      rank: priorities.length + 1,
      title: '상담·리드 유입 늘리기',
      why: `이번 달 신규 상담 ${op.newLeadCount}건으로 유입 퍼널 상단이 좁습니다.`,
      action: '네이버·인스타 예약 링크 · 체험 이벤트 · 기존 회원 소개 혜택',
    })
  }

  if (dormant >= 2) {
    priorities.push({
      rank: priorities.length + 1,
      title: '휴면 회원 복귀 캠페인',
      why: `휴면 회원 ${dormant}명. 신규 광고보다 복귀 비용이 낮을 수 있습니다.`,
      action: '휴면 회원 대상 복귀 알림톡 · 체험 1회 무료 제안',
    })
  }

  if (op.attendanceRate < 75 && op.scheduledSessions > 0) {
    priorities.push({
      rank: priorities.length + 1,
      title: '출석·참여도 마케팅',
      why: `PT 출석률 ${op.attendanceRate}%로 낮습니다. 참여도가 낮으면 재등록·소개 모두 어렵습니다.`,
      action: '미출석 회원 일정 재조율 · 출석 리마인더 · 챌린지·마일리지 연동',
    })
  }

  if (priorities.length === 0) {
    priorities.push({
      rank: 1,
      title: '유지 + 소개 확대',
      why: `순이익 ${formatCurrency(s.netProfit)} · 신규 ${op.newMemberCount}명 · 재등록 비중 ${renewalShare}%로 안정적입니다.`,
      action: '만족 회원 3명 후기·지인 소개 요청 · 재등록 대상 선제 상담',
    })
  }

  const sorted = priorities
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3)
    .map((p, i) => ({ ...p, rank: i + 1 }))

  return {
    intent: 'marketing_direction',
    headline: '데이터 기반 마케팅 방향',
    sections: [
      {
        title: '현재 상태 (근거)',
        lines: diagnosis,
      },
      {
        title: '우선순위 마케팅 방향',
        lines: sorted.map(
          (p) =>
            `${p.rank}. ${p.title} — ${p.why} → 실행: ${p.action}`,
        ),
      },
      {
        title: '하지 말아야 할 것',
        lines:
          s.netProfit < 0
            ? [
                '순이익 마이너스 상태에서 대규모 신규 광고 집행 (현금흐름 악화)',
                '재등록·이탈 관리 없이 신규만 늘리기',
              ]
            : [
                '데이터 없이 채널만 늘리기 — 상담·전환율 먼저 확인',
                '재등록 대상 방치 후 신규 광고만 확대',
              ],
      },
    ],
    evidenceNote: `${ctx.periodLabel} 매출·회원·상담·출석·순이익 데이터 기반. 외부 시장·경쟁사 데이터는 없습니다.`,
    insufficientData:
      op.newLeadCount === 0 && prior == null
        ? ['상담·리드·전월 비교 데이터가 부족하면 방향 신뢰도가 낮습니다.']
        : undefined,
  }
}

function answerUnknown(ctx: MotionHubAssistantContext): MotionHubAssistantAnswer {
  return {
    intent: 'unknown',
    headline: '질문을 이해하지 못했습니다',
    sections: [
      {
        title: '이렇게 물어보세요',
        lines: [
          '왜 순이익이 마이너스야?',
          '재등록을 늘리려면?',
          '마케팅 방향은 어떻게 잡을까?',
          '이번 달 가장 위험한 회원은?',
          '누가 가장 성과가 좋은 트레이너야?',
        ],
      },
      {
        title: '현재 센터 요약',
        lines: [
          `${ctx.periodLabel} 순이익 ${formatCurrency(ctx.snapshot.netProfit)}`,
          `현금매출 ${formatCurrency(ctx.snapshot.cashRevenue)} · 활성 회원 ${ctx.snapshot.operational.activeMemberCount}명`,
        ],
      },
    ],
    evidenceNote: 'MotionHub 데이터만 사용합니다. 추측하지 않습니다.',
  }
}

export function answerMotionHubQuestion(
  question: string,
  context: MotionHubAssistantContext,
): MotionHubAssistantAnswer {
  const intent = detectAssistantIntent(question)

  switch (intent) {
    case 'net_profit':
      return answerNetProfit(context)
    case 'renewal_increase':
      return answerRenewalIncrease(context)
    case 'at_risk_members':
      return answerAtRiskMembers(context)
    case 'trainer_performance':
      return answerTrainerPerformance(context)
    case 'marketing_direction':
      return answerMarketingDirection(context)
    default:
      return answerUnknown(context)
  }
}

export function formatAssistantAnswer(answer: MotionHubAssistantAnswer): string {
  const parts = [answer.headline, '']
  for (const section of answer.sections) {
    parts.push(section.title)
    parts.push(...section.lines.map((line) => `· ${line}`))
    parts.push('')
  }
  if (answer.insufficientData?.length) {
    parts.push('추가 데이터 필요')
    parts.push(...answer.insufficientData.map((line) => `· ${line}`))
    parts.push('')
  }
  if (answer.evidenceNote) {
    parts.push(`— ${answer.evidenceNote}`)
  }
  return parts.join('\n').trim()
}
