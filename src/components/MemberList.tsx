import { formatCurrency, formatDate, formatPhone, isExpired } from '../api/members'
import { btnOutline } from '../styles/theme'
import type { Member, MemberStatus, Trainer } from '../types/database'
import { MEMBER_STATUS_LABELS } from '../types/database'
import { isUnregisteredMember } from '../utils/renewal'
import { PtAlertBadge } from './PtAlertBadge'
import { SessionCount } from './SessionCount'

type Props = {
  members: Member[]
  trainers: Trainer[]
  loading: boolean
  onOpenDetail: (id: string) => void
  onDeduct: (id: string) => void
  onStatusChange: (id: string, status: MemberStatus) => void
  onTrainerChange: (id: string, trainerId: string | null) => void
  deductingId: string | null
  updatingStatusId: string | null
  updatingTrainerId: string | null
}

export function MemberList({
  members,
  trainers,
  loading,
  onOpenDetail,
  onDeduct,
  onStatusChange,
  onTrainerChange,
  deductingId,
  updatingStatusId,
  updatingTrainerId,
}: Props) {
  return (
    <section className="card overflow-hidden">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-charcoal">회원 목록</h2>
        <p className="mt-1 text-sm text-muted">
          {members.length}명 · 트레이너·상태는 목록에서 바로 변경
        </p>
      </div>

      {loading ? (
        <p className="px-6 py-12 text-center text-sm text-muted">
          불러오는 중…
        </p>
      ) : members.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted">
          등록된 회원이 없습니다.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">전화번호</th>
                <th className="px-4 py-3">트레이너</th>
                <th className="px-4 py-3">기간</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">PT</th>
                <th className="px-4 py-3">결제</th>
                <th className="px-4 py-3">차감</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/15">
              {members.map((member) => {
                const unregistered = isUnregisteredMember(member)
                const noSessions = member.remaining_sessions <= 0
                const expired =
                  member.expires_at !== null && isExpired(member.expires_at)
                const canDeduct =
                  member.status === 'active' && !noSessions && !expired

                return (
                  <tr key={member.id} className="transition hover:bg-cream/60">
                    <td className="max-w-[8rem] px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenDetail(member.id)}
                          className="link-name"
                          title={member.name}
                        >
                          {member.name}
                        </button>
                        {unregistered ? (
                          <span className="inline-flex shrink-0 rounded-full border border-sky-300/60 bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap text-sky-800">
                            미등록
                          </span>
                        ) : (
                          <PtAlertBadge member={member} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-charcoal/70 tabular-nums">
                      {formatPhone(member.phone)}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={member.trainer_id ?? ''}
                        disabled={
                          updatingTrainerId === member.id ||
                          trainers.length === 0
                        }
                        onChange={(e) =>
                          onTrainerChange(
                            member.id,
                            e.target.value || null,
                          )
                        }
                        className="select-compact w-[5.5rem]"
                      >
                        <option value="">미지정</option>
                        {trainers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs leading-5">
                      <div className="text-charcoal/70">
                        {formatDate(member.registered_at)}
                      </div>
                      <div
                        className={
                          expired
                            ? 'font-semibold text-red-600'
                            : 'text-charcoal/50'
                        }
                      >
                        ~ {formatDate(member.expires_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={member.status}
                        disabled={updatingStatusId === member.id}
                        onChange={(e) =>
                          onStatusChange(
                            member.id,
                            e.target.value as MemberStatus,
                          )
                        }
                        className="select-compact min-w-[5.25rem]"
                      >
                        {(Object.keys(MEMBER_STATUS_LABELS) as MemberStatus[]).map(
                          (key) => (
                            <option key={key} value={key}>
                              {MEMBER_STATUS_LABELS[key]}
                            </option>
                          ),
                        )}
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <SessionCount
                        total={member.total_sessions}
                        remaining={member.remaining_sessions}
                      />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-charcoal/80 tabular-nums">
                      {formatCurrency(Number(member.payment_amount))}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => onDeduct(member.id)}
                        disabled={!canDeduct || deductingId === member.id}
                        title={
                          member.status !== 'active'
                            ? '활성 회원만 차감 가능'
                            : expired
                              ? '만료된 회원'
                              : noSessions
                                ? '남은 횟수 없음'
                                : undefined
                        }
                        className={btnOutline}
                      >
                        {deductingId === member.id ? '…' : '-1회'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
