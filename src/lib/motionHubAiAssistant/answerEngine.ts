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
  | 'unknown'

export function detectAssistantIntent(question: string): AssistantIntent {
  const q = question.trim().toLowerCase()

  if (/순이익|적자|마이너스|손실|왜.*부족/.test(q)) return 'net_profit'
  if (/재등록|리뉴얼|연장/.test(q)) return 'renewal_increase'
  if (/위험|이탈|환불.*가능|빠질|끊을/.test(q)) return 'at_risk_members'
  if (/트레이너|강사|성과|누가.*잘|매출.*높/.test(q)) return 'trainer_performance'

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
