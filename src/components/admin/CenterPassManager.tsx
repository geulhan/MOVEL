import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { todayDateString } from '../../api/members'
import {
  assignCenterPass,
  cancelCenterPass,
  centerPassStatusLabel,
  fetchCenterPassProducts,
  fetchCenterPasses,
  formatCenterPassPeriod,
  type CenterPassProduct,
  type CenterPassWithMember,
} from '../../api/centerPasses'
import { fetchMembers } from '../../api/members'
import type { Member } from '../../types/database'
import { btnGold, cardClass, inputClass } from '../../styles/theme'

export function CenterPassManager() {
  const [products, setProducts] = useState<CenterPassProduct[]>([])
  const [passes, setPasses] = useState<CenterPassWithMember[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [memberId, setMemberId] = useState('')
  const [productId, setProductId] = useState('')
  const [startsAt, setStartsAt] = useState(todayDateString())
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [productRows, passRows, memberRows] = await Promise.all([
        fetchCenterPassProducts(),
        fetchCenterPasses({ limit: 100 }),
        fetchMembers(),
      ])
      setProducts(productRows)
      setPasses(passRows)
      setMembers(memberRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : '이용권 정보를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAssignPass() {
    if (!memberId) {
      setError('회원을 선택해 주세요.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await assignCenterPass({
        memberId,
        productId: productId || null,
        startsAt,
        note,
      })
      setToast('센터 이용권이 등록되었습니다.')
      setNote('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '이용권 등록 실패')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelPass(passId: string) {
    if (!window.confirm('이 이용권을 취소할까요?')) return
    setSaving(true)
    try {
      await cancelCenterPass(passId)
      setToast('이용권이 취소되었습니다.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '취소 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {toast}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <details className={`${cardClass} group p-5 sm:p-6`}>
        <summary className="cursor-pointer text-sm font-bold text-charcoal">
          수동 이용권 부여 (결제 없이)
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-muted">회원</span>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className={inputClass}
            >
              <option value="">선택</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">상품</span>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className={inputClass}
            >
              <option value="">직접 입력</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.label} ({product.duration_days}일)
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">시작일</span>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-muted">메모</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="선택"
              className={inputClass}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleAssignPass()}
          className={`mt-4 ${btnGold}`}
        >
          {saving ? '등록 중…' : '이용권 등록'}
        </button>
      </details>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-gold/15 px-5 py-3">
          <h3 className="text-sm font-bold text-charcoal">회원 이용권</h3>
          <p className="mt-0.5 text-xs text-muted">
            결제 완료 시 자동 등록됩니다.
          </p>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-sm text-muted">불러오는 중…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gold/15 bg-cream/50 text-left text-xs text-muted">
                  <th className="px-4 py-2">회원</th>
                  <th className="px-4 py-2">이용권</th>
                  <th className="px-4 py-2">기간</th>
                  <th className="px-4 py-2">상태</th>
                  <th className="px-4 py-2">처리</th>
                </tr>
              </thead>
              <tbody>
                {passes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                      등록된 이용권이 없습니다.
                    </td>
                  </tr>
                ) : (
                  passes.map((pass) => (
                    <tr key={pass.id} className="border-b border-gold/10">
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/member/${pass.member_id}`}
                          className="font-medium hover:underline"
                        >
                          {pass.member_name ?? '회원'}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{pass.label}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {formatCenterPassPeriod(pass)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold">
                        {centerPassStatusLabel(pass.status)}
                      </td>
                      <td className="px-4 py-3">
                        {pass.status !== 'cancelled' && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handleCancelPass(pass.id)}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            취소
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
