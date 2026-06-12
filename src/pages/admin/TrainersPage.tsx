import { useCallback, useEffect, useState } from 'react'
import { fetchTrainers } from '../../api/trainers'
import { PageHeader } from '../../components/admin/PageHeader'
import { TrainerAccountManager } from '../../components/admin/TrainerAccountManager'
import { TrainerManage } from '../../components/TrainerManage'
import { formatSupabaseError } from '../../lib/errors'
import type { Trainer } from '../../types/database'

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchTrainers()
      setTrainers(data)
      setError(null)
    } catch (err) {
      setError(formatSupabaseError(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        title="트레이너"
        description="트레이너 등록 및 로그인 계정 관리"
      />

      {error && (
        <div className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <TrainerManage trainers={trainers} onUpdated={() => void load()} />
      <TrainerAccountManager trainers={trainers} />
    </div>
  )
}
