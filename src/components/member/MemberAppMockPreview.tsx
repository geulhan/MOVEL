import type { ReactNode } from 'react'
import { MEMBER_WELCOME_MOCK } from '../../constants/memberWelcomeMock'

const MOCK = MEMBER_WELCOME_MOCK

const mockShellClass =
  'overflow-hidden rounded-2xl border border-charcoal/14 bg-[#e4e9ef] shadow-[0_6px_24px_rgba(15,23,42,0.12)]'
const mockCardClass =
  'rounded-xl border border-charcoal/10 bg-[#eef2f6] p-3 shadow-sm shadow-charcoal/5'

export function MemberAppMockPreview() {
  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="text-sm font-semibold text-charcoal/90">회원앱 미리보기</p>
        <span className="rounded-full border border-charcoal/12 bg-charcoal/6 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-charcoal/65">
          샘플 화면
        </span>
      </div>

      <div className={mockShellClass} aria-hidden="true">
        <div className="border-b border-charcoal/12 bg-[#d5dce5] px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-charcoal/90">모션허브</p>
            <span className="text-[10px] text-charcoal/55">회원 홈</span>
          </div>
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {['수업 일정', '운동 일지', '결제'].map((label, index) => (
              <span
                key={label}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  index === 0
                    ? 'bg-charcoal/85 text-motionhub'
                    : 'bg-[#e8ecf1] text-charcoal/60 ring-1 ring-charcoal/12'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3 bg-[#d8dee6] p-4">
          <MockCard title="다음 예약">
            <p className="font-semibold text-charcoal/90">{MOCK.nextSchedule.title}</p>
            <p className="mt-1 text-sm text-charcoal/75">
              {MOCK.nextSchedule.dateTimeLabel}
            </p>
            <p className="mt-0.5 text-xs text-charcoal/55">
              담당 {MOCK.nextSchedule.trainerName}
            </p>
          </MockCard>

          <MockCard title="잔여 수강권">
            <ul className="space-y-2">
              {MOCK.passes.map((pass) => (
                <li
                  key={pass.label}
                  className="flex items-center justify-between rounded-lg border border-charcoal/8 bg-[#e4e9ef] px-3 py-2"
                >
                  <span className="text-sm font-medium text-charcoal/85">{pass.label}</span>
                  <span className="text-sm tabular-nums">
                    <span className="font-bold text-charcoal/90">{pass.remaining}</span>
                    <span className="text-charcoal/50"> / {pass.total}회</span>
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
                  <span className="text-charcoal/75">{row.dateLabel}</span>
                  <span className="rounded-md bg-emerald-900/12 px-2 py-0.5 text-[10px] font-bold text-emerald-900/75">
                    {row.type}
                  </span>
                </li>
              ))}
            </ul>
          </MockCard>

          <MockCard title="운동기록">
            <p className="text-xs text-charcoal/55">{MOCK.journal.dateLabel}</p>
            <p className="mt-0.5 font-semibold text-charcoal/90">{MOCK.journal.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-charcoal/65">
              {MOCK.journal.excerpt}
            </p>
          </MockCard>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-charcoal/55">
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
    <div className={mockCardClass}>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-charcoal/50">
        {title}
      </p>
      {children}
    </div>
  )
}
