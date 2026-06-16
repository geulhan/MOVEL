# MotionHub Brand Logo Package

**모션허브 (MotionHub)** — 운동센터 운영 SaaS 플랫폼

## Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#2EE8D6` | Symbol, accent, Hub wordmark |
| Dark | `#0F172A` | Backgrounds, light-mode symbol |
| Text on dark | `#F8FAFC` | Wordmark "Motion" |
| Muted | `#94A3B8` | Tagline |

## Symbol Concept

중앙 **허브(Hub)** 노드와 4방향 **연결(Connection)** — 센터·회원·자동화·성장이 하나의 플랫폼으로 모이는 구조를 표현합니다.

## Deliverables

### SVG (`svg/`)

| File | Description |
|------|-------------|
| `symbol-dark.svg` | Symbol — transparent, teal on dark UI |
| `symbol-light.svg` | Symbol — transparent, dark on light UI |
| `wordmark-dark.svg` | Motion**Hub** wordmark — dark backgrounds |
| `wordmark-light.svg` | Wordmark — light backgrounds |
| `combination-dark.svg` | Symbol + wordmark horizontal |
| `combination-light.svg` | Combination — light backgrounds |
| `app-icon.svg` | 1024×1024 app icon with rounded rect |
| `favicon.svg` | 32×32 favicon |
| `motionhub-master.svg` | Master file for Adobe Illustrator |

### PNG (`png/`)

Transparent PNG + on-background variants. Regenerate:

```bash
npm run export:logos
```

### Adobe Illustrator (.ai)

Native `.ai` 바이너리는 Illustrator에서 생성하세요:

1. `svg/motionhub-master.svg` 를 Illustrator에서 **열기**
2. **다른 이름으로 저장 → Illustrator (.ai)**

SVG가 편집 가능한 마스터 소스입니다.

## Usage Guidelines

- **최소 여백**: 심볼 높이의 25% 이상
- **최소 크기**: 심볼 24px, 워드마크 80px 너비
- **다크 UI**: `*-dark` 변형 사용
- **라이트 UI / 인쇄**: `*-light` 변형 사용
- PT샵·개별 센터 로고와 혼용하지 않음 — **플랫폼(SaaS) 전용**

## Web Integration

- `public/favicon.svg` — 사이트 파비콘
- `public/motionhub-og.png` — OG / 소셜 공유 이미지
- `public/apple-touch-icon.png` — iOS 홈 화면
