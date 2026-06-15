# MotionHub SEO · OG 검증 가이드

## 왜 카카오에 "모벨 퍼포먼스"가 보였나

| 원인 | 설명 |
|------|------|
| Vite SPA | 크롤러는 `index.html`만 읽고 React는 실행하지 않음 |
| React Helmet 미사용 | `useMotionHubSeo`는 브라우저 전용 (카카오 무효) |
| 배포본 | `motionhub.kr`이 `index.html`(MOVEL 타이틀, OG 없음)을 서빙 |

## 해결 구조

```
motionhub.kr 요청
    → vercel.json 호스트 분기
    → /motionhub.html (정적 OG·SEO 메타 포함)
    → 동일 React 앱 로드
```

| 파일 | 역할 |
|------|------|
| `motionhub.html` | **크롤러용** 정적 title·og:*·JSON-LD |
| `index.html` | MOVEL 앱 도메인용 (`movel.vercel.app` 등) |
| `vercel.json` | `motionhub.kr` → `motionhub.html` 리라이트 |
| `src/hooks/useMotionHubSeo.ts` | 브라우저 탭·JS 환경 보조 |

## 배포 후 확인 URL

1. **카카오 디버거**  
   https://developers.kakao.com/tool/debugger/sharing  
   입력: `https://motionhub.kr`

2. **Facebook Sharing Debugger**  
   https://developers.facebook.com/tools/debug/  
   입력: `https://motionhub.kr`

3. **원본 HTML (가장 중요)**  
   브라우저에서 `https://motionhub.kr` → 우클릭 → **페이지 소스 보기**  
   또는 터미널:
   ```bash
   curl -s https://motionhub.kr | findstr /i "og:title og:description og:image"
   ```

   기대 결과:
   - `og:title` → `모션허브 | 운동센터 운영 플랫폼`
   - `og:description` → 회원관리, 운동일지…
   - `og:image` → `https://motionhub.kr/motionhub-og.png`
   - `og:site_name` → `모션허브`
   - **모벨 퍼포먼스 문구 없음**

4. **OG 이미지 직접**  
   https://motionhub.kr/motionhub-og.png (200 OK, 1200×630)

## HTTPS / SSL

- 카카오·네이버는 **HTTPS 필수**
- `og:image`도 **절대 URL + HTTPS** 사용 중
- SSL 인증서 오류 시 크롤링 실패 가능 → Vercel 도메인 SSL Active 확인

## 캐시 갱신

카카오·페이스북은 이전 미리보기를 캐시합니다.  
배포 후 디버거에서 **캐시 초기화 / 다시 스크랩** 실행.
