import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAllRewardBalances,
  fetchRewardBalance,
  fetchRewardTransactions,
  manualRewardAdjust,
  type MemberRewardSummary,
  type RewardBalance,
  type RewardTransaction,
} from '../../api/rewards'
import { fetchMembers } from '../../api/members'
import { PageHeader } from '../../components/admin/PageHeader'
import { CenterPhotoSubmissionsPanel } from '../../components/admin/CenterPhotoSubmissionsPanel'
import { StepVerificationsPanel } from '../../components/admin/StepVerificationsPanel'
import {
  REWARD_EVENT_LABELS,
  type RewardEventType,
} from '../../constants/rewards'
import { formatSupabaseError } from '../../lib/errors'
import { btnOutline, btnPrimary, cardClass, inputClass } from '../../styles/theme'
import type { Member } from '../../types/database'

type HistoryTab = 'earn' | 'spend'
type RewardsAdminTab = 'balances' | 'steps' | 'center_photo'

export default function RewardsPage() {
  const [adminTab, setAdminTab] = useState<RewardsAdminTab>('balances')
  const [summaries, setSummaries] = useState<MemberRewardSummary[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [balance, setBalance] = useState<RewardBalance | null>(null)
  const [earnTxns, setEarnTxns] = useState<RewardTransaction[]>([])
  const [spendTxns, setSpendTxns] = useState<RewardTransaction[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [historyTab, setHistoryTab] = useState<HistoryTab>('earn')

  const [adjustCurrency, setAdjustCurrency] = useState<'move_score' | 'move_mile'>(
    'move_mile',
  )
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, memberList] = await Promise.all([
        fetchAllRewardBalances(),
        fetchMembers(),
      ])
      setSummaries(list)
      setMembers(memberList)
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (memberId: string) => {
    if (!memberId) return
    setDetailLoading(true)
    try {
      const [bal, allTxns] = await Promise.all([
        fetchRewardBalance(memberId),
        fetchRewardTransactions(memberId, { limit: 100 }),
      ])
      setBalance(bal)
      setEarnTxns(allTxns.filter((t) => t.amount > 0))
      setSpendTxns(allTxns.filter((t) => t.amount < 0))
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId)
  }, [selectedId, loadDetail])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return summaries
    return summaries.filter((s) => s.member_name.toLowerCase().includes(term))
  }, [summaries, search])

  const selectedMember = members.find((m) => m.id === selectedId)
  const displayedTxns = historyTab === 'earn' ? earnTxns : spendTxns

  async function handleAdjust(sign: 1 | -1) {
    if (!selectedId) return
    const amount = Number(adjustAmount.replace(/,/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('금액을 올바르게 입력해 주세요.')
      return
    }
    if (!adjustNote.trim()) {
      setError('사유를 입력해 주세요.')
      return
    }
    setAdjustSaving(true)
    setError(null)
    try {
      await manualRewardAdjust({
        memberId: selectedId,
        currency: adjustCurrency,
        amount: amount * sign,
        note: adjustNote.trim(),
        adminLabel: 'admin',
      })
      setAdjustAmount('')
      setAdjustNote('')
      await Promise.all([loadList(), loadDetail(selectedId)])
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setAdjustSaving(false)
    }
  }

  function eventLabel(eventType: string): string {
    return REWARD_EVENT_LABELS[eventType as RewardEventType] ?? eventType
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="마일리지 관리"
        description="회원별 MOVE MILE · SCORE 조회, 걸음 인증 확인, 수동 적립·차감"
      />

      <nav className="chip-scroll -mx-1 px-1">
        <button
          type="button"
          onClick={() => setAdminTab('balances')}
          className={`chip ${adminTab === 'balances' ? 'chip-active' : 'chip-inactive'}`}
        >
          잔액 · 수동 조정
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('steps')}
          className={`chip ${adminTab === 'steps' ? 'chip-active' : 'chip-inactive'}`}
        >
          걸음 인증
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('center_photo')}
          className={`chip ${adminTab === 'center_photo' ? 'chip-active' : 'chip-inactive'}`}
        >
          센터 사진
        </button>
      </nav>

      {adminTab === 'steps' ? (
        <StepVerificationsPanel />
      ) : null}

      {adminTab === 'center_photo' ? (
        <CenterPhotoSubmissionsPanel />
      ) : null}

      {adminTab === 'balances' && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {adminTab === 'balances' ? (
      <div className="grid gap-6 lg:grid-cols-5">
        <section className={`${cardClass} overflow-hidden lg:col-span-2`}>
          <div className="card-header">
            <h3 className="text-sm font-bold text-charcoal">회원별 잔액</h3>
            <input
              type="search"
              placeholder="이름 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} mt-2`}
            />
          </div>
          <div className="max-h-[32rem] overflow-y-auto">
            {loading ? (
              <p className="p-6 text-center text-sm text-muted">불러오는 중…</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-head sticky top-0 bg-cream/95">
                  <tr>
                    <th className="px-4 py-2 text-left">회원</th>
                    <th className="px-2 py-2 text-right">SCORE</th>
                    <th className="px-4 py-2 text-right">MILE</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.member_id}
                      onClick={() => setSelectedId(row.member_id)}
                      className={`cursor-pointer border-t border-gold/10 transition hover:bg-cream/60 ${
                        selectedId === row.member_id ? 'bg-gold/10' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-bold text-charcoal">{row.member_name}</p>
                        <p className="text-[11px] text-muted">{row.tier}</p>
                      </td>
                      <td className="px-2 py-2.5 text-right font-bold tabular-nums">
                        {row.move_score.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums">
                        {row.move_mile.toLocaleString()}M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className={`${cardClass} lg:col-span-3`}>
          {!selectedId ? (
            <p className="p-10 text-center text-sm text-muted">
              왼쪽 목록에서 회원을 선택하세요.
            </p>
          ) : detailLoading && !balance ? (
            <p className="p-10 text-center text-sm text-muted">불러오는 중…</p>
          ) : (
            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <h3 className="text-lg font-bold text-charcoal">
                  {selectedMember?.name ?? '회원'}
                </h3>
                {balance && (
                  <div className="mt-3 flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs text-muted">MOVE SCORE</p>
                      <p className="text-2xl font-bold tabular-nums">
                        {balance.move_score.toLocaleString()}
                        <span className="ml-2 text-sm font-bold text-gold-dark">
                          {balance.tier}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">MOVE MILE</p>
                      <p className="text-2xl font-bold tabular-nums">
                        {balance.move_mile.toLocaleString()}M
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gold/25 bg-cream/40 p-4 space-y-3">
                <h4 className="text-sm font-bold text-charcoal">수동 적립 / 차감</h4>
                <p className="text-xs text-muted">
                  걸음수 인증은 회원 OCR 자동 검수로 처리됩니다. 관리자는
                  마일리지만 수동 조정할 수 있습니다.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-muted">유형</span>
                    <select
                      value={adjustCurrency}
                      onChange={(e) =>
                        setAdjustCurrency(e.target.value as 'move_score' | 'move_mile')
                      }
                      className={inputClass}
                    >
                      <option value="move_mile">MOVE MILE</option>
                      <option value="move_score">MOVE SCORE</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-muted">금액</span>
                    <input
                      type="number"
                      min={1}
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-muted">사유</span>
                  <input
                    type="text"
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    placeholder="예: 이벤트 보상, 오류 정정"
                    className={inputClass}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={adjustSaving}
                    onClick={() => void handleAdjust(1)}
                    className={btnPrimary}
                  >
                    수동 적립
                  </button>
                  <button
                    type="button"
                    disabled={adjustSaving}
                    onClick={() => void handleAdjust(-1)}
                    className={btnOutline}
                  >
                    수동 차감
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-2 flex border-b border-gold/20">
                  {(
                    [
                      { id: 'earn' as const, label: '적립 내역' },
                      { id: 'spend' as const, label: '사용 내역' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setHistoryTab(t.id)}
                      className={`flex-1 py-2.5 text-sm font-bold transition ${
                        historyTab === t.id
                          ? 'border-b-2 border-gold text-charcoal'
                          : 'text-muted'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <ul className="max-h-72 divide-y divide-gold/15 overflow-y-auto rounded-xl border border-gold/20">
                  {displayedTxns.length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-muted">
                      내역 없음
                    </li>
                  ) : (
                    displayedTxns.map((txn) => (
                      <li
                        key={txn.id}
                        className="flex justify-between gap-2 px-4 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-bold">{eventLabel(txn.event_type)}</p>
                          {txn.note && (
                            <p className="truncate text-xs text-muted">{txn.note}</p>
                          )}
                          <p className="text-[11px] text-muted">
                            {new Date(txn.created_at).toLocaleString('ko-KR')}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 font-bold tabular-nums ${
                            txn.amount > 0 ? 'text-gold-dark' : 'text-charcoal/50'
                          }`}
                        >
                          {txn.amount > 0 ? '+' : ''}
                          {txn.amount.toLocaleString()}
                          {txn.currency === 'move_mile' ? 'M' : '점'}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
      ) : null}
    </div>
  )
}
