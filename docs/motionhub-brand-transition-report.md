# MotionHub 브랜드 전환 보고서

> 작성일: 2026-06-05  
> 범위: MOVEL 플랫폼 브랜딩 → MotionHub (메시징·문의 채널·알림톡 템플릿 가이드)  
> 코드 브랜치: `main` (본 문서 커밋 시점 기준)

---

## 1. 변경된 파일 목록

### 신규

| 파일 | 내용 |
|------|------|
| `src/constants/alimtalkTemplates.ts` | 알림톡 공통 본문 예시·변수 목록 |
| `src/components/admin/MotionHubSupportLink.tsx` | 관리자용 MotionHub 카카오 문의 링크 |
| `supabase/functions/_shared/alimtalkBrand.ts` | Edge 공용 브랜드 헤더 `[모션허브]` |
| `docs/motionhub-brand-transition-report.md` | 본 보고서 |

### 수정

| 파일 | 변경 요약 |
|------|-----------|
| `supabase/functions/_shared/templates.ts` | 모든 템플릿 변수에 `#{brandHeader}` 추가 |
| `supabase/functions/_shared/solapi.ts` | 기본 `SITE_URL` → `https://motionhub.kr` |
| `supabase/SOLAPI_SETUP.txt` | MotionHub 채널·템플릿 본문 구조 전면 개정 |
| `.env.example` | `SITE_URL`, `VITE_MOTIONHUB_KAKAO_URL`, pfId 주석 |
| `src/constants/motionhub.ts` | `getMotionHubKakaoUrl()` — 문의 링크 중앙 관리 |
| `src/types/messagingSettings.ts` | 템플릿 힌트에 `[모션허브]` + `#{centerName} 회원님` |
| `src/components/admin/MessagingSettingsPanel.tsx` | 브랜드 가이드·문의 링크 |
| `src/components/admin/MessagingCreditPanel.tsx` | 크레딧 부족 시 카카오 문의 링크 |
| `src/components/layouts/AdminLayout.tsx` | 사이드바 「플랫폼 문의」 링크 |
| `src/pages/MotionHubLandingPage.tsx` | 카카오 문의 → `getMotionHubKakaoUrl()` |
| `src/pages/admin/MessagesPage.tsx` | 메시지 발송 화면 문의 링크 |
| `src/constants/contractTerms.ts` | 주석 MOVEL → MotionHub |
| `src/pages/RootPage.tsx` | 주석 정리 |

### 의도적으로 변경하지 않음 (센터 데이터·레거시)

| 구분 | 예시 | 사유 |
|------|------|------|
| 센터 slug / 이름 | `movel`, `모벨 퍼포먼스 트레이닝` | 1호 센터 운영 데이터 |
| DB migration | `slug = 'movel'` 백필·보호 로직 | 센터 테넌트 유지 |
| `LEGACY_MOVEL_SLUG`, `centerSlug.ts` | 로그인·호스트 fallback | 기존 회원·URL 호환 |
| 만보 인증 코드 | `MOVEL-8421` 형식 | 센터 앱 내 인증 워터마크 |
| 리워드 등급 | `MOVEL ELITE` | 센터 리워드 프로그램명 |
| `centerMessaging.ts` `isMovel` | 플랫폼 키 fallback | movel 센터 레거시 운영 연속성 |
| Supabase 프로젝트명 | `MOVEL pt` | 인프라 표시명 (선택 변경) |

---

## 2. 추가로 변경해야 할 ENV 목록

### Supabase Edge Function Secrets (필수)

| Secret | 변경 내용 |
|--------|-----------|
| `SOLAPI_PF_ID` | **MOVEL 채널 pfId 제거** → **MotionHub 카카오 비즈니스 채널 pfId** |
| `SITE_URL` | `https://motionhub.kr` (또는 `https://app.motionhub.kr` — 회원 포털 링크 기준) |
| `SOLAPI_TEMPLATE_WELCOME` | MotionHub 브랜드 본문으로 **재심사·신규 ID** |
| `SOLAPI_TEMPLATE_PAYMENT` | 동일 |
| `SOLAPI_TEMPLATE_RENEWAL` | 동일 |
| `SOLAPI_TEMPLATE_STEP_RESULT` | 동일 |
| `SOLAPI_TEMPLATE_PT_REMINDER` | 동일 |
| `MESSAGING_ENABLED` | 템플릿·pfId 교체 검증 후 `true` |
| `SOLAPI_API_KEY` / `SOLAPI_API_SECRET` | MotionHub 솔라피 계정 키 (변경 시) |
| `SOLAPI_FROM_NUMBER` | 대체문자 발신번호 (유지 또는 재등록) |
| `NOTIFICATION_INTERNAL_SECRET` | 변경 불필요 (Vercel과 동기화만 유지) |

### Vercel (프론트엔드)

| 변수 | 용도 |
|------|------|
| `VITE_MOTIONHUB_KAKAO_URL` | 랜딩·관리자 **카카오 문의 링크** (MotionHub 채널 URL) |
| `VITE_NOTIFICATION_TRIGGER_KEY` | `NOTIFICATION_INTERNAL_SECRET` 과 동일 |
| `VITE_SITE_URL` | (선택) 회원 링크 생성 기준 |
| `VITE_DEMO_URL` | (선택) 랜딩 데모 버튼 |

### DB (센터별 설정 — 운영 점검)

`center_messaging_config` 에 **MOVEL pfId** 가 저장된 센터가 있으면:

- MotionHub 공용 키 사용 센터 → pfId 비우고 플랫폼 Secret 사용
- 센터 전용 채널 센터 → 해당 센터 MotionHub(또는 센터 자체) pfId로 수동 갱신

---

## 3. 새 Solapi 설정 목록

### 카카오 채널

| 항목 | 이전 | 이후 |
|------|------|------|
| 채널명 | MOVEL | **MotionHub (모션허브)** |
| pfId | MOVEL 채널 pfId | **MotionHub 채널 pfId** → `SOLAPI_PF_ID` |
| 문의 URL | (MOVEL 오픈채팅 등) | MotionHub 비즈니스 채널 (`pf.kakao.com/...`) |

### 알림톡 템플릿 공통 구조

```
[모션허브]
#{centerName} 회원님
(안내 본문…)
```

- **제거:** `안녕하세요 MOVEL입니다` 등 MOVEL 브랜드 고정 인사
- **센터명:** `#{centerName}` — DB 센터명(또는 발신 센터명 설정)이 들어감
- **선택 변수:** `#{brandHeader}` = `[모션허브]` (코드에서 자동 주입)

### 템플릿별 등록 예시

코드·Solapi 심사용 전문은 다음 파일 참고:

- `supabase/SOLAPI_SETUP.txt`
- `src/constants/alimtalkTemplates.ts`

---

## 4. 새 템플릿 ID 적용 위치

| 템플릿 키 | Supabase Secret | 센터 DB 컬럼 (`center_messaging_config`) | Edge 사용처 |
|-----------|-----------------|------------------------------------------|-------------|
| `welcome` | `SOLAPI_TEMPLATE_WELCOME` | `template_welcome` | `send-notification`, 수동 발송 |
| `payment_done` | `SOLAPI_TEMPLATE_PAYMENT` | `template_payment_done` | 결제 완료 시 자동·수동 |
| `renewal` | `SOLAPI_TEMPLATE_RENEWAL` | `template_renewal` | `renewal-reminders` Cron, 수동 |
| `step_verification_result` | `SOLAPI_TEMPLATE_STEP_RESULT` | `template_step_verification_result` | 만보 인증 결과 |
| `pt_reminder` | `SOLAPI_TEMPLATE_PT_REMINDER` | `template_pt_reminder` | `pt-reminders` Cron, 수동 |

**우선순위:** 센터 DB에 템플릿 ID가 있으면 센터 값 → 없으면 Supabase Secret(플랫폼 기본값).  
**관리 UI:** `MessagingSettingsPanel` (관리자 → 메시지 관련 설정), 플랫폼 Secret은 Supabase CLI/대시보드.

**변수 빌드 코드:** `supabase/functions/_shared/templates.ts`  
**발송:** `supabase/functions/_shared/solapi.ts` → `sendAlimtalk()`  
**오케스트레이션:** `send-notification`, `renewal-reminders`, `pt-reminders`

---

## 5. 브랜드 전환 체크리스트

### Solapi / 카카오

- [ ] MotionHub 카카오 **비즈니스 채널** 개설·솔라피 연동
- [ ] MOVEL 채널 pfId Secret·DB에서 **제거/미사용** 확인
- [ ] `SOLAPI_PF_ID` = MotionHub pfId 로 Secret 갱신
- [ ] 5종 알림톡 템플릿 `[모션허브]` + `#{centerName} 회원님` 구조로 **재등록·심사**
- [ ] 심사 통과 후 5개 **템플릿 ID** Secret 반영
- [ ] `MESSAGING_ENABLED=true` 후 테스트 발송 1건 (환영·결제·갱신·PT·만보 중 1종)

### Supabase / Edge

- [ ] `SITE_URL=https://motionhub.kr` Secret 확인
- [ ] `send-notification`, `renewal-reminders`, `pt-reminders` **재배포**
- [ ] `message_logs` 에서 발송 성공·변수 치환 확인
- [ ] Cron (`renewal-reminders`, `pt-reminders`) 정상 동작

### Vercel / 프론트

- [ ] `VITE_MOTIONHUB_KAKAO_URL` = MotionHub 채널 URL 설정
- [ ] motionhub.kr 랜딩 **도입 문의** → 카카오 링크 동작 확인
- [ ] 관리자 사이드바·메시지 발송 **플랫폼 문의** 링크 확인

### 데이터 분류 점검

- [ ] 알림톡·문의 UI에 MOVEL 브랜드 문구 없음
- [ ] 센터명 `모벨 퍼포먼스`, slug `movel` **유지** (의도된 센터 데이터)
- [ ] 회원·계약·결제 데이터 변경 없음

### 검색 기반 잔여 MOVEL 문구 (참고)

| 분류 | 위치 | 조치 |
|------|------|------|
| A 브랜드 | `README.md`, `install.bat` | (선택) MotionHub로 문서 정리 |
| A 브랜드 | `MovelLogo*.tsx` | 센터 1호 브랜드 UI — 센터 테마로 유지 |
| B 센터 | migration `slug=movel` | **유지** |
| B 센터 | `MotionHubLandingPage` Case Study 「모벨 퍼포먼스」 | **유지** (실제 운영 사례) |
| B 센터 | `MOVEL ELITE`, 만보 `MOVEL-####` | **유지** |

---

## 부록: MOVEL 검색 분류 요약

전체 프로젝트 `MOVEL` / `모벨` / `movel` 검색 결과를 **A(브랜드 문구)** / **B(센터·레거시 데이터)** 로 나눴습니다.

- **이번 작업에서 A로 처리:** 알림톡 가이드, Solapi 기본 URL, 문의 링크, 관리자 UI, 계약 약관 주석, RootPage 주석
- **B로 유지:** 센터 slug·이름, migration, 로그인 fallback, 리워드 티어, 인증 코드, 플랫폼 홈의 movel 센터 보호, E2E/감사 문서의 MOVEL 센터 지칭

추가 브랜드 정리(README, 배치 파일, Movel 로고 컴포넌트 rename 등)는 **센터 UI와 분리**해 별도 작업으로 진행하는 것을 권장합니다.

---

## 다음 운영 단계 (코드 배포 후)

1. Supabase Secret + Vercel ENV 수동 갱신  
2. Solapi 템플릿 심사 완료 → 템플릿 ID Secret 입력  
3. Edge Functions 재배포  
4. MOVEL 센터(`slug=movel`)에서 알림톡 1건 E2E  
5. 본 체크리스트 전항목 확인
