# MotionHub 센터 시작 가이드 페이지 — 작업 보고서

## 개요

신규 센터가 가입 후 바로 확인할 수 있는 **시작 가이드** 페이지를 `/guide`에 추가했습니다.  
센터 가입 축하 알림톡 `#{guideUrl}` 변수는 `https://motionhub.kr/guide`를 가리킵니다.

---

## 1. `/guide` 페이지

**파일:** `src/pages/GuidePage.tsx`

| 항목 | 내용 |
|------|------|
| URL | `https://motionhub.kr/guide` |
| 제목 | MotionHub 시작 가이드 |
| 대상 | 센터 대표 · 센터 관리자 · 프리랜서 트레이너 |
| 구성 | 7단계 설정 가이드 + FAQ + 문의 |
| UI | cream/charcoal/gold 톤, 모바일 아코디언 카드 |

### 섹션 목록

1. 시작하기  
2. 첫 번째 — 센터 정보 확인  
3. 두 번째 — 관리자 계정 확인  
4. 세 번째 — 회원 등록  
5. 네 번째 — 결제 / 수강권 등록  
6. 다섯 번째 — 예약과 출석 관리  
7. 여섯 번째 — 알림톡 설정 (공용 채널 안내)  
8. 일곱 번째 — 회원앱 안내 (`/member`, `/member?center={코드}`)  
9. 자주 묻는 질문 (3건)  
10. 문의 (카카오채널 버튼)

---

## 2. 랜딩페이지 가이드 링크

**파일:** `src/pages/MotionHubLandingPage.tsx`, `src/components/landing/LandingNav.tsx`, `LandingFooter.tsx`

| 위치 | 링크 |
|------|------|
| 상단 네비게이션 | **이용가이드** → `/guide` |
| 모바일 네비 | **가이드** 버튼 |
| 히어로 CTA | **시작 가이드** 버튼 |
| 하단 CTA | **이용가이드** 버튼 |
| 푸터 | **이용가이드** 링크 |

---

## 3. 센터 가입 축하 `guideUrl` 상수

| 파일 | 상수 |
|------|------|
| `src/constants/motionhubGuide.ts` | `MOTIONHUB_CENTER_GUIDE_URL` = `https://motionhub.kr/guide` |
| `supabase/functions/_shared/alimtalkBrand.ts` | `MOTIONHUB_CENTER_GUIDE_PATH` = `/guide` |
| `supabase/functions/_shared/templates.ts` | `center_welcome` → `buildCenterStartGuideUrl()` |

**회원용 알림톡** `#{guideUrl}`은 기존과 같이 **회원 포털** URL을 사용합니다.  
**센터용** (`center_welcome`, `weekly_report`)만 `/guide`를 사용합니다.

---

## 4. SEO 메타

**파일:** `src/constants/motionhubSeo.ts`, `src/hooks/useMotionHubPageSeo.ts`

| 항목 | 값 |
|------|-----|
| title | MotionHub 시작 가이드 |
| description | 운동센터 운영을 위한 MotionHub 초기 설정 및 이용 방법 안내 |
| og:url | `https://motionhub.kr/guide` |

`sitemap.xml`에 `/guide` URL 추가 (`api/sitemap.js`).

---

## 5. 모바일 대응

- 고정 상단 네비 + `pt-20` 본문 여백
- 아코디언 카드: 터치 영역 넓은 `+` / `−` 버튼
- URL·코드 블록 `break-all` 처리
- 375px 기준 단일 컬럼, CTA 버튼 세로 스택

---

## 6. 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `src/pages/GuidePage.tsx` | **신규** — 가이드 페이지 |
| `src/components/landing/LandingNav.tsx` | **신규** — 공통 네비 + 이용가이드 링크 |
| `src/components/landing/LandingFooter.tsx` | **신규** — 공통 푸터 + 이용가이드 링크 |
| `src/constants/motionhubGuide.ts` | **신규** — `MOTIONHUB_CENTER_GUIDE_URL` |
| `src/constants/motionhubSeo.ts` | `MOTIONHUB_GUIDE_SEO` 추가 |
| `src/hooks/useMotionHubPageSeo.ts` | **신규** — 페이지별 SEO 훅 |
| `src/hooks/useMotionHubSeo.ts` | re-export |
| `src/pages/MotionHubLandingPage.tsx` | 공통 nav/footer, 가이드 링크 |
| `src/App.tsx` | `/guide` 라우트 |
| `src/constants/alimtalkTemplates.ts` | `center_welcome` 예시 문구 |
| `supabase/functions/_shared/templates.ts` | 센터용 `guideUrl` → `/guide` |
| `supabase/functions/_shared/alimtalkBrand.ts` | 가이드 경로 상수 |
| `api/sitemap.js` | `/guide` 추가 |

---

## 7. 확인 방법

1. 로컬: `npm run dev` → `http://localhost:5173/guide`
2. 랜딩 `/` 또는 `/motionhub`에서 **이용가이드** 링크 클릭
3. 브라우저 탭 제목: `MotionHub 시작 가이드`
4. 알림톡 테스트 시 `center_welcome` 변수 `#{guideUrl}` = `https://motionhub.kr/guide`

---

*작성일: 2026-06-05*
