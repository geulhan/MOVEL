# MotionHub 알림톡 템플릿 12종 반영 준비 보고서

카카오 비즈니스 채널 승인 및 템플릿 검수 대기 상태에서, 코드 구조·설정·Edge Function 분리를 선반영한 작업 요약입니다.

---

## 1. 수정 파일 목록

### Supabase Edge Functions (신규·수정)

| 파일 | 변경 내용 |
|------|-----------|
| `supabase/functions/_shared/alimtalkTemplateRegistry.ts` | **신규** — 12종 템플릿 키·Secrets 매핑·레거시 alias |
| `supabase/functions/_shared/notificationAuth.ts` | **신규** — Edge Function 공통 인증 |
| `supabase/functions/_shared/centerRecipients.ts` | **신규** — 센터 관리자 전화번호 조회 |
| `supabase/functions/_shared/templates.ts` | 템플릿별 변수 매핑 (`centerName`, `memberName`, …) |
| `supabase/functions/_shared/notifications.ts` | 회원/센터 발송 분리, dedup, `missing_template_id` 스킵 |
| `supabase/functions/_shared/solapi.ts` | 플랫폼 Secrets 기반 template ID 로드 |
| `supabase/functions/_shared/centerMessaging.ts` | 공용 채널만 사용 (센터별 템플릿 ID 오버라이드 제외) |
| `supabase/functions/send-notification/index.ts` | `templateKey` 정규화, 센터/회원 라우팅 |
| `supabase/functions/pt-reminders/index.ts` | `pt_remaining_3`, `pt_remaining_1` |
| `supabase/functions/renewal-reminders/index.ts` | `membership_expire_14/7/today` (D-14, D-7, 당일) |
| `supabase/functions/schedule-reminders/index.ts` | **신규** — `schedule_reminder` (24h 전) |
| `supabase/functions/weekly-center-report/index.ts` | **신규** — `weekly_report` |

### DB·설정

| 파일 | 변경 내용 |
|------|-----------|
| `supabase/migration_094_alimtalk_template_keys.sql` | **신규** — `template_key` CHECK 확장, dedup 인덱스 |
| `supabase/config.toml` | `schedule-reminders`, `weekly-center-report` JWT 비활성 |

### 프론트엔드

| 파일 | 변경 내용 |
|------|-----------|
| `src/types/database.ts` | `MessageTemplateKey` 12종 + 레거시 |
| `src/constants/alimtalkTemplates.ts` | 템플릿 예시·Secrets 키명 |
| `src/api/notifications.ts` | 신규 키 사용, 센터/스케줄 헬퍼 추가 |

> **후속 작업 (이번 범위 외):** `src/api/messageCampaigns.ts`, `MessagesPage.tsx` 등 관리자 캠페인 UI는 레거시 키를 사용 중입니다. Edge Function에서 레거시 alias(`welcome` → `member_welcome` 등)로 호환되지만, UI 마이그레이션은 별도 작업을 권장합니다.

---

## 2. 필요한 Supabase Secrets 목록

기존 Solapi 공통 설정과 함께 아래 12개를 등록합니다. **승인 전에는 빈 값으로 두면 발송하지 않고 `message_logs`에 `skipped` + `missing_template_id`로 기록됩니다.**

### Solapi 공통 (기존)

| Secret | 설명 |
|--------|------|
| `SOLAPI_API_KEY` | Solapi API Key |
| `SOLAPI_API_SECRET` | Solapi API Secret |
| `SOLAPI_PF_ID` | 카카오 채널 PF ID |
| `SOLAPI_FROM_NUMBER` | 발신번호 |
| `MESSAGING_ENABLED` | `true` 시 발송 활성화 |
| `SITE_URL` | 회원 포털 URL (기본 `https://motionhub.kr`) |
| `NOTIFICATION_INTERNAL_SECRET` | Edge Function 호출 키 (`x-mobel-notification-key`) |

### 템플릿 ID (신규 12종)

| Secret | 템플릿 키 |
|--------|-----------|
| `SOLAPI_TEMPLATE_MEMBER_WELCOME` | `member_welcome` |
| `SOLAPI_TEMPLATE_PAYMENT_COMPLETED` | `payment_completed` |
| `SOLAPI_TEMPLATE_SCHEDULE_REMINDER` | `schedule_reminder` |
| `SOLAPI_TEMPLATE_PT_REMAINING_3` | `pt_remaining_3` |
| `SOLAPI_TEMPLATE_PT_REMAINING_1` | `pt_remaining_1` |
| `SOLAPI_TEMPLATE_MEMBERSHIP_EXPIRE_14` | `membership_expire_14` |
| `SOLAPI_TEMPLATE_MEMBERSHIP_EXPIRE_7` | `membership_expire_7` |
| `SOLAPI_TEMPLATE_MEMBERSHIP_EXPIRE_TODAY` | `membership_expire_today` |
| `SOLAPI_TEMPLATE_SCHEDULE_CHANGED` | `schedule_changed` |
| `SOLAPI_TEMPLATE_SCHEDULE_CANCELLED` | `schedule_cancelled` |
| `SOLAPI_TEMPLATE_CENTER_WELCOME` | `center_welcome` |
| `SOLAPI_TEMPLATE_WEEKLY_REPORT` | `weekly_report` |

### 기타 (12종 외)

| Secret | 템플릿 키 |
|--------|-----------|
| `SOLAPI_TEMPLATE_STEP_RESULT` | `step_verification_result` (만보 인증) |

---

## 3. 템플릿 키 매핑표

| 템플릿 키 | 한글명 | Supabase Secret | 수신 대상 | 크레딧 |
|-----------|--------|-----------------|-----------|--------|
| `member_welcome` | 회원 등록 완료 | `SOLAPI_TEMPLATE_MEMBER_WELCOME` | 회원 | 센터 차감 |
| `payment_completed` | 결제 완료 | `SOLAPI_TEMPLATE_PAYMENT_COMPLETED` | 회원 | 센터 차감 |
| `schedule_reminder` | 수업 리마인더 | `SOLAPI_TEMPLATE_SCHEDULE_REMINDER` | 회원 | 센터 차감 |
| `pt_remaining_3` | PT 잔여 3회 | `SOLAPI_TEMPLATE_PT_REMAINING_3` | 회원 | 센터 차감 |
| `pt_remaining_1` | PT 잔여 1회 | `SOLAPI_TEMPLATE_PT_REMAINING_1` | 회원 | 센터 차감 |
| `membership_expire_14` | 만료 14일 전 | `SOLAPI_TEMPLATE_MEMBERSHIP_EXPIRE_14` | 회원 | 센터 차감 |
| `membership_expire_7` | 만료 7일 전 | `SOLAPI_TEMPLATE_MEMBERSHIP_EXPIRE_7` | 회원 | 센터 차감 |
| `membership_expire_today` | 만료 당일 | `SOLAPI_TEMPLATE_MEMBERSHIP_EXPIRE_TODAY` | 회원 | 센터 차감 |
| `schedule_changed` | 예약 변경 | `SOLAPI_TEMPLATE_SCHEDULE_CHANGED` | 회원 | 센터 차감 |
| `schedule_cancelled` | 예약 취소 | `SOLAPI_TEMPLATE_SCHEDULE_CANCELLED` | 회원 | 센터 차감 |
| `center_welcome` | 센터 가입 축하 | `SOLAPI_TEMPLATE_CENTER_WELCOME` | 센터 관리자 | **플랫폼 (미차감)** |
| `weekly_report` | 센터 주간 리포트 | `SOLAPI_TEMPLATE_WEEKLY_REPORT` | 센터 관리자 | **플랫폼 (미차감)** |

### 레거시 alias (호환)

| 구 키 | 신규 키 |
|-------|---------|
| `welcome` | `member_welcome` |
| `payment_done` | `payment_completed` |
| `pt_reminder` | `schedule_reminder` |

### 공통 템플릿 변수

| 변수 | Solapi 키 | 설명 |
|------|-----------|------|
| 센터명 | `#{centerName}` | 모든 회원용 템플릿에 포함 |
| 회원명 | `#{memberName}` / `#{name}` | 동일 값 |
| 트레이너명 | `#{trainerName}` | |
| 일정 | `#{scheduleDate}` | |
| 수업명 | `#{className}` | |
| 상품명 | `#{productName}` | |
| 금액 | `#{amount}` | |
| 잔여 횟수 | `#{remainingCount}` | |
| 만료일 | `#{expireDate}` | |
| 안내 URL | `#{guideUrl}` / `#{portalUrl}` | 동일 값 |

---

## 4. Edge Function별 담당 템플릿

| Edge Function | 담당 템플릿 | 트리거 방식 |
|---------------|-------------|-------------|
| `send-notification` | `member_welcome`, `payment_completed`, `center_welcome`, `schedule_changed`, `schedule_cancelled`, `step_verification_result` | API 호출 (앱/관리자) |
| `schedule-reminders` | `schedule_reminder` | Cron (24시간 전 예약) |
| `pt-reminders` | `pt_remaining_3`, `pt_remaining_1` | Cron (잔여 3·1회 회원 스캔) |
| `renewal-reminders` | `membership_expire_14`, `membership_expire_7`, `membership_expire_today` | Cron (D-14, D-7, 당일) |
| `weekly-center-report` | `weekly_report` | Cron (주 1회 권장) |

### Cron 설정 예시 (Supabase Dashboard → Edge Functions → Cron)

```
schedule-reminders   : 0 * * * *     (매시 정각, 24h 윈도우 내 예약 스캔)
pt-reminders         : 0 9 * * *     (매일 09:00 KST)
renewal-reminders    : 0 9 * * *     (매일 09:00 KST)
weekly-center-report : 0 9 * * 1     (매주 월요일 09:00 KST)
```

---

## 5. 센터 관리자 수신 번호 설계

| 우선순위 | 출처 | 조건 |
|----------|------|------|
| 1 | `center_users.phone` | `role = 'center_admin'`, `status = 'active'`, 유효한 휴대폰 |
| 2 | `centers.contact_phone` | 관리자 계정에 번호가 없을 때 fallback |

구현: `supabase/functions/_shared/centerRecipients.ts` → `resolveCenterAdminPhones()`

번호가 없으면 `skipped` + `no_center_admin_phone`으로 기록됩니다.

**센터 가입 연동:** `notifyCenterWelcome(centerId)` (`src/api/notifications.ts`)를 센터 자가가입 RPC 완료 후 호출하면 됩니다. (이번 작업에서는 함수만 준비, RPC 훅은 미연결)

---

## 6. 중복 발송 방지

| 템플릿 | 기준 | metadata 키 |
|--------|------|-------------|
| `pt_remaining_3` / `pt_remaining_1` | 회원 + 수강권(잔여 회차) | `membership_key` |
| `membership_expire_*` | 회원 + 만료일 | `expire_date` |
| `schedule_reminder` | 예약 | `schedule_id` |
| `schedule_changed` / `schedule_cancelled` | 예약 + 템플릿 | `schedule_id` |
| `weekly_report` | 센터 + 주차 | `report_week` |
| `center_welcome` | 센터당 1회 | — |
| `member_welcome` | 회원당 1회 | — |
| `payment_completed` | 결제 건 | `payment_id` |

DB unique partial index: `migration_094_alimtalk_template_keys.sql`

---

## 7. 크레딧 차감 정책

- **회원용** (`sendMemberNotification`): 발송 성공 시 센터 메시지 크레딧 1건 차감 (기존과 동일)
- **센터용** (`sendCenterNotification`): MotionHub 플랫폼 Solapi 계정으로 발송, **크레딧 미차감**

---

## 8. 템플릿 ID 승인 후 입력 방법

1. **Supabase Dashboard** → Project Settings → Edge Functions → Secrets
2. 각 `SOLAPI_TEMPLATE_*` Secret에 Solapi 콘솔에서 발급된 **템플릿 ID** 입력
3. `MESSAGING_ENABLED=true` 확인
4. Edge Functions 재배포 (Secrets는 자동 반영, 필요 시 `supabase functions deploy` 실행)

```bash
# 예시 (Supabase CLI)
supabase secrets set SOLAPI_TEMPLATE_MEMBER_WELCOME=KA01TP...
supabase secrets set SOLAPI_TEMPLATE_PAYMENT_COMPLETED=KA01TP...
# ... 12종 모두 설정

supabase functions deploy send-notification
supabase functions deploy schedule-reminders
supabase functions deploy pt-reminders
supabase functions deploy renewal-reminders
supabase functions deploy weekly-center-report
```

5. **DB 마이그레이션** 실행: `migration_094_alimtalk_template_keys.sql`

---

## 9. 테스트 방법

### A. 템플릿 ID 미설정 상태 (현재)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/send-notification" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "x-mobel-notification-key: $NOTIFICATION_INTERNAL_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"templateKey":"member_welcome","memberId":"<UUID>"}'
```

**기대 결과:** HTTP 200, `status: "skipped"`, `skippedReason: "missing_template_id"`  
**DB 확인:** `message_logs`에 `template_key = 'member_welcome'`, `error_message = 'missing_template_id'`

### B. 템플릿 ID 설정 후

동일 요청 → `status: "sent"` (크레딧·Solapi 설정 정상 시)

### C. Cron 함수 수동 호출

```bash
curl -X POST "$SUPABASE_URL/functions/v1/schedule-reminders" \
  -H "x-mobel-notification-key: $NOTIFICATION_INTERNAL_SECRET"

curl -X POST "$SUPABASE_URL/functions/v1/pt-reminders" \
  -H "x-mobel-notification-key: $NOTIFICATION_INTERNAL_SECRET"

curl -X POST "$SUPABASE_URL/functions/v1/renewal-reminders" \
  -H "x-mobel-notification-key: $NOTIFICATION_INTERNAL_SECRET"

curl -X POST "$SUPABASE_URL/functions/v1/weekly-center-report" \
  -H "x-mobel-notification-key: $NOTIFICATION_INTERNAL_SECRET"
```

### D. 센터 알림

```bash
curl -X POST "$SUPABASE_URL/functions/v1/send-notification" \
  -H "x-mobel-notification-key: $NOTIFICATION_INTERNAL_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"templateKey":"center_welcome","centerId":"<CENTER_UUID>"}'
```

### E. 중복 방지 확인

동일 `schedule_id` / `membership_key` / `expire_date`로 재호출 시 `skippedReason: "duplicate"`

### F. 프론트엔드

- `VITE_NOTIFICATION_TRIGGER_KEY` = `NOTIFICATION_INTERNAL_SECRET`과 동일 값 설정
- 회원 등록 → `notifyMemberWelcome` → `message_logs` 확인
- 관리자 메시지 발송 이력 화면에서 `template_key` 컬럼 확인

---

## 10. 배포 체크리스트

- [ ] `migration_094_alimtalk_template_keys.sql` 실행
- [ ] Edge Functions 5종 배포
- [ ] Supabase Secrets 12종 + 공통 설정
- [ ] Cron 4종 등록
- [ ] `center_users.phone` 또는 `centers.contact_phone` 등록 (센터 알림용)
- [ ] 카카오 템플릿 승인 후 템플릿 ID 입력
- [ ] 스테이징에서 `missing_template_id` → `sent` 전환 확인

---

*작성일: 2026-06-05 · MotionHub 알림톡 12종 준비 작업*
