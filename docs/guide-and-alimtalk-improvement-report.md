# 모션허브 가이드·알림톡 개선 보고서

작성일: 2026-06-22  
대상: `member_signup_guide`, `center_welcome`, `/guide` 페이지, 랜딩 UI

---

## 1. 요약

| 항목 | 상태 |
|------|------|
| 회원가입 안내 템플릿 문구 개선 | ✅ 코드·문서 반영 (Solapi 콘솔 재심사 필요) |
| 센터 가입 축하 템플릿 CTA 개선 | ✅ `#{guideUrl}` → `https://motionhub.kr/guide` |
| Guide 페이지 5분 퀵스타트 구조 | ✅ 배포 |
| 랜딩 UI (로고·중앙정렬·기능카드·사례 제거) | ✅ 배포 |
| 카카오 채널 URL | ✅ `http://pf.kakao.com/_rDSXX` |

---

## 2. 수정된 템플릿 문구

### 2.1 `member_signup_guide` (회원가입 안내)

**변수:** `#{centerName}` 만 사용  
**고정 URL:** `https://motionhub.kr/member` (템플릿 본문 고정, 변수 없음)

```
안녕하세요.

#{centerName} 입니다.

회원 등록이 완료되었습니다.

아래 링크에서
예약, 출석, 운동기록 등을
확인하실 수 있습니다.

https://motionhub.kr/member

감사합니다.
```

**개선 포인트**

- 「회원가입」 라벨 제거 → URL만 노출해 모바일에서 탭 영역 확대
- 짧은 줄바꿈으로 카카오톡 가독성 향상

### 2.2 `center_welcome` (센터 가입 축하)

**변수:** `#{guideUrl}` → Edge Function에서 `https://motionhub.kr/guide` 자동 주입  
(`supabase/functions/_shared/templates.ts` → `buildCenterStartGuideUrl()`)

```
모션허브 가입을 축하드립니다.

아래 가이드를 참고하여
회원 등록부터 시작해보세요.

이용가이드
#{guideUrl}

감사합니다.
```

**확인:** `#{guideUrl}` = `https://motionhub.kr/guide` ✅

---

## 3. Guide 페이지 화면 구성

### Hero

- 제목: **모션허브 시작 가이드**
- 부제: 운동센터 운영을 **5분 안에** 시작해 보세요.
- CTA: 관리자 로그인 · 센터 등록

### 퀵스타트 (3단계)

1. 회원 등록 — 회원 추가 및 기본정보 입력  
2. 수강권 등록 — PT / 필라테스 / 요가 / GX  
3. 예약 생성 — PT 및 그룹수업 예약 생성  

→ 3단계 완료 시 기본 운영 가능 강조

### 상세 가이드 (아코디언)

- 회원 등록 · 수강권 등록 · 예약 생성 · 출석 관리 · 알림톡 설정 · 회원앱 안내

### FAQ (아코디언)

- 회원 직접 가입 · 알림톡 채널 · 베타 비용

### 흐름

```
센터 가입 → /guide 확인 → 회원 등록 → 수강권 → 예약 → 운영 시작
```

---

## 4. 랜딩 페이지 UI

| 변경 | 내용 |
|------|------|
| 로고 | `logo-transparent.png` (투명 PNG) — 어두운 헤더에 자연스럽게 합성 |
| 문제·기능·문의 | 섹션 제목·본문 중앙 정렬 |
| 기능 카드 | `[아이콘] 제목` 가로 배치 |
| 실제 운영 사례 | 섹션·네비 탭 제거 |
| 카카오 URL | `http://pf.kakao.com/_rDSXX` |

> **로고 파일:** `public/brand/motionhub/logo-transparent.png`에 사용자 제공 투명 PNG를 넣어 주세요. (현재는 기존 파일 복사본이 placeholder입니다.)

---

## 5. 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `public/brand/motionhub/logo-transparent.png` | 신규 (투명 로고) |
| `src/constants/motionhubBrand.ts` | `logoTransparent` 경로 |
| `src/constants/motionhub.ts` | 카카오 URL |
| `src/constants/alimtalkTemplates.ts` | 템플릿 예시 문구 |
| `src/components/brand/MotionHubLogo.tsx` | 투명 로고 사용 |
| `src/components/landing/LandingNav.tsx` | 사례 탭 제거 |
| `src/components/landing/landingPrimitives.tsx` | `centered`, 인라인 아이콘 |
| `src/pages/MotionHubLandingPage.tsx` | 레이아웃·사례 제거 |
| `src/pages/GuidePage.tsx` | 퀵스타트 + 아코디언 전면 개편 |
| `src/index.css` | 섹션·아이콘 스타일 |
| `.env.example` | 카카오 URL 예시 |
| `docs/guide-and-alimtalk-improvement-report.md` | 본 보고서 |

**변경 없음 (기존 동작 유지)**

- `supabase/functions/_shared/templates.ts` — `guideUrl` / `member` URL 로직 이미 정상
- `src/constants/motionhubGuide.ts` — `MOTIONHUB_CENTER_GUIDE_URL`, `MOTIONHUB_MEMBER_SIGNUP_PORTAL_URL`

---

## 6. 운영 체크리스트 (수동)

1. **Solapi 콘솔**에서 `member_signup_guide`, `center_welcome` 본문을 위 문구로 수정 후 재심사
2. `public/brand/motionhub/logo-transparent.png`를 제공하신 투명 PNG로 교체
3. (선택) Vercel `VITE_MOTIONHUB_KAKAO_URL=http://pf.kakao.com/_rDSXX` 설정

---

## 7. 모바일 화면 검토 (코드 기준)

| 화면 | 검토 |
|------|------|
| Guide Hero | 제목·부제 중앙 정렬, CTA 세로 스택 (`sm` 이상 가로) |
| 퀵스타트 | 모바일 `↓` / 데스크톱 `→` 단계 연결 |
| 아코디언 | 터치 영역 `py-4` 이상, 본문 `15px` 줄간격 1.75 |
| 알림톡 (회원) | 4~6자 단위 줄바꿈, URL 단독 줄 |
| 알림톡 (센터) | 「이용가이드」+ URL 2줄 CTA |

---

## 8. 스크린샷

배포 후 확인 URL:

- 랜딩: https://motionhub.kr/
- 가이드: https://motionhub.kr/guide

로컬: `npm run dev` → `/`, `/guide`

---

## 9. 표기 원칙

사용자 노출 문구는 **모션허브** 한글 표기 우선.  
영문 `MotionHub`는 로고 워드마크·기술 문서에만 사용.
