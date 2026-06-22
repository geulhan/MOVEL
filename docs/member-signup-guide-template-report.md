# 회원가입 안내 템플릿 변경 보고서 (`member_signup_guide`)

## 개요

회원 등록 완료 알림을 **회원가입 안내** 템플릿으로 변경했습니다.  
템플릿 키 `member_welcome` → `member_signup_guide`, 변수는 `#{centerName}`만 사용하며 회원 포털 URL은 템플릿 본문에 `https://motionhub.kr/member` 고정입니다.

`#{guideUrl}` 변수는 **센터 가입 축하(`center_welcome`)** 에서만 사용합니다.

---

## 1. 템플릿명 변경 목록

| 구분 | 기존 | 신규 |
|------|------|------|
| 템플릿 키 | `member_welcome` | `member_signup_guide` |
| 한글명 | 회원 등록 완료 | **회원가입 안내** |
| Supabase Secret | `SOLAPI_TEMPLATE_MEMBER_WELCOME` | `SOLAPI_TEMPLATE_MEMBER_SIGNUP_GUIDE` |
| 레거시 alias | `welcome` → `member_welcome` | `welcome`, `member_welcome` → `member_signup_guide` |

### 신규 템플릿 본문 (Solapi 등록용)

```
안녕하세요.

#{centerName} 입니다.

회원 등록이 완료되었습니다.

아래 링크에서 회원가입 후
예약, 출석, 운동기록 등을 확인하실 수 있습니다.

회원가입
https://motionhub.kr/member

감사합니다.
```

| 변수 | 설명 |
|------|------|
| `#{centerName}` | 센터명 (유일한 동적 변수) |

---

## 2. 발송 로직 수정 목록

| 시점 | 동작 |
|------|------|
| 센터 관리자 회원 등록 완료 | `notifyMemberSignupGuide(memberId)` 호출 |
| Edge Function | `templateKey: member_signup_guide`로 정규화·발송 |
| 중복 방지 | 회원당 1회 (`member_signup_guide` + 레거시 `member_welcome`/`welcome` 이력 포함) |
| 크레딧 | 센터 메시지 크레딧 차감 (기존과 동일) |

### 회원 등록 → 회원가입 플로우

```
센터 관리자 회원 등록
    ↓
member_signup_guide 자동 발송
    ↓
회원 https://motionhub.kr/member 접속
    ↓
휴대폰 번호 + 비밀번호 설정
    ↓
회원 로그인 완료
```

### 호출 위치

| 파일 | 함수 |
|------|------|
| `src/api/members.ts` | 관리자 회원 등록 후 `notifyMemberSignupGuide` |
| `src/api/memberAuth.ts` | 자가 등록 경로 `notifyMemberSignupGuide` |
| `src/api/notifications.ts` | `notifyMemberSignupGuide` (신규), `notifyMemberWelcome` (deprecated alias) |

---

## 3. 영향받는 Edge Function

| Edge Function | 변경 내용 |
|---------------|-----------|
| **`send-notification`** | 허용 키 `member_signup_guide`, 레거시 `welcome`/`member_welcome` → 정규화 |
| `_shared/notifications.ts` | dedup·`template_key` 저장 키 변경 |
| `_shared/templates.ts` | 변수 매핑: `#{centerName}`만 전달 |
| `_shared/alimtalkTemplateRegistry.ts` | 키·Secret·alias 전면 갱신 |

**변경 없음:** `schedule-reminders`, `pt-reminders`, `renewal-reminders`, `weekly-center-report`

---

## 4. `guideUrl` 정책

| 템플릿 | `#{guideUrl}` |
|--------|---------------|
| `center_welcome` | ✅ `https://motionhub.kr/guide` |
| `member_signup_guide` | ❌ (본문 고정 URL) |
| 기타 회원용 | ❌ (`#{portalUrl}` 사용) |
| `weekly_report` | ❌ (제거) |

---

## 5. 용어 통일 (모션허브)

사용자 노출 문구에서 **MotionHub → 모션허브** 우선 적용:

| 위치 | 예시 |
|------|------|
| 가이드 페이지 (`/guide`) | 모션허브 시작 가이드, 모션허브 공용 채널 |
| 템플릿 라벨 | 모션허브 주간 리포트 |
| SEO (`MOTIONHUB_GUIDE_SEO`) | 모션허브 시작 가이드 |

코드 식별자(`MotionHubLogo`, 파일명 등)는 유지했습니다.

---

## 6. 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `supabase/functions/_shared/alimtalkTemplateRegistry.ts` | `member_signup_guide` 키·Secret |
| `supabase/functions/_shared/templates.ts` | 변수 매핑, `guideUrl` 센터 전용 |
| `supabase/functions/_shared/notifications.ts` | dedup 로직 |
| `supabase/migration_095_member_signup_guide.sql` | **신규** DB CHECK 확장 |
| `src/constants/alimtalkTemplates.ts` | 템플릿 예시·Secret 키명 |
| `src/constants/motionhubGuide.ts` | `MOTIONHUB_MEMBER_SIGNUP_PORTAL_URL` |
| `src/constants/motionhubSeo.ts` | 가이드 SEO 한글화 |
| `src/types/database.ts` | `MessageTemplateKey` 갱신 |
| `src/types/messageCenter.ts` | `member_signup_guide` 이벤트 |
| `src/api/notifications.ts` | `notifyMemberSignupGuide` |
| `src/api/members.ts` | 발송 함수 교체 |
| `src/api/memberAuth.ts` | 발송 함수 교체 |
| `src/pages/GuidePage.tsx` | 모션허브 용어·알림톡 안내 문구 |

---

## 7. 배포 체크리스트

- [ ] `migration_095_member_signup_guide.sql` 실행
- [ ] Supabase Secret: `SOLAPI_TEMPLATE_MEMBER_SIGNUP_GUIDE` = 승인된 템플릿 ID
- [ ] (선택) 기존 `SOLAPI_TEMPLATE_MEMBER_WELCOME` 값이 있으면 마이그레이션 전까지 fallback으로 동작
- [ ] Edge Functions `send-notification` 재배포
- [ ] Solapi 콘솔에 신규 본문·변수(`centerName`만) 등록·검수

### 테스트

```bash
curl -X POST "$SUPABASE_URL/functions/v1/send-notification" \
  -H "x-mobel-notification-key: $NOTIFICATION_INTERNAL_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"templateKey":"member_signup_guide","memberId":"<UUID>"}'
```

`message_logs.template_key = 'member_signup_guide'` 확인

---

*작성일: 2026-06-05*
