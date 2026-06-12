import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchMemberById,
  fetchPaymentHistory,
} from '../../api/memberDetail'
import {
  fetchMemberAttendance,
  type MemberAttendanceRow,
} from '../../api/attendance'
import { fetchPeriodExtensions } from '../../api/period'
import { isTrainerStaff } from '../../lib/adminPermissions'
import { getAdminSession } from '../../lib/adminSession'
import type { Member, PaymentHistory, PeriodExtension } from '../../types/database'

type MemberDetailContextValue = {
  memberId: string
  member: Member | null
  payments: PaymentHistory[]
  attendance: MemberAttendanceRow[]
  periodExtensions: PeriodExtension[]
  loading: boolean
  error: string | null
  setError: (message: string | null) => void
  reload: () => Promise<void>
  usedSessions: number
}

const MemberDetailContext = createContext<MemberDetailContextValue | null>(null)

export function MemberDetailProvider({
  memberId,
  children,
}: {
  memberId: string
  children: ReactNode
}) {
  const [member, setMember] = useState<Member | null>(null)
  const [payments, setPayments] = useState<PaymentHistory[]>([])
  const [attendance, setAttendance] = useState<MemberAttendanceRow[]>([])
  const [periodExtensions, setPeriodExtensions] = useState<PeriodExtension[]>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const m = await fetchMemberById(memberId)
      const session = getAdminSession()
      if (
        isTrainerStaff(session) &&
        session?.trainerId &&
        m.trainer_id !== session.trainerId
      ) {
        setMember(null)
        setPayments([])
        setAttendance([])
        setPeriodExtensions([])
        setError('담당 회원만 조회할 수 있습니다.')
        return
      }

      const [p, att, ext] = await Promise.all([
        fetchPaymentHistory(memberId),
        fetchMemberAttendance(memberId, m.trainer_name),
        fetchPeriodExtensions(memberId),
      ])
      setMember(m)
      setPayments(p)
      setAttendance(att)
      setPeriodExtensions(ext)
    } catch (err) {
      setError(err instanceof Error ? err.message : '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void reload()
  }, [reload])

  const usedSessions = useMemo(() => {
    if (!member) return 0
    return Math.max(0, member.total_sessions - member.remaining_sessions)
  }, [member])

  const value = useMemo(
    () => ({
      memberId,
      member,
      payments,
      attendance,
      periodExtensions,
      loading,
      error,
      setError,
      reload,
      usedSessions,
    }),
    [
      memberId,
      member,
      payments,
      attendance,
      periodExtensions,
      loading,
      error,
      reload,
      usedSessions,
    ],
  )

  return (
    <MemberDetailContext.Provider value={value}>
      {children}
    </MemberDetailContext.Provider>
  )
}

export function useMemberDetail(): MemberDetailContextValue {
  const ctx = useContext(MemberDetailContext)
  if (!ctx) {
    throw new Error('useMemberDetail must be used within MemberDetailProvider')
  }
  return ctx
}
