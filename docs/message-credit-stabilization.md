# 메시지 크레딧 시스템 안정화

> migration_065 기반 · migration_071 보완 · Edge Function 크레딧 게이트

## 정책 요약

| 항목 | 내용 |
|------|------|
| 구독 vs 크레딧 | 알림톡/문자는 **구독 요금제와 분리**, 크레딧 잔액으로만 발송 |
| 베타 센터 | 생성 시 **30건** bonus (`베타 체험 메시지 크레딧`) |
| 알림 ON/OFF | `center_messaging_config.enabled` + `center_features.notifications` |
| 잔여 0건 | 자동·수동 발송 **모두 중단**, `message_logs`에 `skipped` 기록 |
| 발송 성공 | 1건 차감 (`message_credit_transactions.type = usage`) |
| 발송 실패 | **차감 없음** |
| 충전 결제 | 미구현 (상품 테이블만 존재) |
| 수동 지급 | 슈퍼관리자만 (`manual_grant`) |

---

## 배포 전 실행 SQL

Supabase SQL Editor에서 **순서대로**:

```
migration_064_center_messaging_config.sql   (미적용 시)
migration_065_message_credit_system.sql     (미적용 시)
migration_071_message_credit_stabilization.sql
```

---

## Edge Functions 재배포

프로젝트 루트에서:

```bash
supabase functions deploy send-notification
supabase functions deploy renewal-reminders
supabase functions deploy pt-reminders
```

환경 변수 (Supabase Dashboard → Edge Functions → Secrets):

- `NOTIFICATION_INTERNAL_SECRET` — 프론트 `VITE_NOTIFICATION_TRIGGER_KEY`와 동일
- `SUPABASE_SERVICE_ROLE_KEY`
- Solapi 플랫폼 키 (MOVEL 운영용)

---

## 수정·추가 파일 목록

### DB

| 파일 | 내용 |
|------|------|
| `supabase/migration_071_message_credit_stabilization.sql` | 베타 30건, `manual_grant`, 대시보드 recent_issues, 플랫폼 목록 크레딧 |

### Edge Functions

| 파일 | 내용 |
|------|------|
| `supabase/functions/_shared/notifications.ts` | 크레딧 0 → skipped 로그, 실패 시 미차감 주석 |
| `supabase/functions/_shared/messageCredits.ts` | (기존) `try_consume_message_credits` RPC 호출 |

### 프론트엔드

| 파일 | 내용 |
|------|------|
| `src/types/messageCredits.ts` | `monthSkipped`, `recentIssues` |
| `src/api/platformMessageCredits.ts` | summary 파싱 확장 |
| `src/api/platformCenters.ts` | 센터 목록에 크레딧 필드 |
| `src/components/admin/MessagingCreditPanel.tsx` | ON/OFF, 잔여/사용량, 최근 실패·스킵 |
| `src/components/admin/MessageCampaignPanel.tsx` | 크레딧 부족 메시지 표시 |
| `src/components/platform/PlatformCenterCreditsModal.tsx` | +30/+100/+500, 직접 입력 |
| `src/pages/platform/PlatformHomePage.tsx` | 센터별 메시지 컬럼, 크레딧 지급 |

### 미노출 (의도적)

- `MessagingSettingsPanel` — Solapi API Key/pfId/템플릿 ID (센터 관리자 UI에 **연결하지 않음**)
- 플랫폼/Edge에서 `use_platform_api_keys`로 MOVEL 운영 유지

---

## DB 구조 (migration 065)

| 테이블 | 용도 |
|--------|------|
| `message_credit_wallets` | 센터별 `balance`, `total_used` |
| `message_credit_transactions` | `bonus`, `manual_grant`, `usage`, `purchase`, `refund` |
| `message_logs` | 발송 이력 (`sent` / `failed` / `skipped`) |
| `center_messaging_config` | 알림톡 ON/OFF |
| `center_features.notifications` | 메뉴·기능 토글 연동 |

### 주요 RPC

| RPC | 호출 주체 |
|-----|-----------|
| `try_consume_message_credits` | Edge Function (service_role) |
| `get_message_credit_summary` | Edge / 대시보드 |
| `get_center_message_dashboard` | 센터 관리자 (조회만) |
| `update_center_notifications_enabled` | 센터 관리자 |
| `grant_center_message_credits_platform` | 슈퍼관리자 |
| `provision_center_message_beta_credits` | `create_center` / 센터 INSERT 트리거 |

---

## 발송 흐름

```
send-notification / renewal-reminders / pt-reminders
  → sendMemberNotification()
    1. notifications_enabled? → 아니면 skipped
    2. balance > 0? → 아니면 message_logs skipped + "메시지 크레딧 부족"
    3. Solapi 발송
    4. 성공 시에만 try_consume_message_credits(1)
```

자동발송 템플릿: `welcome`, `payment_done`, `renewal`, `pt_reminder`, `step_verification_result`

---

## 테스트 시나리오

### A. 신규 센터 생성

1. `/platform/centers/new`에서 센터 생성
2. 플랫폼 **메시지 크레딧**에서 확인:
   - 잔여 **30건**
   - transaction `type=bonus`, `description=베타 체험 메시지 크레딧`

### B. 센터 관리자

1. `/admin/messages` → **잔여 30건** 표시
2. 알림톡 OFF 기본 → ON 전환 시 잔여 > 0이면 성공

### C. 수동 발송 1건

1. 신규회원 탭에서 1건 발송
2. 잔여 **29건**
3. `message_credit_transactions`에 `usage`, `-1`

### D. 잔여 0건

1. 크레딧 소진 후 발송 시도
2. 발송 안 됨, `message_logs.status = skipped`, `error_message = 메시지 크레딧 부족`
3. UI: "메시지 크레딧이 부족합니다"

### E. 슈퍼관리자 +100

1. `/platform` → **크레딧** → +100
2. `type = manual_grant`, 잔여 +100
3. 센터에서 다시 발송 가능

---

## 안전장치

- 모든 wallet/transaction은 `center_id` FK
- `try_consume_message_credits` / `grant_message_credits`: `security definer`, public revoke
- 센터 관리자: `get_center_message_dashboard` (조회·ON/OFF만)
- 슈퍼관리자: `grant_center_message_credits_platform` (`verify_auth_session` super_admin)
- 트레이너: 메시지 메뉴·크레딧 RPC 접근 없음
