# MotionHub Super Admin Console 고도화 보고서

## 1. 신규 테이블

`supabase/migration_075_platform_super_admin.sql` 실행 필요.

| 테이블 | 설명 |
|--------|------|
| `platform_feedback` | 센터·회원·관리자 의견 (bug / feature / improvement / question) |
| `platform_activity_logs` | 플랫폼 분석용 사용자 행동 로그 |

### platform_feedback 필드

- `id`, `center_id`, `created_by`, `created_by_type` (admin / trainer / member)
- `type` (bug / feature / improvement / question)
- `title`, `content`
- `status` (open / reviewing / planned / completed)
- `created_at`, `updated_at`

### platform_activity_logs 필드

- `id`, `center_id`, `actor_type`, `actor_id`, `action`, `metadata`, `created_at`

### 주요 RPC

- `get_platform_dashboard_snapshot` — KPI, 이번 달 지표, TOP 10, 베타 알림, 최근 활동
- `get_center_detail_for_platform` — 센터 상세 (읽기 전용)
- `get_platform_analytics` — 최근 30일 기능 사용량
- `list_platform_feedback_for_platform` / `update_platform_feedback_status`
- `submit_platform_feedback` / `log_platform_activity`
- `list_beta_centers_for_platform`

---

## 2. 수정·신규 파일 목록

### DB

- `supabase/migration_075_platform_super_admin.sql` (신규)

### 타입·API

- `src/types/platformOps.ts` (신규)
- `src/api/platformDashboard.ts` (신규)
- `src/api/platformCenterDetail.ts` (신규)
- `src/api/platformAnalytics.ts` (신규)
- `src/api/platformFeedback.ts` (신규)
- `src/api/platformActivity.ts` (신규)
- `src/api/adminAuth.ts` — 로그인 활동 로그
- `src/api/memberAuth.ts` — 로그인 활동 로그
- `src/api/members.ts` — 회원 생성 로그
- `src/api/schedule.ts` — 예약 생성 로그
- `src/api/attendance.ts` — 출석·일정 완료 로그
- `src/api/notifications.ts` — 메시지 발송 로그
- `src/api/payments.ts` — 결제 등록 로그
- `src/api/exerciseJournals.ts` — 운동일지 생성 로그

### 페이지·컴포넌트

- `src/pages/platform/PlatformDashboardPage.tsx` (신규) — `/platform`
- `src/pages/platform/PlatformCentersPage.tsx` (신규) — `/platform/centers`
- `src/pages/platform/PlatformCenterDetailPage.tsx` (신규) — `/platform/centers/:id`
- `src/pages/platform/PlatformFeedbackPage.tsx` (신규) — `/platform/feedback`
- `src/pages/platform/PlatformAnalyticsPage.tsx` (신규) — `/platform/analytics`
- `src/pages/platform/PlatformBetaOpsPage.tsx` (신규) — `/platform/beta`
- `src/components/platform/PlatformOpsUi.tsx` (신규)
- `src/components/platform/PlatformFeedbackModal.tsx` (신규)
- `src/components/layouts/PlatformLayout.tsx` — 네비 확장
- `src/components/layouts/AdminLayout.tsx` — 의견 보내기 버튼
- `src/components/MemberMyPageSection.tsx` — 의견 보내기 버튼
- `src/App.tsx` — 라우트 구성
- `src/pages/platform/PlatformHomePage.tsx` (삭제, 대시보드·센터 목록으로 분리)

---

## 3. 모바일 UI 개선

| 화면 | 개선 내용 |
|------|-----------|
| 플랫폼 대시보드 | KPI 2열 카드 그리드, 섹션별 스택 레이아웃 |
| 센터 목록 | 모바일 카드형 / 데스크톱 테이블 이중 UI |
| 센터 상세 | 탭: 기본정보 / 운영 / 경영 / 메시지 |
| 피드백·분석·베타 | 가로 스크롤 필터, 반응형 테이블·카드 |
| 의견 보내기 모달 | 모바일 bottom sheet 스타일 (`items-end` → `sm:items-center`) |
| 플랫폼 헤더 네비 | `overflow-x-auto` 가로 스크롤 메뉴 |

---

## 4. Super Admin 메뉴 구조

```
/platform                    대시보드 (KPI, 이번 달, TOP 10, 베타 알림, 최근 활동)
/platform/centers            센터 목록 (카드/테이블, 생성·정지·삭제 등 기존 운영)
/platform/centers/:id        센터 상세 분석 (읽기 전용)
/platform/analytics          사용 현황 (최근 30일 기능별·센터별)
/platform/feedback           피드백 목록·상태 변경
/platform/beta               베타 센터·미접속 알림
/platform/beta-applications  베타 신청 (기존)
/platform/consents           가입·동의 (기존)
/platform/centers/new        센터 생성 (기존)
```

센터 관리자·회원 앱:

- 관리자 사이드바 하단 **의견 보내기**
- 회원 마이페이지 **의견 보내기**

---

## 5. 테스트 방법

### 사전 준비

1. Supabase SQL Editor에서 `migration_075_platform_super_admin.sql` 실행
2. `platform_admins` 계정으로 `/platform/login` 접속

### 플랫폼 대시보드 (`/platform`)

- [ ] 상단 KPI 8개 표시 (센터·회원·관리자·트레이너)
- [ ] 이번 달 지표 5개 (신규 센터/회원, 결제, 인식 매출, 메시지)
- [ ] 회원·매출·출석률·예약률 TOP 10
- [ ] 베타 알림·최근 활동 목록

### 센터 상세 (`/platform/centers/:id`)

- [ ] 센터 정보·운영·경영·메시지 탭 전환
- [ ] 데이터 수정 UI 없음 (조회 전용)

### 피드백 (`/platform/feedback`)

- [ ] 관리자/회원 앱에서 의견 제출
- [ ] 목록·유형 필터·상태 변경

### 분석 (`/platform/analytics`)

- [ ] 최근 30일 기능별 합계
- [ ] 센터별 사용 횟수 (활동 로그 기반)

### 활동 로그

- [ ] 관리자/회원 로그인, 회원 등록, 예약, 출석, 결제, 메시지, 운동일지 후 `platform_activity_logs` 적재
- [ ] 대시보드 «최근 활동»에 반영

### 모바일

- [ ] 375px 너비에서 대시보드 KPI 2열, 센터 카드, 상세 탭 동작

### 빌드

```bash
npm run build
```

---

## 운영 참고

- 센터 데이터는 **읽기 전용** — Super Admin은 조회·분석·피드백 관리만 수행
- 센터 생성·정지·삭제 등 기존 운영 기능은 `/platform/centers`에서 유지
- 매출 KPI는 `payment_history` 기준; 인식 매출은 센터 상세 RPC에서 단순 계산
- 분석 데이터는 `platform_activity_logs`가 쌓일수록 정확해짐 (배포 후 점진적 축적)
