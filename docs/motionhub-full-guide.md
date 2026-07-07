# 모션허브(MotionHub) 전체 구현 가이드

> **작성일:** 2026-07-07  
> **프로젝트:** `C:\Users\kjh56\Projects\motionhub`  
> **저장소:** [geulhan/MOVEL](https://github.com/geulhan/MOVEL.git)  
> **프로덕션:** [https://motionhub.kr](https://motionhub.kr) (Vercel 자동 배포)  
> **DB:** Supabase (`dcoitajktdaqejnhrnij`)

이 문서는 모션허브에 **현재까지 구현된 기능·페이지·역할·아키텍처**를 한곳에 정리한 종합 가이드입니다.  
공개 페이지는 **실제 프로덕션 스크린샷**을, 회원 성장(마을) UI는 **디자인 목업**을, 관리자 내부 화면은 **캡처 스크립트**로 추가할 수 있습니다.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [사용자 역할과 URL 구조](#3-사용자-역할과-url-구조)
4. [공개·인증 페이지](#4-공개인증-페이지)
5. [센터 관리자 (`/admin`)](#5-센터-관리자-admin)
6. [회원 앱 (`/member`)](#6-회원-앱-member)
7. [플랫폼 슈퍼관리자 (`/platform`)](#7-플랫폼-슈퍼관리자-platform)
8. [핵심 기능 영역](#8-핵심-기능-영역)
9. [MotionHub AI (경영 리포트·어시스턴트)](#9-motionhub-ai-경영-리포트어시스턴트)
10. [베타 시작하기 · 페이지 도움말](#10-베타-시작하기--페이지-도움말)
11. [SEO · 배포](#11-seo--배포)
12. [데이터베이스 마이그레이션](#12-데이터베이스-마이그레이션)
13. [관리자 스크린샷 추가 캡처](#13-관리자-스크린샷-추가-캡처)
14. [관련 문서](#14-관련-문서)

---

## 1. 프로젝트 개요

**모션허브**는 PT샵·필라테스·요가·헬스장 등 **운동센터 운영을 위한 SaaS**입니다.

| 항목 | 내용 |
|------|------|
| 한 줄 정의 | 회원이 운동을 지속하게 만드는 운동센터 운영 플랫폼 |
| 핵심 가치 | 회원관리 · 재등록 · 출석 · 알림톡 · 운동일지 · 마일리지를 **하나로 연결** |
| 운영 모델 | 멀티센터 SaaS (센터별 `center_id` 스코프) |
| 베타 | 가입 즉시 **14일 무료 체험** |

### 제공 기능 요약

- **회원·CRM:** 등록, 상세, 메모·상담, Excel 가져오기/보내기, 리드(상담) 관리
- **PT:** 스케줄, 출석, 트레이너·정산 단가
- **그룹수업:** 클래스 CRUD, 주간 일정, 예약·출석, 회차권 차감
- **시설 운영:** 입장 체크인, 락커, 수건
- **결제:** 결제 요청 · 전자계약 · 수동 완료 (PG 미연동)
- **마일리지:** 적립·사용·만보 인증·리뷰 마일리지
- **메시지:** 알림톡 자동발송·수동발송·크레딧
- **경영관리:** 매출·이익 KPI, AI 월간 보고서, AI 어시스턴트
- **플랫폼:** 센터 생성·베타 신청·동의·크레딧 지급

---

## 2. 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | React 18, TypeScript, Vite, React Router, Tailwind CSS |
| 백엔드/DB | Supabase (PostgreSQL, RLS, RPC, Edge Functions) |
| 메시징 | Solapi 알림톡 (Edge: `send-notification`, 리마인더 등) |
| 배포 | Vercel |
| 도메인 | `motionhub.kr` |

---

## 3. 사용자 역할과 URL 구조

```mermaid
flowchart LR
  subgraph public [공개]
    Home["/ · 랜딩"]
    Guide["/guide"]
    Login["/login"]
    Signup["/signup"]
  end

  subgraph admin [센터 운영]
    Admin["/admin/*"]
  end

  subgraph member [회원]
    Member["/member"]
  end

  subgraph platform [플랫폼]
    Platform["/platform/*"]
  end

  Home --> Login
  Signup --> Login
  Login --> Admin
  Member --> Member
  Platform --> Platform
```

| 역할 | 경로 | 설명 |
|------|------|------|
| **방문자** | `/`, `/motionhub`, `/guide` | 랜딩·소개·시작 가이드 |
| **센터 관리자** | `/admin` | 센터 전체 운영 (기능 토글에 따라 메뉴 표시) |
| **트레이너** | `/admin` (제한) | 회원·일정·출석·클래스 등 담당 범위 |
| **회원** | `/member?center=` | 결제·계약·예약·일지·마일리지 |
| **플랫폼 관리자** | `/platform` | 센터·베타·동의·크레딧 관리 |

> `center_features` 토글에 따라 관리자 메뉴가 **동적으로 표시/숨김**됩니다.

---

## 4. 공개·인증 페이지

### 4.1 메인 랜딩 (`/`)

**URL:** https://motionhub.kr/

베타 신청 폼, 기능 소개, 문제/솔루션 섹션, 카카오·인스타 연락처.

![메인 랜딩](assets/full-guide/01-landing-home.png)

**주요 CTA**
- 베타 신청하기
- 데모 보기 → `/member`
- 시작 가이드 → `/guide`
- 센터 등록 → `/signup`
- 관리자 로그인 → `/login`

---

### 4.2 시작 가이드 (`/guide`)

**URL:** https://motionhub.kr/guide

3단계 퀵스타트(회원 등록 → 수강권 → 예약)와 상세 아코디언 가이드, FAQ.

![시작 가이드](assets/full-guide/02-guide.png)

---

### 4.3 관리자·트레이너 로그인 (`/login`)

**URL:** https://motionhub.kr/login

센터 slug 기반 멀티센터 로그인. 아이디·비밀번호 기억하기 지원.

![관리자 로그인](assets/full-guide/03-login.png)

---

### 4.4 센터 등록 (`/signup`)

**URL:** https://motionhub.kr/signup

셀프 센터 등록. 가입 즉시 14일 체험 시작. `motionhub.kr/{slug}` 주소 발급.

| 입력 항목 | 설명 |
|-----------|------|
| 센터명 | 표시 이름 |
| 센터 주소(slug) | `motionhub.kr/abc-pt` 형태 |
| 관리자 아이디·비밀번호 | `/login` 계정 |
| 휴대전화 | 비밀번호 초기화용 |
| 약관 동의 | 필수 3종 + 마케팅 선택 |

![센터 등록](assets/full-guide/04-signup.png)

---

### 4.5 회원 포털 로그인·가입 (`/member`)

**URL:** https://motionhub.kr/member

| 항목 | 내용 |
|------|------|
| 로그인 | 센터 선택 + 휴대폰(아이디) + 비밀번호 |
| 기본 비밀번호 | 휴대폰 **뒤 4자리** (센터 안내) |
| 회원가입 | 센터 선택 후 이름·전화·비밀번호·약관 |

![회원 로그인](assets/full-guide/05-member-login.png)

![회원 가입](assets/full-guide/05b-member-signup.png)

---

### 4.6 플랫폼 슈퍼관리자 로그인 (`/platform/login`)

**URL:** https://motionhub.kr/platform/login

MotionHub 플랫폼 운영팀 전용. 센터 관리자와 계정 분리.

![플랫폼 로그인](assets/full-guide/06-platform-login.png)

---

## 5. 센터 관리자 (`/admin`)

로그인 후 접근. 사이드바 메뉴는 **역할(관리자/트레이너)** 과 **기능 토글**에 따라 달라집니다.

### 메뉴 구조

| 메뉴 | 경로 | 기능 키 | 도움말 요약 |
|------|------|---------|-------------|
| 베타 시작하기 | `/admin/beta-start` | — | 가입 후 6단계 온보딩 |
| 대시보드 | `/admin` | — | 매출·재등록·운영 KPI |
| 상담·리드 | `/admin/leads` | `membership` | 상담 → 회원 전환 |
| 회원 관리 | `/admin/members` | `membership` | 등록 시 가입 안내 알림톡 |
| 센터 일정 | `/admin/schedule` | `pt` | PT 일정·예약 |
| 클래스 | `/admin/classes` | `class`/`pilates`/`yoga`/`gx` | 주간 시간표·출석 |
| 출석부 | `/admin/attendance` | `attendance` | PT 출석·노쇼·취소 |
| 강사 관리 | `/admin/trainers` | `pt`/`class` | 강사·정산 단가 |
| 시설 운영 | `/admin/facility` | `facility`/`locker`/`towel` | 입장·락커·수건 |
| 마일리지 | `/admin/motionhub` | `mileage` | MOVE MILE 규칙 |
| 결제 관리 | `/admin/payments` | `membership` | 가격·요청·계약 |
| 경영관리 | `/admin/analytics` | — | KPI·AI 리포트·어시스턴트 |
| 메시지 발송 | `/admin/messages` | `notifications` | 알림톡 자동·수동 |
| 센터 설정 | `/admin/settings` | — | 브랜딩·기능 토글 |

### 페이지별 상세

#### 베타 시작하기 (`/admin/beta-start`)

신규 센터 관리자에게 **6단계 체크리스트**를 제공합니다. 완료 전까지 대시보드 대신 이 페이지로 이동합니다.

| 단계 | 내용 | 이동 |
|------|------|------|
| 1 | 회원 등록 | `/admin/members` |
| 2 | 예약 생성 | `/admin/schedule` |
| 3 | 출석 체크 | `/admin/attendance` |
| 4 | 운동일지 작성 | 회원 상세 일지 탭 |
| 5 | 회원 로그인 확인 | `/member` (새 탭) |
| 6 | AI 리포트 보기 | `/admin/analytics` |

![베타 시작하기](assets/full-guide/admin-01-beta-start.png)

---

#### 대시보드 (`/admin`)

- `SalesDashboard` — 월 매출·최근 결제
- `RenewalDashboard` — 재등록 D-7·만료 필터
- `ClassDashboardKpi` — 클래스·예약 지표
- `OperationalKpiSidebar` — 시설·운영 사이드 KPI

![대시보드](assets/full-guide/admin-02-dashboard.png)

---

#### 상담·리드 (`/admin/leads`)

상담 문의 등록 → 회원 전환. CRM 성격의 리드 파이프라인.

![상담·리드](assets/full-guide/admin-03-leads.png)

---

#### 회원 관리 (`/admin/members`)

- 검색·상태·트레이너·재등록 필터
- Excel 가져오기/보내기
- 회원 등록 시 **가입 안내 알림톡** 자동 발송

**회원 상세** (`/admin/member/:id`)

| 탭 | 경로 | 내용 |
|----|------|------|
| 개요 | `/admin/member/:id` | 기본 정보·PT 잔여 |
| 결제정보 | `.../pt` | PT·결제 내역 |
| 출석 | `.../attendance` | 출석 기록 |
| 메모·상담 | `.../records` | CRM 메모 |
| 운동일지 | `.../journal` | 일지·사진 |

![회원 관리](assets/full-guide/admin-04-members.png)

---

#### 센터 일정 (`/admin/schedule`)

PT·고정 스케줄 캘린더. 완료/취소·세션 로그·회차 차감.

![센터 일정](assets/full-guide/admin-05-schedule.png)

---

#### 클래스 (`/admin/classes`)

필라테스·요가·GX·소그룹 PT. **주간 아젠다 + 우측 상세 패널** UX.

- 예약·대기·출석/노쇼/취소
- `member_session_passes` 회차 차감

![클래스](assets/full-guide/admin-06-classes.png)

---

#### 출석부 (`/admin/attendance`)

PT 출석부(일/월). 트레이너는 **담당 회원만** 조회 + 수업료 요약(읽기 전용).

![출석부](assets/full-guide/admin-07-attendance.png)

---

#### 강사 관리 (`/admin/trainers`)

강사 CRUD, 관리자 계정, `settlement_rate` 정산 단가.

![강사 관리](assets/full-guide/admin-08-trainers.png)

---

#### 시설 운영 (`/admin/facility`)

- 빠른 입장 체크인 (`MemberSearchCombobox`)
- 락커 배정·수건 대여/반납
- 당일 입장·활성 락커 KPI

![시설 운영](assets/full-guide/admin-09-facility.png)

---

#### 마일리지 (`/admin/motionhub`)

MOVE MILE 적립·사용 규칙, 재등록 결제 연동.  
챌린지·시즌 패스 UI는 **게임 오픈 전까지 숨김** (`MOTIONHUB_GAME_ADMIN_ENABLED = false`).

![마일리지](assets/full-guide/admin-10-mileage.png)

---

#### 결제 관리 (`/admin/payments`)

| 탭 | 내용 |
|----|------|
| 가격·요청 | PT·필라테스·요가·GX·소그룹PT·이용권·라커·수건 가격 |
| 결제 요청 | 요청 생성·상태 |
| 계약서 | 전자계약 템플릿 |

**결제 카테고리 ON/OFF** (`payment_category_flags`)로 판매 상품 선택.

**흐름:** 결제 요청 → 회원 앱 계약 서명 → 관리자 수동 완료 → 이용권/PT 자동 등록

![결제 관리](assets/full-guide/admin-11-payments.png)

---

#### 경영관리 (`/admin/analytics`)

| 탭 | URL 파라미터 | 내용 |
|----|--------------|------|
| 경영 대시보드 | `?tab=dashboard` | 인식매출·순이익·회원 건강도 |
| AI 월간 보고서 | `?tab=report` (기본) | 근거 기반 월간 리포트 |
| AI 어시스턴트 | `?tab=assistant` | 경영 Q&A 챗 |

![경영 대시보드](assets/full-guide/admin-12-analytics-dashboard.png)

![AI 월간 보고서](assets/full-guide/admin-13-analytics-report.png)

![AI 어시스턴트](assets/full-guide/admin-14-analytics-assistant.png)

---

#### 메시지 발송 (`/admin/messages`)

- 자동발송 4종 (환영·결제·재등록·PT 리마인더)
- 수동 발송·발송 이력
- 메시지 크레딧 잔여/사용 패널

![메시지 발송](assets/full-guide/admin-15-messages.png)

---

#### 센터 설정 (`/admin/settings`)

- 센터명·로고·테마(브랜딩)
- **기능 관리** (`center_features` 토글)
- 운영 유형 프리셋 (`operational_type`)

![센터 설정](assets/full-guide/admin-16-settings.png)

---

## 6. 회원 앱 (`/member`)

로그인 후 하단/상단 탭으로 이동합니다.

| 탭 | 키 | 기능 |
|----|-----|------|
| 홈 | `home` | 체크인·오늘 일정·요약 |
| 결제 | `payment` | 결제 요청·전자계약 서명 |
| 일정 | `schedule` | PT 일정 조회 |
| 운동일지 | `journal` | 일지 CRUD·사진 |
| 인바디 | `inbody` | 인바디 기록 |
| 마일리지 | `rewards` | 적립·사용·만보 인증 |
| 성장 | `growth` | 마을·성장 시스템 (베타) |
| 마이페이지 | `mypage` | 프로필·설정 |

### 회원 성장(마을) UI 목업

회원 앱 **성장 탭** 디자인 목업입니다 (프로덕션 UI 참고용).

![성장 홈](assets/full-guide/20-member-growth-home.png)

![성장 단계](assets/full-guide/21-member-growth-stages.png)

![성장 전환](assets/full-guide/22-member-growth-convert.png)

---

## 7. 플랫폼 슈퍼관리자 (`/platform`)

| 페이지 | 경로 | 기능 |
|--------|------|------|
| 대시보드 | `/platform` | 센터·베타·활동 KPI |
| 센터 목록 | `/platform/centers` | 정지·삭제·엑셀 |
| 센터 상세 | `/platform/centers/:id` | 이용기간·크레딧 지급 |
| 센터 생성 | `/platform/centers/new` | `operational_type` 선택 |
| 피드백 | `/platform/feedback` | 센터 피드백 |
| 분석 | `/platform/analytics` | 플랫폼 분석 |
| 베타 운영 | `/platform/beta` | 베타 설정 |
| 동의 관리 | `/platform/consents` | 가입 동의 export |
| 베타 신청 | `/platform/beta-applications` | 랜딩 신청 목록 |

---

## 8. 핵심 기능 영역

### 8.1 멀티센터 · SaaS 토글

| 운영 유형 | 키 | 기본 기능 |
|-----------|-----|-----------|
| PT | `pt` | PT·출석·회원 |
| 필라테스 | `pilates` | 클래스·회차권 |
| 요가 | `yoga` | 클래스 |
| 헬스장 | `gym` | 시설·락커·수건 |
| 복합 | `hybrid` | 전 기능 |

**기능 토글 2종류**

| 종류 | 저장 | 용도 |
|------|------|------|
| 운영 기능 | `center_features` | 메뉴·페이지 노출 |
| 결제 카테고리 | `reward_settings.payment_category_flags` | 결제 관리 상품 ON/OFF |

### 8.2 결제 · 전자계약

| 카테고리 | 유형 |
|----------|------|
| PT | 회차권 |
| 필라테스·요가·GX·소그룹PT | 회차권 (`member_session_passes`) |
| 센터 이용권 | 기간권 |
| 라커·수건 | 기간권 |

- 위약금: **총 결제 금액의 10%**
- PG 온라인 결제: **미연동** (관리자 수동 완료)

### 8.3 메시지 · 알림톡

- Solapi Edge Functions
- 센터별 `center_messaging_config`
- 크레딧 0건 시 발송 skipped
- 베타 가입 시 30건 자동 지급 (`provision_center_message_beta_credits`)

### 8.4 마일리지

- 출석·재등록·커스텀 규칙 적립
- 만보 인증·센터 사진 리뷰
- 결제 시 마일 사용

### 8.5 구현 상태 요약

| 영역 | 상태 |
|------|------|
| PT·회원·멀티센터·플랫폼 | ✅ 런칭 가능 |
| 그룹수업·메시지·회원앱·경영분석 | 🟡 동작하나 polish·연동 보강 중 |
| PG·푸시·PT 셀프예약 | ❌ 미구현 |

자세한 감사: [`motionhub-feature-audit.md`](motionhub-feature-audit.md)

---

## 9. MotionHub AI (경영 리포트·어시스턴트)

### 9.1 AI 월간 보고서 (`/admin/analytics?tab=report`)

**현재:** OpenAI 미연결 → **규칙 기반** 리포트 (`ruleBasedProvider.ts`)

리포트 구조 (근거 데이터 기반):
- 이번 달 경영 요약
- 매출·비용·순이익
- 회원 건강도·재등록
- 다음 달 액션 아이템

**OpenAI 연동 준비:** `openaiProvider.ts` + `VITE_OPENAI_API_KEY`

### 9.2 AI 어시스턴트 (`/admin/analytics?tab=assistant`)

자연어 질문 → 의도 감지 → 데이터 기반 답변.

| 의도 | 예시 질문 |
|------|-----------|
| `net_profit` | 이번 달 왜 적자인가요? |
| `renewal_increase` | 재등록을 늘리려면? |
| `at_risk_members` | 이탈 위험 회원은? |
| `trainer_performance` | 트레이너별 성과는? |
| `marketing_direction` | 마케팅 방향은 어떻게 잡을까? |

관련 파일:
- `src/lib/motionHubAiAssistant/answerEngine.ts`
- `src/components/admin/MotionHubAiAssistantPanel.tsx`
- `src/lib/aiMonthlyReport/motionHubAiPrompt.ts`

---

## 10. 베타 시작하기 · 페이지 도움말

### 베타 시작하기

가입 후 6가지를 한 번씩 사용하면 본격 운영 모드로 전환됩니다.  
구현: `BetaStartPage.tsx`, `BetaStartContext`, `betaStartSteps.ts`

### 페이지별 `?` 도움말

모든 주요 관리 페이지 헤더에 **30초 도움말** 버튼 (`PageHelpButton.tsx`).

| 페이지 | 도움말 |
|--------|--------|
| 대시보드 | 매출·재등록·운영 지표 한눈에 |
| 회원 | 등록 시 가입 안내 알림톡 |
| 상담·리드 | 상담 → 회원 전환 |
| 일정 | PT·그룹수업 예약 표시 |
| 클래스 | 주간 시간표·출석 처리 |
| 출석 | 출석 시 리워드 적립 |
| 강사 | 수업료·로그인 계정 |
| 시설 | 빠른 입장 체크인 |
| 마일리지 | 적립 규칙·사용 내역 |
| 결제 | 요청·완료·가격 |
| 경영관리 | AI 리포트·할 일 |
| 메시지 | 발송 이력·수동 발송 |
| 설정 | 브랜딩·기능 토글 |

---

## 11. SEO · 배포

### 배포

- GitHub `main` push → Vercel 자동 배포
- 프로덕션: https://motionhub.kr

### SEO (네이버·구글)

| 항목 | URL/내용 |
|------|----------|
| 소유 확인 메타 | `naver-site-verification` |
| 확인 HTML | `/naver0522ab9ffeda3b6f45ad8b42c55aea27.html` |
| robots.txt | Yeti·NaverBot Allow |
| 사이트맵 | https://motionhub.kr/sitemap.xml |
| OG 이미지 | `/motionhub-og.png` |

**네이버 검색 노출:** [네이버 서치어드바이저](https://searchadvisor.naver.com)에서 사이트 등록 → 사이트맵 제출 → 수집 요청 필요 (구글과 별도).

자세한 내용: [`motionhub-seo-verification.md`](motionhub-seo-verification.md)

---

## 12. 데이터베이스 마이그레이션

Supabase SQL Editor에서 순서대로 실행:

```
064 → 065 → 066 → 067 → 068 → 069 → 070 → 071 → 072 → 073
```

| 마이그레이션 | 내용 |
|--------------|------|
| 069 | SaaS 확장: `center_features`, 클래스·시설 테이블 |
| 070 | 결제 카테고리 pilates/yoga/gx/group_pt |
| 071 | 메시지 크레딧 베타 30건 |
| 072 | 메시지센터 foundation 테이블 |
| 073 | 크레딧 패키지·주문 (PG 전) |

> 069 미적용 센터: 클래스·시설 페이지 DB 오류

---

## 13. 관리자 스크린샷 재캡처

관리자 화면 스크린샷 **16장**은 `docs/assets/full-guide/admin-*.png`에 저장되어 있으며, 위 섹션 5에 이미지로 포함되어 있습니다.

다시 캡처할 때:

```powershell
cd C:\Users\kjh56\Projects\motionhub

# 방법 A: 직접 로그인 (브라우저가 열리면 로그인 후 /admin 이동)
$env:MANUAL_LOGIN = "1"
$env:HEADLESS = "0"
$env:SCREENSHOT_BASE_URL = "https://motionhub.kr"
node scripts/capture-admin-screenshots.mjs

# 방법 B: 환경 변수로 자동 로그인
$env:ADMIN_USERNAME = "관리자아이디"
$env:ADMIN_PASSWORD = "비밀번호"
$env:ADMIN_CENTER_SLUG = "센터-slug"   # 필요 시
node scripts/capture-admin-screenshots.mjs
```

> 기본 브라우저: Windows **Edge** (`PLAYWRIGHT_CHANNEL=chrome` 로 변경 가능)

---

## 14. 관련 문서

| 문서 | 내용 |
|------|------|
| [`implementation-summary.md`](implementation-summary.md) | 구현 현황 요약 |
| [`motionhub-feature-audit.md`](motionhub-feature-audit.md) | 기능 감사·우선순위 |
| [`motionhub-domain-architecture.md`](motionhub-domain-architecture.md) | 도메인·라우팅 |
| [`motionhub-seo-verification.md`](motionhub-seo-verification.md) | SEO 검증 |
| [`message-center-architecture.md`](message-center-architecture.md) | 메시지센터 설계 |
| [`platform-super-admin-report.md`](platform-super-admin-report.md) | 플랫폼 관리 |
| [`README.md`](../README.md) | 로컬 설정·마이그레이션 |

---

*이 문서는 코드·프로덕션 기준으로 작성되었습니다. 기능 추가 시 함께 업데이트하세요.*
