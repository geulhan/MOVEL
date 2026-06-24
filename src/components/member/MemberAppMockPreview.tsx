import type { ReactNode } from 'react'
import { MEMBER_WELCOME_MOCK } from '../../constants/memberWelcomeMock'
import { cardClass } from '../../styles/theme'

const MOCK = MEMBER_WELCOME_MOCK

export function MemberAppMockPreview() {
  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="text-sm font-semibold text-charcoal">회원앱 미리보기</p>
        <span className="rounded-full bg-charcoal/8 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-charcoal/55">
          샘플 화면
        </span>
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-[0_8px_32px_rgba(15,23,42,0.08)] ring-1 ring-charcoal/5"
        aria-hidden="true"
      >
        <div className="border-b border-charcoal/8 bg-[#f8faf9] px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-charcoal">모션허브</p>
            <span className="text-[10px] text-charcoal/45">회원 홈</span>
          </div>
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {['수업 일정', '운동 일지', '결제'].map((label, index) => (
              <span
                key={label}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  index === 0
                    ? 'bg-motionhub text-white'
                    : 'bg-white text-charcoal/55 ring-1 ring-charcoal/10'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3 bg-[#f4f6f8] p-4">
          <MockCard title="다음 예약">
            <p className="font-semibold text-charcoal">{MOCK.nextSchedule.title}</p>
            <p className="mt-1 text-sm text-charcoal/75">
              {MOCK.nextSchedule.dateTimeLabel}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              담당 {MOCK.nextSchedule.trainerName}
            </p>
          </MockCard>

          <MockCard title="잔여 수강권">
            <ul className="space-y-2">
              {MOCK.passes.map((pass) => (
                <li
                  key={pass.label}
                  className="flex items-center justify-between rounded-lg bg-cream/80 px-3 py-2"
                >
                  <span className="text-sm font-medium text-charcoal">{pass.label}</span>
                  <span className="text-sm tabular-nums">
                    <span className="font-bold text-charcoal">{pass.remaining}</span>
                    <span className="text-charcoal/45"> / {pass.total}회</span>
                  </span>
                </li>
              ))}
            </ul>
          </MockCard>

          <MockCard title="최근 출석">
            <ul className="space-y-2">
              {MOCK.recentAttendance.map((row) => (
                <li
                  key={row.dateLabel}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-charcoal/80">{row.dateLabel}</span>
                  <span className="rounded-md bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
                    {row.type}
                  </span>
                </li>
              ))}
            </ul>
          </MockCard>

          <MockCard title="운동기록">
            <p className="text-xs text-muted">{MOCK.journal.dateLabel}</p>
            <p className="mt-0.5 font-semibold text-charcoal">{MOCK.journal.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-charcoal/70">
              {MOCK.journal.excerpt}
            </p>
          </MockCard>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-muted">
        실제 내 정보는 회원가입 후 확인할 수 있습니다.
      </p>
    </div>
  )
}

function MockCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className={`${cardClass} p-3 shadow-sm`}>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gold-dark">
        {title}
      </p>
      {children}
    </div>
  )
}
