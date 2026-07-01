# 모션허브 알림톡 운영 연결 보고서

작성일: 2026-06-05  
프로젝트: `motionhub` (motionhub.kr)  
Supabase: `dcoitajktdaqejnhrnij`

---

## 1. 현재 연결된 템플릿

| 이벤트 | template_key | 발송 시점 | 연결 위치 |
|--------|--------------|-----------|-----------|
| 회원 등록 | `member_signup_guide` | 회원 생성 직후 | `src/api/members.ts`, `src/api/memberAuth.ts` |
| 결제 등록 | `payment_completed` | 결제 기록 생성 직후 | `src/api/payments.ts`, `src/api/members.ts` |
| 예약 리마인더 | `schedule_reminder` | 수업 24시간 전 (크론) | `supabase/functions/schedule-reminders` |
| 예약 변경 | `schedule_changed` | 일시·트레이너 변경 시 | `src/api/schedule.ts`, `src/api/fixedSchedule.ts` |
| 예약 취소 | `schedule_cancelled` | 상태 → cancelled 시 | `src/api/schedule.ts` |
| 회원권 만료 D-14 | `membership_expire_14` | 만료 14일 전 (크론) | `supabase/functions/renewal-reminders` |
| 회원권 만료 D-7 | `membership_expire_7` | 만료 7일 전 (크론) | `supabase/functions/renewal-reminders` |
| 회원권 만료 당일 | `membership_expire_today` | 만료 당일 (크론) | `supabase/functions/renewal-reminders` |
| 센터 가입 | `center_welcome` | 센터 셀프 등록 완료 직후 | `src/api/centerSignup.ts` |

### 검수 미승인 (코드 유지, 발송 비활성화)

| template_key | 비고 |
|--------------|------|
| `pt_remaining_3` | `template_not_approved` 로 skipped 로그 |
| `pt_remaining_1` | 동일 |
| `weekly_report` | 동일 |

비활성화 로직: `supabase/functions/_shared/alimtalkTemplateRegistry.ts` → `getTemplateSendDisabledReason()`

---

## 2. Secret 목록

### 필수 (플랫폼 공통)

| Secret | 설명 |
|--------|------|
| `MESSAGING_ENABLED` | `true` — 실발송 활성화 |
| `NOTIFICATION_INTERNAL_SECRET` | Edge Function 인증 키 |
| `SITE_URL` | `https://motionhub.kr` |
| `SOLAPI_API_KEY` | 솔라피 API 키 |
| `SOLAPI_API_SECRET` | 솔라피 API 시크릿 |
| `SOLAPI_PF_ID` | MotionHub 카카오 채널 pfId |
| `SOLAPI_FROM_NUMBER` | 대체문자 발신번호 |

### 승인 완료 템플릿 ID (2026-06-22 검수)

```bash
supabase secrets set SOLAPI_TEMPLATE_MEMBER_SIGNUP_GUIDE=KA01TP260622104246778fnm5ZHX5bqe
supabase secrets set SOLAPI_TEMPLATE_PAYMENT_COMPLETED=KA01TP260622082852833qhBGwbaUKkQ
supabase secrets set SOLAPI_TEMPLATE_SCHEDULE_REMINDER=KA01TP260622083315419cFDuoMsB4hk
supabase secrets set SOLAPI_TEMPLATE_SCHEDULE_CHANGED=KA01TP260622083931237yd7ID88IZUf
supabase secrets set SOLAPI_TEMPLATE_SCHEDULE_CANCELLED=KA01TP260622084001327tM1FHx94wUF
supabase secrets set SOLAPI_TEMPLATE_MEMBERSHIP_EXPIRE_14=KA01TP2606220837235770zw15TVLRAx
supabase secrets set SOLAPI_TEMPLATE_MEMBERSHIP_EXPIRE_7=KA01TP260622083800666jQ34XDz1ny5
supabase secrets set SOLAPI_TEMPLATE_MEMBERSHIP_EXPIRE_TODAY=KA01TP260622083835049JtFlDT4GkxK
supabase secrets set SOLAPI_TEMPLATE_CENTER_WELCOME=KA01TP260622084110354Q1dyVL4Imd6
supabase secrets set MESSAGING_ENABLED=true
```

### 미승인 (Secret 비워두거나 설정해도 발송 안 됨)

- `SOLAPI_TEMPLATE_PT_REMAINING_3`
- `SOLAPI_TEMPLATE_PT_REMAINING_1`
- `SOLAPI_TEMPLATE_WEEKLY_REPORT`

### Vercel (프론트)

| 변수 | 값 |
|------|-----|
| `VITE_NOTIFICATION_TRIGGER_KEY` | `NOTIFICATION_INTERNAL_SECRET` 와 동일 |
| `VITE_MOTIONHUB_KAKAO_URL` | 카카오 채널 URL |

---

## 3. Edge Function 목록

| 함수 | 역할 | Cron 권장 |
|------|------|-----------|
| `send-notification` | 단건 발송 (회원·센터·이벤트) | — |
| `schedule-reminders` | `schedule_reminder` (24h 전) | `0 * * * *` |
| `renewal-reminders` | `membership_expire_*` | `0 0 * * *` (KST 09:00) |
| `pt-reminders` | `pt_remaining_*` (미승인 → skipped) | 비활성 권장 |
| `weekly-center-report` | `weekly_report` (미승인 → skipped) | 비활성 권장 |

배포:

```bash
cd motionhub
supabase functions deploy send-notification
supabase functions deploy schedule-reminders
supabase functions deploy renewal-reminders
supabase functions deploy pt-reminders
supabase functions deploy weekly-center-report
```

---

## 4. message_logs

모든 발송 시도는 `message_logs`에 기록됩니다.

| 필드 | 설명 |
|------|------|
| `template_key` | 템플릿 키 |
| `member_id` | 회원 대상 (센터 알림은 null) |
| `center_id` | 센터 ID |
| `status` | `pending` → `sent` / `failed` / `skipped` |
| `provider_message_id` | 솔라피 메시지 ID (성공 시) |
| `error_message` | 실패·생략 사유 |
| `created_at` | 생성 시각 |

관리자 UI: **관리자 → 메시지 발송 → 발송 이력** (`/admin/messages`)  
상태 필터: 발송 성공 / 실패 / 대기 / 생략

---

## 5. 베타센터 테스트 체크리스트

각 시나리오 후 `message_logs` 및 실제 수신 확인.

| # | 시나리오 | 기대 template_key | 확인 방법 |
|---|----------|-------------------|-----------|
| 1 | 회원 등록 | `member_signup_guide` | 관리자 회원 추가 |
| 2 | 결제 등록 | `payment_completed` | 결제 기록 입력 |
| 3 | 예약 생성 | `schedule_reminder` | 예약 후 24h 전 크론 또는 수동 실행 |
| 4 | 예약 변경 | `schedule_changed` | 캘린더에서 일시 변경 |
| 5 | 예약 취소 | `schedule_cancelled` | 예약 취소 |
| 6 | 만료 D-14 | `membership_expire_14` | 만료일 14일 후 회원 + 크론 |
| 7 | 만료 D-7 | `membership_expire_7` | 동일 |
| 8 | 만료 당일 | `membership_expire_today` | 동일 |
| 9 | 센터 가입 | `center_welcome` | `/signup` 셀프 등록 |

**사전 조건**

- 센터 메시지 크레딧 잔액 > 0
- 회원·관리자 휴대폰 번호 유효 (010…)
- `MESSAGING_ENABLED=true`
- `VITE_NOTIFICATION_TRIGGER_KEY` 설정됨

---

## 6. 테스트 결과

> 베타센터 실사용 테스트는 Secret 설정·Edge Function 배포 후 진행 필요.

| 시나리오 | message_logs | 실제 수신 | 비고 |
|----------|--------------|-----------|------|
| 회원 등록 | ☐ | ☐ | |
| 결제 등록 | ☐ | ☐ | |
| 예약 리마인더 | ☐ | ☐ | 크론 또는 수동 |
| 예약 변경 | ☐ | ☐ | |
| 예약 취소 | ☐ | ☐ | |
| 만료 D-14/7/당일 | ☐ | ☐ | |
| 센터 가입 | ☐ | ☐ | |

---

## 7. 남은 작업

1. **Supabase Secrets** — 위 승인 템플릿 ID 일괄 등록 + `MESSAGING_ENABLED=true`
2. **Edge Function 재배포** — `_shared` 변경 반영
3. **Cron 등록** — `schedule-reminders`, `renewal-reminders` (pt/weekly는 보류)
4. **베타센터 E2E** — 체크리스트 9항목 실측 후 §6 표 업데이트
5. **미승인 템플릿 솔라피 재검수** — `pt_remaining_*`, `weekly_report`

---

## 8. PT 잔여횟수 알림 대체 방안

`pt_remaining_3` / `pt_remaining_1` 검수 전까지:

| 방안 | 장점 | 단점 |
|------|------|------|
| **친구톡** | 카카오 채널 친구 대상 자유 형식 | 채널 친구 추가 필요, 별도 요금·검수 |
| **SMS 대체발송** | 이미 `SOLAPI_FROM_NUMBER` 연동, 비친구도 수신 | 알림톡 대비 단가·도달률 |
| **앱/포털 푸시** | 비용 없음 | 회원 포털 접속 필요 |

**권장 순서**

1. 단기: 알림톡 실패 시 솔라피 SMS 대체발송 (`solapi.ts` fallback)으로 PT 잔여 안내 문구 커스텀
2. 중기: `pt_remaining_*` 템플릿 재검수 후 알림톡 복구
3. 장기: 회원 포털 인앱 알림 + 주 1회 친구톡 요약 (선택)

---

## 변경 파일 요약 (이번 작업)

- `supabase/functions/_shared/alimtalkTemplateRegistry.ts` — 승인/미승인 구분
- `supabase/functions/_shared/notifications.ts` — 미승인 skipped 로그
- `src/api/schedule.ts` — 예약 변경·취소 알림
- `src/api/fixedSchedule.ts` — 고정 수업 변경 알림
- `src/api/centerSignup.ts` — 센터 가입 축하
- `src/pages/admin/MessagesPage.tsx` — 이력 상태 필터·크론 버튼 정리
