# MotionHub 도메인 아키텍처 설계

> 문서 목적: `motionhub.kr`(랜딩)과 `app.motionhub.kr`(서비스) 분리 및 향후 `{slug}.motionhub.kr` 멀티테넌트 확장을 위한 준비  
> 작성 기준: 현재 코드베이스 (`345d62f` 이후)  
> **본 문서는 설계만 포함하며 코드 변경 사항은 없습니다.**

---

## 1. 목표 도메인 구조

```
motionhub.kr              → MotionHub 마케팅 랜딩 (베타 신청·도입 문의)
www.motionhub.kr          → motionhub.kr 리다이렉트 (권장)

app.motionhub.kr          → 실제 SaaS 앱 (회원·관리자·트레이너 포털)
movel.motionhub.kr        → 1호 센터 테넌트 (향후)
abcpt.motionhub.kr        → 추가 센터 테넌트 (향후)
```

| 도메인 | 역할 | 사용자 |
|--------|------|--------|
| `motionhub.kr` | 브랜드·전환 (랜딩) | 센터 원장·트레이너 (유입) |
| `app.motionhub.kr` | 제품 | 센터 직원·회원 |
| `{slug}.motionhub.kr` | 센터별 진입 (선택) | 해당 센터 회원·직원 |

---

## 2. 현재 코드 상태 점검

### 2.1 `SITE_URL` / `getSiteOrigin()`

**파일:** `src/lib/siteUrl.ts`

| 항목 | 현재 동작 |
|------|-----------|
| `DEFAULT_SITE_ORIGIN` | `https://movel.vercel.app` |
| `VITE_SITE_URL` | 설정 시 배포 origin 대체 |
| `getSiteOrigin()` | 브라우저 `window.location.origin` 우선 |

**한계**

- 환경 변수가 단일 origin만 가정 (`VITE_SITE_URL` 하나).
- 랜딩 도메인(`motionhub.kr`)과 앱 도메인(`app.motionhub.kr`)을 구분하지 않음.
- 회원·관리자 URL 생성 시 항상 **현재 접속 origin** 기준이라, 랜딩에서 복사되는 링크가 `motionhub.kr/member` 형태가 될 수 있음.

### 2.2 `RootPage` / 호스트 분기

**파일:** `src/pages/RootPage.tsx`

```ts
host.includes('motionhub') → MotionHubLandingPage
그 외 → HomePage (MOVEL 허브)
```

| 호스트 | `/` 결과 |
|--------|----------|
| `motionhub.kr` | 랜딩 |
| `www.motionhub.kr` | 랜딩 |
| `app.motionhub.kr` | **랜딩** (문제: `motionhub` 문자열 포함) |
| `movel.motionhub.kr` | **랜딩** (문제: 동일) |
| `movel.vercel.app` | MOVEL 허브 |

**한계**

- `includes('motionhub')`는 서브도메인까지 랜딩으로 보냄.
- `app.motionhub.kr` 도입 시 **반드시 분기 로직 수정 필요**.

### 2.3 라우팅

**파일:** `src/App.tsx`

- `/` → `RootPage` (호스트 분기)
- `/motionhub` → 랜딩 (항상)
- `/member`, `/admin`, `/login` 등 → 동일 SPA

**한계**

- 한 빌드에 랜딩·앱이 공존.
- `motionhub.kr/admin` 등 앱 경로도 기술적으로 열림.

### 2.4 SEO / OG (최근 반영)

| 파일 | 역할 |
|------|------|
| `motionhub.html` | `motionhub.kr` 크롤러용 정적 MotionHub 메타 |
| `vercel.json` | `motionhub.kr` → `motionhub.html` 리라이트 |
| `index.html` | MOVEL 앱 도메인용 (모벨 타이틀 유지) |

### 2.5 센터 식별

**파일:** `src/lib/center.ts`

- `DEFAULT_CENTER_SLUG = 'movel'`
- `getCurrentCenterId()` → 항상 기본 센터 (호스트·slug 미반영)

---

## 3. 목표 아키텍처 (향후)

```
                    ┌─────────────────────┐
                    │   motionhub.kr      │
                    │   (랜딩 전용 HTML)    │
                    │   motionhub.html    │
                    └──────────┬──────────┘
                               │ CTA → app.motionhub.kr
                               ▼
                    ┌─────────────────────┐
                    │ app.motionhub.kr    │
                    │ (SaaS 앱 SPA)       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
      movel.motionhub.kr  abcpt.motionhub.kr  …
      (선택: slug 서브도메인 또는 app 경로 /c/movel)
```

**권장 원칙**

1. **랜딩과 앱 도메인 분리** — OG·SEO·보안 경계 명확화
2. **테넌트 식별** — 서브도메인 slug 또는 `app` + path
3. **환경 변수 2계층** — `VITE_PLATFORM_URL`, `VITE_APP_URL`

---

## 4. `app.motionhub.kr` 도입 시 수정 파일·작업 목록

### Phase A — 도메인·배포 (인프라)

| # | 작업 | 상세 |
|---|------|------|
| A1 | Vercel 도메인 추가 | `app.motionhub.kr` → 동일 또는 별도 프로젝트 |
| A2 | DNS | `app` CNAME → Vercel |
| A3 | `vercel.json` 분기 | `motionhub.kr`만 `motionhub.html`, `app.*`는 `index.html` |
| A4 | SSL | 와일드카드 `*.motionhub.kr` (멀티테넌트 시) |

### Phase B — 호스트 분기 리팩터 (필수)

| # | 파일 | 작업 |
|---|------|------|
| B1 | `src/pages/RootPage.tsx` | `isPlatformLandingHost()` 재정의: **정확히** `motionhub.kr` / `www.motionhub.kr`만 랜딩. `app.`, `movel.` 등 서브도메인 제외 |
| B2 | `src/lib/siteUrl.ts` | `getAppOrigin()`, `getPlatformOrigin()` 분리 |
| B3 | `src/constants/motionhub.ts` | `getMotionHubDemoUrl()` → `VITE_APP_URL/member` 또는 MOVEL 데모 URL |
| B4 | `motionhub.html` | `og:url` 유지 `https://motionhub.kr`, CTA 링크 `https://app.motionhub.kr` |

**`RootPage` 분기 예시 (설계)**

```
랜딩: hostname === 'motionhub.kr' || hostname === 'www.motionhub.kr'
앱 루트(/): app.motionhub.kr → /login 또는 센터 선택
slug: movel.motionhub.kr → slug 파싱 후 /member 등
```

### Phase C — 환경 변수

| 변수 | 용도 | 예시 |
|------|------|------|
| `VITE_PLATFORM_URL` | 랜딩·OG canonical | `https://motionhub.kr` |
| `VITE_APP_URL` | 회원·관리자 링크 생성 | `https://app.motionhub.kr` |
| `VITE_SITE_URL` | (레거시) `VITE_APP_URL`로 통합 검토 | |
| `VITE_DEFAULT_CENTER_SLUG` | 단일 센터 fallback | `movel` |
| `VITE_DEMO_URL` | 랜딩 데모 버튼 | `https://app.motionhub.kr/member` |

**수정 파일:** `.env.example`, Vercel 프로젝트 환경 변수, `siteUrl.ts`, `motionhub.ts`

### Phase D — 테넌트(센터) slug 연동

| # | 파일 | 작업 |
|---|------|------|
| D1 | `src/lib/center.ts` | `parseCenterSlugFromHost()` — `movel.motionhub.kr` → `movel` |
| D2 | `src/lib/center.ts` | `getCurrentCenterId()` — slug로 DB `centers` 조회 |
| D3 | `supabase/centers` | slug unique, status active 검증 |
| D4 | 캐시 | slug별 `center_id` 캐시, `resetCenterIdCache()` 확장 |

### Phase E — UX·링크 정리

| # | 파일 | 작업 |
|---|------|------|
| E1 | `src/pages/HomePage.tsx` | `app` 도메인 전용 허브 또는 제거 |
| E2 | `src/pages/MotionHubLandingPage.tsx` | 데모·베타 CTA가 `app` URL 가리키도록 |
| E3 | `src/components/SiteUrlCopy.tsx` | 앱 URL 사용 |
| E4 | 알림·Edge Functions | 메시지 내 링크 `VITE_APP_URL` 기준 |

### Phase F — SEO·보안 (선택)

| # | 작업 |
|---|------|
| F1 | `motionhub.kr`에서 `/admin`, `/member` 301 → `app.motionhub.kr` (Vercel redirect rules) |
| F2 | `robots.txt` / `sitemap.xml` 랜딩 전용 |
| F3 | 센터별 OG는 앱 도메인·센터 브랜드 (MotionHub와 분리) |

---

## 5. 마이그레이션 순서 (권장)

```
1. motionhub.kr 랜딩 + OG 안정화 (완료 방향)
2. app.motionhub.kr DNS·Vercel 연결
3. RootPage 호스트 분기 수정 (app 서브도메인 랜딩 오노출 방지)
4. VITE_APP_URL 도입, 데모·회원 링크 수정
5. movel.vercel.app → app.motionhub.kr 리다이렉트 (또는 병행 운영)
6. getCurrentCenterId() slug 연동
7. movel.motionhub.kr 파일럿
8. 신규 센터 abcpt.motionhub.kr 온보딩 자동화
```

---

## 6. 별도 Vercel 프로젝트 여부

| 방식 | 장점 | 단점 |
|------|------|------|
| **1프로젝트 + 호스트 분기** (현재) | 배포 단순, 코드 공유 | redirect·OG·경계 설정 복잡 |
| **2프로젝트** (랜딩 / 앱) | 도메인·메타 완전 분리 | 이중 배포, 공통 코드 패키지화 필요 |

**단기:** 1프로젝트 + `motionhub.html` / `vercel.json` host 분기  
**중기:** `app.motionhub.kr` 분기 수정 후 1프로젝트 유지 가능  
**장기:** 센터 수·팀 규모 커지면 랜딩 전용 프로젝트 분리 검토

---

## 7. 체크리스트 (`app.motionhub.kr` 오픈 전)

- [ ] `RootPage`에서 `app.motionhub.kr`이 랜딩으로 가지 않는지
- [ ] 랜딩 데모 버튼이 `app.motionhub.kr`을 가리키는지
- [ ] 카카오 OG 디버거에서 `motionhub.kr` → MotionHub 제목·이미지
- [ ] `app.motionhub.kr/member` 회원 로그인 정상
- [ ] Supabase redirect URL / CORS에 `app.motionhub.kr` 등록
- [ ] 기존 `movel.vercel.app` 북마크 리다이렉트 정책 결정

---

## 8. 관련 파일 인덱스

| 구분 | 경로 |
|------|------|
| 랜딩 페이지 | `src/pages/MotionHubLandingPage.tsx` |
| 루트 분기 | `src/pages/RootPage.tsx` |
| 라우팅 | `src/App.tsx` |
| 사이트 URL | `src/lib/siteUrl.ts` |
| 센터 ID | `src/lib/center.ts` |
| 랜딩 상수 | `src/constants/motionhub.ts` |
| SEO 상수 | `src/constants/motionhubSeo.ts` |
| 정적 OG HTML | `motionhub.html` |
| MOVEL 앱 HTML | `index.html` |
| Vercel 라우팅 | `vercel.json` |
| OG 이미지 | `public/motionhub-og.png` |

---

*이 문서는 SaaS 도메인 전환 시 참고용입니다. 구현 시 브랜치·PR 단위로 Phase별 적용을 권장합니다.*
