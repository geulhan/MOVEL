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

export type TrainerSettlementMode = 'percent' | 'fixed'

export type Trainer = {
  id: string
  name: string
  is_active: boolean
  settlement_mode: TrainerSettlementMode
  settlement_rate: number | null
  settlement_fixed_amount: number | null
  center_id?: string
  created_at: string
}

export type BetaCenterType = 'pt' | 'pilates' | 'freelance' | 'other'

export type BetaApplication = {
  id: string
  center_name: string
  contact_name: string
  phone: string
  email: string | null
  center_type: BetaCenterType
  message: string | null
  created_at: string
}

export type AdminRole = 'admin' | 'trainer'

export type AdminUser = {
  id: string
  username: string
  password_hash: string
  role: AdminRole
  trainer_id: string | null
  center_id?: string
  created_at: string
}

export type CenterStatus = 'active' | 'inactive' | 'suspended'

export type Center = {
  id: string
  name: string
  slug: string
  status: CenterStatus
  logo_url?: string | null
  settings?: Json | null
  service_starts_at?: string | null
  service_ends_at?: string | null
  operational_type?: string
  created_at: string
  updated_at: string
}

export type CenterFeatureRow = {
  center_id: string
  feature_key: string
  enabled: boolean
  config: Json
  updated_at: string
}

export type MemberCredential = {
  member_id: string
  password_hash: string
  center_id?: string
  updated_at: string
}

export type Member = {
  id: string
  center_id?: string
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
  center_id?: string
  days_added: number
  note: string | null
  created_at: string
}

export type PaymentHistorySource = 'admin' | 'payment_request' | 'pg'

export type PaymentCategory =
  | 'pt'
  | 'pilates'
  | 'yoga'
  | 'gx'
  | 'group_pt'
  | 'center_pass'
  | 'locker_towel'

export type PaymentHistory = {
  id: string
  center_id?: string
  member_id: string
  amount: number
  sessions: number
  paid_at: string
  note: string | null
  category?: PaymentCategory
  source?: PaymentHistorySource
  payment_request_id?: string | null
  created_at: string
}

export type PaymentRequestStatus = 'pending' | 'paid' | 'cancelled' | 'expired'

export type PaymentRequest = {
  id: string
  center_id?: string
  member_id: string
  status: PaymentRequestStatus
  category: PaymentCategory
  package_id: string | null
  label: string
  sessions: number | null
  duration_days: number | null
  starts_at: string | null
  list_amount: number
  amount: number
  discount_amount: number
  discount_note: string | null
  note: string | null
  payment_history_id: string | null
  pg_provider: string | null
  pg_order_id: string | null
  pg_payment_key: string | null
  expires_at: string | null
  paid_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type ContractType = 'pt_purchase' | 'center_pass_purchase'

export type ContractStatus = 'pending_signature' | 'signed' | 'cancelled'

export type ContractInstanceRow = {
  id: string
  payment_request_id: string
  member_id: string
  center_id: string
  contract_type: ContractType
  status: ContractStatus
  field_data: Json
  terms_accepted: Json
  signature_path: string | null
  signed_at: string | null
  created_at: string
  updated_at: string
}

export type MessageTemplateKey =
  | 'member_signup_guide'
  | 'payment_completed'
  | 'schedule_reminder'
  | 'pt_remaining_3'
  | 'pt_remaining_1'
  | 'membership_expire_14'
  | 'membership_expire_7'
  | 'membership_expire_today'
  | 'schedule_changed'
  | 'schedule_cancelled'
  | 'center_welcome'
  | 'weekly_report'
  | 'step_verification_result'
  /** @deprecated 레거시 이력 호환 */
  | 'member_welcome'
  /** @deprecated 레거시 이력 호환 */
  | 'welcome'
  /** @deprecated 레거시 이력 호환 */
  | 'payment_done'
  /** @deprecated 레거시 이력 호환 */
  | 'renewal'
  /** @deprecated 레거시 이력 호환 */
  | 'pt_reminder'

export type MessageLogStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export type MessageLogChannel = 'alimtalk' | 'sms' | 'skipped'

export const MESSAGE_TEMPLATE_LABELS: Record<MessageTemplateKey, string> = {
  member_signup_guide: '회원가입 안내',
  payment_completed: '결제 완료',
  schedule_reminder: '수업 리마인더',
  pt_remaining_3: 'PT 잔여 3회 알림',
  pt_remaining_1: 'PT 잔여 1회 알림',
  membership_expire_14: '회원권 만료 14일 전',
  membership_expire_7: '회원권 만료 7일 전',
  membership_expire_today: '회원권 만료 당일',
  schedule_changed: '예약 변경',
  schedule_cancelled: '예약 취소',
  center_welcome: '센터 가입 축하',
  weekly_report: '모션허브 주간 리포트',
  step_verification_result: '만보 인증 결과',
  member_welcome: '회원 등록 완료 (레거시)',
  welcome: '신규 가입 환영 (레거시)',
  payment_done: '결제 완료 (레거시)',
  renewal: '갱신 안내 (레거시)',
  pt_reminder: 'PT 예약 리마인더 (레거시)',
}

export const MESSAGE_STATUS_LABELS: Record<MessageLogStatus, string> = {
  pending: '대기',
  sent: '발송 완료',
  failed: '실패',
  skipped: '생략',
}

export type MessageLog = {
  id: string
  center_id?: string
  member_id: string | null
  phone: string
  template_key: MessageTemplateKey
  channel: MessageLogChannel | null
  status: MessageLogStatus
  provider_message_id: string | null
  error_message: string | null
  variables: Json
  metadata: Json
  created_at: string
  sent_at: string | null
}

export type MemberLoginLog = {
  id: string
  center_id: string
  member_id: string
  login_at: string
  device_type: string
  created_at: string
}

export type SessionLog = {
  id: string
  center_id?: string
  member_id: string
  deducted_at: string
  quantity: number
  remaining_after: number | null
  schedule_id?: string | null
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
  center_id?: string
  member_id: string
  content: string
  created_at: string
}

export type MemberConsultation = {
  id: string
  center_id?: string
  member_id: string
  consulted_at: string
  trainer_id: string | null
  trainer_name: string | null
  visit_purpose: string
  occupation_work_pattern: string
  sitting_activity_time: string
  current_discomfort: string
  injury_treatment_history: string
  sleep_diet: string
  exercise_experience: string
  posture_assessment: string
  movement_assessment: string
  pain_status: string
  exercise_progress: string
  goals: string
  special_notes: string
  created_at: string
  updated_at: string
}

export type ExerciseJournal = {
  id: string
  center_id?: string
  member_id: string
  trained_at: string
  title: string | null
  content: string
  created_by: string
  image_urls: string[]
  created_at: string
}

export type InbodyCreatedBy = 'member' | 'trainer' | 'admin'

export type InbodyRecord = {
  id: string
  member_id: string
  center_id?: string
  measured_at: string
  weight_kg: number
  skeletal_muscle_kg: number
  body_fat_kg: number
  created_by: InbodyCreatedBy
  created_at: string
}

export type AttendanceLog = {
  id: string
  center_id?: string
  member_id: string
  checked_in_at: string
  method: string
  schedule_id?: string | null
}

export type PtSchedule = {
  id: string
  center_id?: string
  member_id: string
  trainer_id: string | null
  scheduled_at: string
  duration_minutes: number
  status: string
  note: string | null
  fixed_schedule_id?: string | null
  is_detached?: boolean
  created_at: string
  updated_at: string
}

export type PtFixedSchedule = {
  id: string
  center_id: string
  member_id: string
  trainer_id: string | null
  day_of_week: number
  days_of_week?: number[] | null
  time_of_day: string
  day_times?: Record<string, string> | null
  duration_minutes: number
  note: string | null
  is_active: boolean
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
  center_id?: string
  setting_key: string
  setting_value: Json
  description: string | null
  updated_at: string
}

export type RewardBalance = {
  member_id: string
  center_id?: string
  branch_id: string | null
  move_score: number
  move_mile: number
  updated_at: string
}

export type RewardTransaction = {
  id: string
  center_id?: string
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
  center_id?: string
  source_transaction_id: string | null
  earned_amount: number
  remaining_amount: number
  expires_at: string
  created_at: string
}

export type MemberDailyActivity = {
  member_id: string
  center_id?: string
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
  center_id?: string
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

export type CenterPhotoStatus = 'pending' | 'approved' | 'rejected'

export type CenterPhotoSubmission = {
  id: string
  member_id: string
  center_id?: string
  submission_date: string
  image_url: string
  image_path: string | null
  status: CenterPhotoStatus
  rejection_reason: string | null
  mile_awarded: number
  reviewed_at: string | null
  created_at: string
}

export type CenterPassStatus = 'scheduled' | 'active' | 'expired' | 'cancelled'

export type CenterPassProduct = {
  id: string
  label: string
  duration_days: number
  list_amount: number
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type CenterPass = {
  id: string
  member_id: string
  center_id?: string
  product_id: string | null
  label: string
  starts_at: string
  ends_at: string
  status: CenterPassStatus
  amount: number | null
  note: string | null
  payment_history_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type FacilitySubType = 'locker' | 'towel' | 'bundle'

export type FacilityProduct = {
  id: string
  label: string
  sub_type: FacilitySubType
  duration_days: number
  list_amount: number
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type FacilitySubscriptionStatus =
  | 'scheduled'
  | 'active'
  | 'expired'
  | 'cancelled'

export type MemberFacilitySubscription = {
  id: string
  member_id: string
  center_id?: string
  product_id: string | null
  label: string
  sub_type: FacilitySubType
  starts_at: string
  ends_at: string
  status: FacilitySubscriptionStatus
  amount: number | null
  note: string | null
  payment_history_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type MemberInsert = {
  center_id?: string
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
      centers: TableDef<
        Center,
        {
          name: string
          slug: string
          status?: CenterStatus
        },
        {
          name?: string
          slug?: string
          status?: CenterStatus
          updated_at?: string
        }
      >
      center_features: TableDef<
        CenterFeatureRow,
        {
          center_id: string
          feature_key: string
          enabled?: boolean
          config?: Json
        },
        {
          enabled?: boolean
          config?: Json
          updated_at?: string
        }
      >
      trainers: TableDef<
        Trainer,
        {
          name: string
          is_active?: boolean
          center_id?: string
          settlement_mode?: TrainerSettlementMode
          settlement_rate?: number | null
          settlement_fixed_amount?: number | null
        },
        {
          name?: string
          is_active?: boolean
          center_id?: string
          settlement_mode?: TrainerSettlementMode
          settlement_rate?: number | null
          settlement_fixed_amount?: number | null
        }
      >
      period_extensions: TableDef<
        PeriodExtension,
        {
          member_id: string
          center_id: string
          days_added: number
          note?: string | null
        },
        never
      >
      session_logs: TableDef<
        SessionLog,
        {
          center_id?: string
          member_id: string
          quantity?: number
          remaining_after?: number | null
          schedule_id?: string | null
        },
        never
      >
      payment_history: TableDef<
        PaymentHistory,
        {
          center_id?: string
          member_id: string
          amount: number
          sessions: number
          paid_at: string
          note?: string | null
          category?: PaymentCategory
          source?: PaymentHistorySource
          payment_request_id?: string | null
        },
        {
          paid_at?: string
          amount?: number
          sessions?: number
          note?: string | null
          category?: PaymentCategory
          source?: PaymentHistorySource
          payment_request_id?: string | null
        }
      >
      payment_requests: TableDef<
        PaymentRequest,
        {
          center_id?: string
          member_id: string
          status?: PaymentRequestStatus
          category?: PaymentCategory
          package_id?: string | null
          label: string
          sessions?: number | null
          duration_days?: number | null
          starts_at?: string | null
          list_amount: number
          amount: number
          discount_amount?: number
          discount_note?: string | null
          note?: string | null
          payment_history_id?: string | null
          pg_provider?: string | null
          pg_order_id?: string | null
          pg_payment_key?: string | null
          expires_at?: string | null
          paid_at?: string | null
          created_by?: string
        },
        {
          status?: PaymentRequestStatus
          payment_history_id?: string | null
          pg_provider?: string | null
          pg_order_id?: string | null
          pg_payment_key?: string | null
          expires_at?: string | null
          paid_at?: string | null
          updated_at?: string
        }
      >
      contract_instances: TableDef<
        ContractInstanceRow,
        {
          payment_request_id: string
          member_id: string
          center_id?: string
          contract_type: ContractType
          status?: ContractStatus
          field_data?: Json
          terms_accepted?: Json
          signature_path?: string | null
          signed_at?: string | null
        },
        {
          status?: ContractStatus
          field_data?: Json
          terms_accepted?: Json
          signature_path?: string | null
          signed_at?: string | null
          updated_at?: string
        }
      >
      message_logs: TableDef<
        MessageLog,
        {
          center_id?: string
          member_id?: string | null
          phone: string
          template_key: MessageTemplateKey
          channel?: MessageLogChannel | null
          status?: MessageLogStatus
          provider_message_id?: string | null
          error_message?: string | null
          variables?: Json
          metadata?: Json
          sent_at?: string | null
        },
        {
          channel?: MessageLogChannel | null
          status?: MessageLogStatus
          provider_message_id?: string | null
          error_message?: string | null
          metadata?: Json
          variables?: Json
          sent_at?: string | null
        }
      >
      member_login_logs: TableDef<
        MemberLoginLog,
        {
          center_id: string
          member_id: string
          login_at?: string
          device_type?: string
        },
        never
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
        { center_id?: string; member_id: string; content: string },
        { content?: string }
      >
      member_consultations: TableDef<
        MemberConsultation,
        {
          center_id?: string
          member_id: string
          consulted_at: string
          trainer_id?: string | null
          trainer_name?: string | null
          visit_purpose?: string
          occupation_work_pattern?: string
          sitting_activity_time?: string
          current_discomfort?: string
          injury_treatment_history?: string
          sleep_diet?: string
          exercise_experience?: string
          posture_assessment?: string
          movement_assessment?: string
          pain_status?: string
          exercise_progress?: string
          goals?: string
          special_notes?: string
        },
        {
          consulted_at?: string
          trainer_id?: string | null
          trainer_name?: string | null
          visit_purpose?: string
          occupation_work_pattern?: string
          sitting_activity_time?: string
          current_discomfort?: string
          injury_treatment_history?: string
          sleep_diet?: string
          exercise_experience?: string
          posture_assessment?: string
          movement_assessment?: string
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
          center_id?: string
          member_id: string
          trained_at: string
          title?: string | null
          content: string
          created_by?: string
          image_urls?: string[]
        },
        {
          trained_at?: string
          title?: string | null
          content?: string
          image_urls?: string[]
        }
      >
      member_inbody_records: TableDef<
        InbodyRecord,
        {
          member_id: string
          center_id?: string
          measured_at: string
          weight_kg: number
          skeletal_muscle_kg: number
          body_fat_kg: number
          created_by?: InbodyCreatedBy
        },
        {
          measured_at?: string
          weight_kg?: number
          skeletal_muscle_kg?: number
          body_fat_kg?: number
          created_by?: InbodyCreatedBy
        }
      >
      attendance_logs: TableDef<
        AttendanceLog,
        {
          center_id?: string
          member_id: string
          method?: string
          checked_in_at?: string
          schedule_id?: string | null
        },
        never
      >
      pt_schedules: TableDef<
        PtSchedule,
        {
          center_id?: string
          member_id: string
          trainer_id?: string | null
          scheduled_at: string
          duration_minutes?: number
          status?: string
          note?: string | null
          fixed_schedule_id?: string | null
          is_detached?: boolean
        },
        {
          trainer_id?: string | null
          scheduled_at?: string
          duration_minutes?: number
          status?: string
          note?: string | null
          fixed_schedule_id?: string | null
          is_detached?: boolean
          updated_at?: string
        }
      >
      pt_fixed_schedules: TableDef<
        PtFixedSchedule,
        {
          center_id: string
          member_id: string
          trainer_id?: string | null
          day_of_week: number
          days_of_week?: number[] | null
          time_of_day: string
          day_times?: Record<string, string> | null
          duration_minutes?: number
          note?: string | null
          is_active?: boolean
        },
        {
          trainer_id?: string | null
          day_of_week?: number
          days_of_week?: number[] | null
          time_of_day?: string
          day_times?: Record<string, string> | null
          duration_minutes?: number
          note?: string | null
          is_active?: boolean
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
          center_id?: string
          setting_key: string
          setting_value: Json
          description?: string | null
        },
        {
          setting_value?: Json
          description?: string | null
          updated_at?: string
          branch_id?: string | null
        }
      >
      reward_balances: TableDef<
        RewardBalance,
        {
          center_id?: string
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
          center_id?: string
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
          center_id: string
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
          center_id: string
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
          center_id?: string
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
      center_photo_submissions: TableDef<
        CenterPhotoSubmission,
        {
          member_id: string
          center_id: string
          submission_date?: string
          image_url: string
          image_path?: string | null
          status?: CenterPhotoStatus
          rejection_reason?: string | null
          mile_awarded?: number
          reviewed_at?: string | null
        },
        {
          status?: CenterPhotoStatus
          rejection_reason?: string | null
          mile_awarded?: number
          reviewed_at?: string | null
        }
      >
      facility_products: TableDef<
        FacilityProduct,
        {
          label: string
          sub_type?: FacilitySubType
          duration_days: number
          list_amount?: number
          description?: string | null
          is_active?: boolean
          sort_order?: number
        },
        {
          label?: string
          sub_type?: FacilitySubType
          duration_days?: number
          list_amount?: number
          description?: string | null
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
      >
      member_facility_subscriptions: TableDef<
        MemberFacilitySubscription,
        {
          member_id: string
          center_id?: string
          product_id?: string | null
          label: string
          sub_type?: FacilitySubType
          starts_at: string
          ends_at: string
          status?: FacilitySubscriptionStatus
          amount?: number | null
          note?: string | null
          payment_history_id?: string | null
          created_by?: string
        },
        {
          product_id?: string | null
          label?: string
          sub_type?: FacilitySubType
          starts_at?: string
          ends_at?: string
          status?: FacilitySubscriptionStatus
          amount?: number | null
          note?: string | null
          payment_history_id?: string | null
          updated_at?: string
        }
      >
      center_pass_products: TableDef<
        CenterPassProduct,
        {
          label: string
          duration_days: number
          list_amount?: number
          description?: string | null
          is_active?: boolean
          sort_order?: number
        },
        {
          label?: string
          duration_days?: number
          list_amount?: number
          description?: string | null
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
      >
      center_passes: TableDef<
        CenterPass,
        {
          member_id: string
          center_id?: string
          product_id?: string | null
          label: string
          starts_at: string
          ends_at: string
          status?: CenterPassStatus
          amount?: number | null
          note?: string | null
          payment_history_id?: string | null
          created_by?: string
        },
        {
          product_id?: string | null
          label?: string
          starts_at?: string
          ends_at?: string
          status?: CenterPassStatus
          amount?: number | null
          note?: string | null
          payment_history_id?: string | null
          updated_at?: string
        }
      >
      beta_applications: TableDef<
        BetaApplication,
        {
          center_name: string
          contact_name: string
          phone: string
          email?: string | null
          center_type: BetaCenterType
          message?: string | null
        },
        never
      >
      consultation_leads: TableDef<
        Record<string, unknown>,
        Record<string, unknown>,
        Record<string, unknown>
      >
      lead_activities: TableDef<
        Record<string, unknown>,
        Record<string, unknown>,
        Record<string, unknown>
      >
      admin_users: TableDef<
        AdminUser,
        {
          username: string
          password_hash: string
          role?: AdminRole
          trainer_id?: string | null
        },
        { role?: AdminRole; trainer_id?: string | null }
      >
      member_credentials: TableDef<
        MemberCredential,
        { member_id: string; password_hash: string },
        { password_hash?: string; updated_at?: string }
      >
      classes: TableDef<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>
      class_schedules: TableDef<
        Record<string, unknown>,
        Record<string, unknown>,
        Record<string, unknown>
      >
      class_fixed_schedules: TableDef<
        {
          id: string
          center_id: string
          class_id: string
          day_of_week: number
          days_of_week: number[] | null
          time_of_day: string
          day_times?: Record<string, string> | null
          capacity: number | null
          weeks_ahead: number
          note: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        },
        {
          center_id: string
          class_id: string
          day_of_week: number
          days_of_week?: number[] | null
          time_of_day: string
          day_times?: Record<string, string> | null
          capacity?: number | null
          weeks_ahead?: number
          note?: string | null
          is_active?: boolean
        },
        {
          day_of_week?: number
          days_of_week?: number[] | null
          time_of_day?: string
          day_times?: Record<string, string> | null
          capacity?: number | null
          weeks_ahead?: number
          note?: string | null
          is_active?: boolean
          updated_at?: string
        }
      >
      class_reservations: TableDef<
        Record<string, unknown>,
        Record<string, unknown>,
        Record<string, unknown>
      >
      class_attendance: TableDef<
        Record<string, unknown>,
        Record<string, unknown>,
        Record<string, unknown>
      >
      member_session_passes: TableDef<
        Record<string, unknown>,
        Record<string, unknown>,
        Record<string, unknown>
      >
      locker_assignments: TableDef<
        Record<string, unknown>,
        Record<string, unknown>,
        Record<string, unknown>
      >
      towel_rentals: TableDef<
        Record<string, unknown>,
        Record<string, unknown>,
        Record<string, unknown>
      >
      facility_checkins: TableDef<
        Record<string, unknown>,
        Record<string, unknown>,
        Record<string, unknown>
      >
      center_challenges: TableDef<
        Record<string, unknown>,
        Record<string, unknown>,
        Record<string, unknown>
      >
      seasons: TableDef<
        Record<string, unknown>,
        Record<string, unknown>,
        Record<string, unknown>
      >
    }
    Views: Record<string, never>
    Functions: {
      verify_platform_admin_login: {
        Args: {
          p_username: string
          p_password: string
        }
        Returns: Json
      }
      verify_admin_login: {
        Args: {
          p_username: string
          p_password: string
          p_center_slug?: string
        }
        Returns: Json
      }
      list_centers_for_platform: {
        Args: {
          p_session_token: string
        }
        Returns: Json
      }
      list_signup_centers: {
        Args: Record<string, never>
        Returns: Json
      }
      create_center: {
        Args: {
          p_session_token: string
          p_name: string
          p_slug: string
          p_admin_username: string
          p_admin_password: string
          p_plan_code?: string
          p_contact_email?: string | null
          p_contact_phone?: string | null
          p_service_starts_at?: string | null
          p_service_ends_at?: string | null
          p_operational_type?: string | null
        }
        Returns: Json
      }
      update_center_operational_features: {
        Args: {
          p_session_token: string
          p_features: Json
        }
        Returns: Json
      }
      suspend_center: {
        Args: {
          p_session_token: string
          p_center_id: string
        }
        Returns: Json
      }
      delete_center: {
        Args: {
          p_session_token: string
          p_center_id: string
          p_confirm_slug: string
        }
        Returns: Json
      }
      get_center_message_dashboard: {
        Args: { p_session_token: string }
        Returns: Json
      }
      update_center_notifications_enabled: {
        Args: { p_session_token: string; p_enabled: boolean }
        Returns: Json
      }
      list_center_message_credits_for_platform: {
        Args: { p_session_token: string }
        Returns: Json
      }
      grant_center_message_credits_platform: {
        Args: {
          p_session_token: string
          p_center_id: string
          p_amount: number
          p_description?: string | null
        }
        Returns: Json
      }
      get_center_messaging_settings: {
        Args: { p_session_token: string }
        Returns: Json
      }
      update_center_messaging_settings: {
        Args: {
          p_session_token: string
          p_config: Json
          p_api_key?: string | null
          p_api_secret?: string | null
          p_clear_api_keys?: boolean
        }
        Returns: Json
      }
      update_center_branding: {
        Args: {
          p_session_token: string
          p_theme?: Json | null
          p_logo_url?: string | null
          p_clear_logo?: boolean
        }
        Returns: Json
      }
      update_center_features: {
        Args: {
          p_session_token: string
          p_center_id: string
          p_features: Json
        }
        Returns: Json
      }
      update_center_service_period: {
        Args: {
          p_session_token: string
          p_center_id: string
          p_service_starts_at?: string | null
          p_service_ends_at?: string | null
          p_reactivate?: boolean
        }
        Returns: Json
      }
      self_register_center: {
        Args: {
          p_name: string
          p_slug: string
          p_admin_username: string
          p_admin_password: string
          p_contact_email?: string | null
          p_contact_phone?: string | null
          p_agree_age?: boolean
          p_agree_terms?: boolean
          p_agree_privacy?: boolean
          p_agree_marketing?: boolean
          p_desired_service_starts_at?: string | null
        }
        Returns: Json
      }
      list_center_users_for_platform: {
        Args: {
          p_session_token: string
          p_center_id: string
        }
        Returns: Json
      }
      reset_center_user_password_platform: {
        Args: {
          p_session_token: string
          p_center_user_id: string
        }
        Returns: Json
      }
      update_center_user_phone_platform: {
        Args: {
          p_session_token: string
          p_center_user_id: string
          p_phone: string
        }
        Returns: Json
      }
      list_signup_consents_for_platform: {
        Args: {
          p_session_token: string
        }
        Returns: Json
      }
      list_beta_applications_for_platform: {
        Args: {
          p_session_token: string
        }
        Returns: Json
      }
      purge_expired_consultation_leads: {
        Args: {
          p_center_id?: string | null
        }
        Returns: number
      }
      list_trainer_admin_accounts: {
        Args: {
          p_session_token: string
          p_center_id?: string | null
        }
        Returns: Json
      }
      upsert_trainer_admin_account: {
        Args: {
          p_session_token: string
          p_trainer_id: string
          p_username: string
          p_password: string
        }
        Returns: Json
      }
      delete_trainer_admin_account: {
        Args: {
          p_session_token: string
          p_trainer_id: string
        }
        Returns: Json
      }
      log_member_session_visit: {
        Args: {
          p_member_id: string
          p_device_type?: string
        }
        Returns: undefined
      }
      verify_member_login: {
        Args: {
          p_phone: string
          p_password: string
          p_device_type?: string
          p_center_slug?: string
        }
        Returns: Json
      }
      change_member_password: {
        Args: {
          p_phone: string
          p_old_password: string
          p_new_password: string
          p_center_slug?: string
        }
        Returns: Json
      }
      register_member: {
        Args: {
          p_name: string
          p_phone: string
          p_password: string
          p_device_type?: string
          p_center_slug?: string
          p_agree_age?: boolean
          p_agree_terms?: boolean
          p_agree_privacy?: boolean
          p_agree_marketing?: boolean
        }
        Returns: Json
      }
      find_member_by_phone_in_center: {
        Args: {
          p_center_id: string
          p_phone: string
        }
        Returns: string | null
      }
      reset_member_password_to_default: {
        Args: {
          p_session_token: string
          p_member_id: string
        }
        Returns: Json
      }
      deactivate_trainer: {
        Args: {
          p_trainer_id: string
        }
        Returns: Json
      }
      log_platform_activity: {
        Args: {
          p_center_id: string
          p_action: string
          p_actor_type?: string
          p_actor_id?: string | null
          p_metadata?: Json
        }
        Returns: Json
      }
      submit_platform_feedback: {
        Args: {
          p_center_id: string
          p_created_by: string
          p_created_by_type: string
          p_type: string
          p_title: string
          p_content: string
        }
        Returns: Json
      }
      list_platform_feedback_for_platform: {
        Args: {
          p_session_token: string
          p_type?: string | null
          p_status?: string | null
        }
        Returns: Json
      }
      update_platform_feedback_status: {
        Args: {
          p_session_token: string
          p_feedback_id: string
          p_status: string
        }
        Returns: Json
      }
      get_platform_dashboard_snapshot: {
        Args: {
          p_session_token: string
        }
        Returns: Json
      }
      get_center_detail_for_platform: {
        Args: {
          p_session_token: string
          p_center_id: string
        }
        Returns: Json
      }
      get_platform_analytics: {
        Args: {
          p_session_token: string
        }
        Returns: Json
      }
      list_beta_centers_for_platform: {
        Args: {
          p_session_token: string
        }
        Returns: Json
      }
      sync_center_challenges_for_member: {
        Args: { p_member_id: string }
        Returns: Json
      }
      get_growth_profile: {
        Args: { p_member_id: string }
        Returns: Json
      }
      mark_growth_notifications_read: {
        Args: { p_member_id: string }
        Returns: undefined
      }
      post_growth_event_for_member: {
        Args: {
          p_member_id: string
          p_event_type: string
          p_event_key: string
          p_source?: string | null
        }
        Returns: Json
      }
      get_garden_state: {
        Args: { p_member_id: string }
        Returns: Json
      }
      purchase_garden_shop_item: {
        Args: { p_member_id: string; p_shop_item_id: string }
        Returns: Json
      }
      place_garden_item: {
        Args: {
          p_member_id: string
          p_shop_item_id: string
          p_x: number
          p_y: number
        }
        Returns: Json
      }
      move_garden_item: {
        Args: {
          p_member_id: string
          p_placement_id: string
          p_x: number
          p_y: number
        }
        Returns: Json
      }
      retrieve_garden_item: {
        Args: { p_member_id: string; p_placement_id: string }
        Returns: Json
      }
      seed_season_default_rewards: {
        Args: { p_season_id: string }
        Returns: undefined
      }
      get_season_pass_state: {
        Args: { p_member_id: string }
        Returns: Json
      }
      claim_season_reward: {
        Args: { p_member_id: string; p_season_reward_id: string }
        Returns: Json
      }
      get_slg_village_state: {
        Args: { p_member_id: string }
        Returns: Json
      }
      collect_slg_village_production: {
        Args: { p_member_id: string }
        Returns: Json
      }
      purchase_slg_building: {
        Args: { p_member_id: string; p_building_id: string }
        Returns: Json
      }
      place_slg_building: {
        Args: {
          p_member_id: string
          p_building_id: string
          p_x: number
          p_y: number
        }
        Returns: Json
      }
      move_slg_building: {
        Args: {
          p_member_id: string
          p_placement_id: string
          p_x: number
          p_y: number
        }
        Returns: Json
      }
      retrieve_slg_building: {
        Args: { p_member_id: string; p_placement_id: string }
        Returns: Json
      }
      build_slg_village_slot: {
        Args: { p_member_id: string; p_slot_key: string }
        Returns: Json
      }
      upgrade_slg_village_slot: {
        Args: { p_member_id: string; p_slot_key: string }
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
