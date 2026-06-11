export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type MemberStatus = 'active' | 'dormant' | 'terminated'

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: '활성',
  dormant: '휴면',
  terminated: '종료',
}

export type Trainer = {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export type AdminUser = {
  id: string
  username: string
  password_hash: string
  created_at: string
}

export type MemberCredential = {
  member_id: string
  password_hash: string
  updated_at: string
}

export type Member = {
  id: string
  name: string
  phone: string
  total_sessions: number
  remaining_sessions: number
  payment_amount: number
  registered_at: string
  expires_at: string | null
  trainer_id: string | null
  trainer_name: string | null
  referred_by_member_id: string | null
  status: MemberStatus
  created_at: string
  updated_at: string
}

export type PeriodExtension = {
  id: string
  member_id: string
  days_added: number
  note: string | null
  created_at: string
}

export type PaymentHistory = {
  id: string
  member_id: string
  amount: number
  sessions: number
  paid_at: string
  note: string | null
  created_at: string
}

export type SessionLog = {
  id: string
  member_id: string
  deducted_at: string
  quantity: number
  remaining_after: number | null
}

export type MemberMemo = {
  id: string
  member_id: string
  content: string
  created_at: string
  updated_at: string
}

export type ConsultationRecord = {
  id: string
  member_id: string
  content: string
  consulted_at: string
  created_at: string
}

export type MemberNote = {
  id: string
  member_id: string
  content: string
  created_at: string
}

export type MemberConsultation = {
  id: string
  member_id: string
  consulted_at: string
  trainer_id: string | null
  trainer_name: string | null
  pain_status: string
  exercise_progress: string
  goals: string
  special_notes: string
  created_at: string
  updated_at: string
}

export type ExerciseJournal = {
  id: string
  member_id: string
  trained_at: string
  title: string | null
  content: string
  created_by: string
  created_at: string
}

export type AttendanceLog = {
  id: string
  member_id: string
  checked_in_at: string
  method: string
}

export type PtSchedule = {
  id: string
  member_id: string
  trainer_id: string | null
  scheduled_at: string
  duration_minutes: number
  status: string
  note: string | null
  created_at: string
  updated_at: string
}

export type Branch = {
  id: string
  name: string
  code: string | null
  is_active: boolean
  created_at: string
}

export type RewardSetting = {
  id: string
  branch_id: string | null
  setting_key: string
  setting_value: Json
  description: string | null
  updated_at: string
}

export type RewardBalance = {
  member_id: string
  branch_id: string | null
  move_score: number
  move_mile: number
  updated_at: string
}

export type RewardTransaction = {
  id: string
  member_id: string
  branch_id: string | null
  currency: 'move_score' | 'move_mile'
  amount: number
  balance_after: number
  event_type: string
  event_key: string | null
  reference_type: string | null
  reference_id: string | null
  note: string | null
  expires_at: string | null
  metadata: Json
  created_by: string | null
  created_at: string
}

export type RewardMileLot = {
  id: string
  member_id: string
  source_transaction_id: string | null
  earned_amount: number
  remaining_amount: number
  expires_at: string
  created_at: string
}

export type MemberDailyActivity = {
  member_id: string
  activity_date: string
  step_count: number
  step_source: string
  has_pt_attendance: boolean
  has_journal: boolean
  metadata: Json
  updated_at: string
}

export type MemberReferralReward = {
  id: string
  referred_member_id: string
  referrer_member_id: string
  payment_id: string | null
  rewarded_at: string
}

export type StepVerificationCode = {
  member_id: string
  code_date: string
  code: string
  created_at: string
}

export type StepVerificationStatus = 'pending' | 'approved' | 'rejected'

export type StepVerification = {
  id: string
  member_id: string
  verification_date: string
  image_url: string
  image_path: string | null
  expected_code: string
  status: StepVerificationStatus
  rejection_reason: string | null
  extracted_step_count: number | null
  extracted_date: string | null
  extracted_time: string | null
  extracted_code: string | null
  ai_confidence: number | null
  ocr_raw_text: string | null
  reviewed_at: string | null
  created_at: string
}

export type MemberInsert = {
  name: string
  phone: string
  total_sessions: number
  remaining_sessions: number
  payment_amount: number
  registered_at: string
  expires_at?: string | null
  trainer_id?: string | null
  trainer_name?: string | null
  referred_by_member_id?: string | null
  status?: MemberStatus
}

export type MemberUpdate = Partial<{
  name: string
  phone: string
  total_sessions: number
  remaining_sessions: number
  payment_amount: number
  registered_at: string
  expires_at: string | null
  trainer_id: string | null
  trainer_name: string | null
  referred_by_member_id: string | null
  status: MemberStatus
  updated_at: string
}>

type TableDef<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      members: TableDef<Member, MemberInsert, MemberUpdate>
      trainers: TableDef<
        Trainer,
        { name: string; is_active?: boolean },
        { name?: string; is_active?: boolean }
      >
      period_extensions: TableDef<
        PeriodExtension,
        { member_id: string; days_added: number; note?: string | null },
        never
      >
      session_logs: TableDef<
        SessionLog,
        {
          member_id: string
          quantity?: number
          remaining_after?: number | null
        },
        never
      >
      payment_history: TableDef<
        PaymentHistory,
        {
          member_id: string
          amount: number
          sessions: number
          paid_at: string
          note?: string | null
        },
        { paid_at?: string; amount?: number }
      >
      member_memos: TableDef<
        MemberMemo,
        { member_id: string; content: string },
        { content?: string; updated_at?: string }
      >
      consultation_records: TableDef<
        ConsultationRecord,
        { member_id: string; content: string; consulted_at: string },
        never
      >
      member_notes: TableDef<
        MemberNote,
        { member_id: string; content: string },
        { content?: string }
      >
      member_consultations: TableDef<
        MemberConsultation,
        {
          member_id: string
          consulted_at: string
          trainer_id?: string | null
          trainer_name?: string | null
          pain_status?: string
          exercise_progress?: string
          goals?: string
          special_notes?: string
        },
        {
          consulted_at?: string
          trainer_id?: string | null
          trainer_name?: string | null
          pain_status?: string
          exercise_progress?: string
          goals?: string
          special_notes?: string
          updated_at?: string
        }
      >
      exercise_journals: TableDef<
        ExerciseJournal,
        {
          member_id: string
          trained_at: string
          title?: string | null
          content: string
          created_by?: string
        },
        {
          trained_at?: string
          title?: string | null
          content?: string
        }
      >
      attendance_logs: TableDef<
        AttendanceLog,
        { member_id: string; method?: string; checked_in_at?: string },
        never
      >
      pt_schedules: TableDef<
        PtSchedule,
        {
          member_id: string
          trainer_id?: string | null
          scheduled_at: string
          duration_minutes?: number
          status?: string
          note?: string | null
        },
        {
          trainer_id?: string | null
          scheduled_at?: string
          duration_minutes?: number
          status?: string
          note?: string | null
          updated_at?: string
        }
      >
      branches: TableDef<
        Branch,
        { name: string; code?: string | null; is_active?: boolean },
        { name?: string; code?: string | null; is_active?: boolean }
      >
      reward_settings: TableDef<
        RewardSetting,
        {
          branch_id?: string | null
          setting_key: string
          setting_value: Json
          description?: string | null
        },
        {
          setting_value?: Json
          description?: string | null
          updated_at?: string
        }
      >
      reward_balances: TableDef<
        RewardBalance,
        {
          member_id: string
          branch_id?: string | null
          move_score?: number
          move_mile?: number
          updated_at?: string
        },
        {
          branch_id?: string | null
          move_score?: number
          move_mile?: number
          updated_at?: string
        }
      >
      reward_transactions: TableDef<
        RewardTransaction,
        {
          member_id: string
          branch_id?: string | null
          currency: 'move_score' | 'move_mile'
          amount: number
          balance_after: number
          event_type: string
          event_key?: string | null
          reference_type?: string | null
          reference_id?: string | null
          note?: string | null
          expires_at?: string | null
          metadata?: Json
          created_by?: string | null
        },
        { expires_at?: string | null }
      >
      reward_mile_lots: TableDef<
        RewardMileLot,
        {
          member_id: string
          source_transaction_id?: string | null
          earned_amount: number
          remaining_amount: number
          expires_at: string
        },
        { remaining_amount?: number }
      >
      member_daily_activity: TableDef<
        MemberDailyActivity,
        {
          member_id: string
          activity_date: string
          step_count?: number
          step_source?: string
          has_pt_attendance?: boolean
          has_journal?: boolean
          metadata?: Json
          updated_at?: string
        },
        {
          step_count?: number
          step_source?: string
          has_pt_attendance?: boolean
          has_journal?: boolean
          metadata?: Json
          updated_at?: string
        }
      >
      member_referral_rewards: TableDef<
        MemberReferralReward,
        {
          referred_member_id: string
          referrer_member_id: string
          payment_id?: string | null
        },
        never
      >
      step_verification_codes: TableDef<
        StepVerificationCode,
        { member_id: string; code_date: string; code: string },
        never
      >
      step_verifications: TableDef<
        StepVerification,
        {
          member_id: string
          verification_date?: string
          image_url: string
          image_path?: string | null
          expected_code: string
          status?: StepVerificationStatus
          rejection_reason?: string | null
          extracted_step_count?: number | null
          extracted_date?: string | null
          extracted_time?: string | null
          extracted_code?: string | null
          ai_confidence?: number | null
          ocr_raw_text?: string | null
          reviewed_at?: string | null
        },
        {
          status?: StepVerificationStatus
          rejection_reason?: string | null
          extracted_step_count?: number | null
          extracted_date?: string | null
          extracted_time?: string | null
          extracted_code?: string | null
          ai_confidence?: number | null
          ocr_raw_text?: string | null
          reviewed_at?: string | null
        }
      >
      admin_users: TableDef<
        AdminUser,
        { username: string; password_hash: string },
        never
      >
      member_credentials: TableDef<
        MemberCredential,
        { member_id: string; password_hash: string },
        { password_hash?: string; updated_at?: string }
      >
    }
    Views: Record<string, never>
    Functions: {
      verify_admin_login: {
        Args: {
          p_username: string
          p_password: string
        }
        Returns: Json
      }
      verify_member_login: {
        Args: {
          p_phone: string
          p_password: string
        }
        Returns: Json
      }
      change_member_password: {
        Args: {
          p_phone: string
          p_old_password: string
          p_new_password: string
        }
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
