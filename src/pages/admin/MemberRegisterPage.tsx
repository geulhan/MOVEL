import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchMembers } from '../../api/members'
import { fetchTrainers } from '../../api/trainers'
import { PageHeader } from '../../components/admin/PageHeader'
import { MemberForm } from '../../components/MemberForm'
import { isTrainerStaff } from '../../lib/adminPermissions'
import { formatSupabaseError } from '../../lib/errors'
import { PAGE_HELP } from '../../lib/pageHelpTips'
import { getAdminSession } from '../../lib/adminSession'
import type { Member, Trainer } from '../../types/database'

export default function MemberRegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const session = getAdminSession()
  const isTrainer = isTrainerStaff(session)

  const [members, setMembers] = useState<Member[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [dbWarning, setDbWarning] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [memberRows, trainerRows] = await Promise.all([
        fetchMembers(),
        fetchTrainers(),
      ])
      setMembers(memberRows)
      setTrainers(trainerRows)
      setDbWarning(null)
    } catch (err) {
      setMembers([])
      setTrainers([])
      setDbWarning(formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (isTrainer) {
    return <Navigate to="/admin/members" replace />
  }

  const onboardingParam = searchParams.get('onboarding')
  const isOnboardingRegister =
    onboardingParam === 'register' || (!loading && members.length === 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="회원 등록"
        description="이름과 휴대폰만 입력해도 가입 안내 알림톡이 발송됩니다."
        helpText={PAGE_HELP.members}
      />

      {dbWarning && (
        <div className="rounded-xl border border-gold/60 bg-white px-4 py-3 text-sm text-charcoal">
          <p className="font-semibold text-gold-dark">DB 설정 필요</p>
          <p className="mt-1">{dbWarning}</p>
        </div>
      )}

      {isOnboardingRegister && (
        <div className="rounded-xl border border-gold/40 bg-cream/50 px-4 py-3 text-sm text-charcoal">
          <p className="font-semibold">지금 할 일: 첫 회원 1명 등록</p>
          <p className="mt-1 text-muted">
            이름과 휴대폰만 입력하세요. 등록 즉시 회원에게 가입 안내 알림톡이 발송됩니다.
          </p>
        </div>
      )}

      <MemberForm
        trainers={trainers}
        members={members}
        onCreated={() => {
          void load()
          navigate('/admin/members')
        }}
        onboardingMode={isOnboardingRegister}
        centerSlug={session?.centerSlug}
        centerName={session?.centerName}
      />
    </div>
  )
}
