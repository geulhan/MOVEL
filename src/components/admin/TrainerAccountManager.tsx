import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteTrainerAdminAccount,
  fetchTrainerAdminAccounts,
  upsertTrainerAdminAccount,
  type TrainerAdminAccount,
} from '../../api/trainerAccounts'
import { formatSupabaseError } from '../../lib/errors'
import { btnGold, btnOutline, cardClass, inputClass } from '../../styles/theme'
import type { Trainer } from '../../types/database'

type Props = {
  trainers: Trainer[]
}

type EditorState = {
  trainerId: string
  username: string
  password: string
  passwordConfirm: string
}

export function TrainerAccountManager({ trainers }: Props) {
  const [accounts, setAccounts] = useState<TrainerAdminAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)

  const accountByTrainerId = useMemo(
    () => new Map(accounts.map((account) => [account.trainer_id, account])),
    [accounts],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAccounts(await fetchTrainerAdminAccounts())
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openEditor(trainer: Trainer) {
    const existing = accountByTrainerId.get(trainer.id)
    setEditor({
      trainerId: trainer.id,
      username: existing?.username ?? '',
      password: '',
      passwordConfirm: '',
    })
    setMessage(null)
    setError(null)
  }

  function closeEditor() {
    setEditor(null)
  }

  async function handleSave() {
    if (!editor) return

    const username = editor.username.trim()
    if (!username) {
      setError('로그인 아이디를 입력해 주세요.')
      return
    }
    if (editor.password.length < 4) {
      setError('비밀번호는 4자 이상이어야 합니다.')
      return
    }
    if (editor.password !== editor.passwordConfirm) {
      setError('비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setSavingId(editor.trainerId)
    setError(null)
    setMessage(null)
    try {
      await upsertTrainerAdminAccount({
        trainerId: editor.trainerId,
        username,
        password: editor.password,
      })
      const trainer = trainers.find((item) => item.id === editor.trainerId)
      setMessage(
        `${trainer?.name ?? '트레이너'} 로그인 계정이 저장되었습니다.`,
      )
      closeEditor()
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(trainer: Trainer) {
    const existing = accountByTrainerId.get(trainer.id)
    if (!existing) return
    if (
      !window.confirm(
        `${trainer.name} 트레이너의 로그인 계정(${existing.username})을 삭제할까요?`,
      )
    ) {
      return
    }

    setDeletingId(trainer.id)
    setError(null)
    setMessage(null)
    try {
      await deleteTrainerAdminAccount(trainer.id)
      setMessage(`${trainer.name} 로그인 계정이 삭제되었습니다.`)
      if (editor?.trainerId === trainer.id) closeEditor()
      await load()
    } catch (err) {
      setError(formatSupabaseError(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="border-b border-gold/20 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-charcoal">트레이너 로그인 계정</h2>
        <p className="mt-1 text-sm text-muted">
          트레이너별 로그인 아이디·비밀번호를 설정하면 회원 관리·PT 스케줄만
          이용할 수 있습니다.
        </p>
      </div>

      {message && (
        <p className="mx-5 mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 sm:mx-6">
          {message}
        </p>
      )}
      {error && (
        <p className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:mx-6">
          {error}
        </p>
      )}

      <div className="table-scroll">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">트레이너</th>
              <th className="px-4 py-3">로그인 아이디</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/15">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  불러오는 중…
                </td>
              </tr>
            ) : trainers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  등록된 트레이너가 없습니다.
                </td>
              </tr>
            ) : (
              trainers.map((trainer) => {
                const account = accountByTrainerId.get(trainer.id)

                return (
                  <tr key={trainer.id} className="align-top">
                    <td className="px-4 py-3 font-medium text-charcoal">
                      {trainer.name}
                    </td>
                    <td className="px-4 py-3 text-charcoal/80">
                      {account?.username ?? (
                        <span className="text-muted">미설정</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          account
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-charcoal/10 text-charcoal/50'
                        }`}
                      >
                        {account ? '계정 있음' : '미설정'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditor(trainer)}
                          className={`${btnGold} px-3 py-1.5 text-xs`}
                        >
                          {account ? '수정' : '계정 만들기'}
                        </button>
                        {account && (
                          <button
                            type="button"
                            disabled={deletingId === trainer.id}
                            onClick={() => void handleDelete(trainer)}
                            className={`${btnOutline} px-3 py-1.5 text-xs text-red-700`}
                          >
                            {deletingId === trainer.id ? '삭제 중…' : '삭제'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {editor && (
        <div className="border-t border-gold/20 bg-cream/40 px-5 py-5 sm:px-6">
          <h3 className="text-sm font-bold text-charcoal">
            {trainers.find((trainer) => trainer.id === editor.trainerId)?.name}{' '}
            로그인 계정
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-charcoal">로그인 아이디</span>
              <input
                type="text"
                value={editor.username}
                onChange={(e) =>
                  setEditor((prev) =>
                    prev ? { ...prev, username: e.target.value } : prev,
                  )
                }
                className={inputClass}
                autoComplete="off"
              />
            </label>
            <div />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-charcoal">
                {accountByTrainerId.has(editor.trainerId)
                  ? '새 비밀번호'
                  : '비밀번호'}
              </span>
              <input
                type="password"
                value={editor.password}
                onChange={(e) =>
                  setEditor((prev) =>
                    prev ? { ...prev, password: e.target.value } : prev,
                  )
                }
                className={inputClass}
                autoComplete="new-password"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-charcoal">
                비밀번호 확인
              </span>
              <input
                type="password"
                value={editor.passwordConfirm}
                onChange={(e) =>
                  setEditor((prev) =>
                    prev ? { ...prev, passwordConfirm: e.target.value } : prev,
                  )
                }
                className={inputClass}
                autoComplete="new-password"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={savingId === editor.trainerId}
              onClick={() => void handleSave()}
              className={btnGold}
            >
              {savingId === editor.trainerId ? '저장 중…' : '저장'}
            </button>
            <button type="button" onClick={closeEditor} className={btnOutline}>
              취소
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
