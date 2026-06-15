import { useCallback, useEffect, useState } from 'react'
import {
  fetchPlatformCenterUsers,
  resetPlatformCenterUserPassword,
  type PlatformCenterUser,
} from '../../api/platformAccounts'
import { formatPhone } from '../../api/members'
import type { PlatformCenter } from '../../api/platformCenters'
import { btnOutline } from '../../styles/theme'

type Props = {
  center: PlatformCenter
  onClose: () => void
}

const ROLE_LABELS: Record<string, string> = {
  center_admin: '관리자',
  trainer: '트레이너',
}

export function PlatformCenterAccountsModal({ center, onClose }: Props) {
  const [users, setUsers] = useState<PlatformCenterUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await fetchPlatformCenterUsers(center.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '계정 목록을 불러오지 못했습니다.')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [center.id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleReset(user: PlatformCenterUser) {
    if (
      !window.confirm(
        `${user.username} 계정 비밀번호를 휴대폰 뒤 4자리로 초기화할까요?`,
      )
    ) {
      return
    }

    setActingId(user.id)
    setError(null)
    setResetResult(null)
    try {
      const { username, tempPassword } = await resetPlatformCenterUserPassword(
        user.id,
      )
      setResetResult(
        `${username} 비밀번호가 ${tempPassword}(으)로 초기화되었습니다. 로그인 후 변경을 안내해 주세요.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호 초기화에 실패했습니다.')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#161d26] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">{center.name} 계정</h2>
            <p className="mt-1 text-sm text-cream/60">
              관리자·트레이너 로그인 계정 확인 및 비밀번호 초기화 (휴대폰 뒤 4자리)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-cream/70 hover:bg-white/5"
          >
            닫기
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        {resetResult && (
          <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {resetResult}
          </p>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-cream/60">불러오는 중…</p>
        ) : users.length === 0 ? (
          <p className="mt-6 text-sm text-cream/60">등록된 계정이 없습니다.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-cream/50">
                <tr>
                  <th className="px-3 py-2 font-medium">아이디</th>
                  <th className="px-3 py-2 font-medium">역할</th>
                  <th className="px-3 py-2 font-medium">연락처</th>
                  <th className="px-3 py-2 font-medium">상태</th>
                  <th className="px-3 py-2 font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 text-cream/90">
                    <td className="px-3 py-3 font-mono text-xs">{user.username}</td>
                    <td className="px-3 py-3">
                      {ROLE_LABELS[user.role] ?? user.role}
                      {user.trainer_name && (
                        <span className="ml-1 text-xs text-cream/50">
                          ({user.trainer_name})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {user.phone ? formatPhone(user.phone) : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs">{user.status}</td>
                    <td className="px-3 py-3">
                      {user.role === 'center_admin' && (
                        <button
                          type="button"
                          disabled={actingId === user.id}
                          onClick={() => void handleReset(user)}
                          className="text-xs text-amber-300 hover:underline disabled:opacity-50"
                        >
                          비밀번호 초기화
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className={btnOutline}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
