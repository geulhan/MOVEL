# BlogBrain 개발 환경 설정 가이드

BlogBrain은 **AI Blog Operating System**입니다. React + TypeScript + Supabase + Edge Functions 기반이며, Sprint 1~4까지 Auth, Learning Layer, Learning Agent, Pattern Agent가 구현되어 있습니다.

이 문서를 따라하면 **처음 clone한 개발자도 약 10~15분 안에** 로컬에서 앱을 실행하고 Sprint 1~4를 검증할 수 있습니다.

---

## 사전 요구사항

| 도구 | 버전 | 용도 |
|------|------|------|
| Node.js | 18+ (20 LTS 권장) | 프론트엔드 빌드/실행 |
| npm | 9+ | 패키지 설치 |
| Git | 최신 | 버전 관리 |
| Supabase CLI | 최신 | Migration, Edge Function, Secrets |
| OpenAI API Key | — | Learning / Pattern Agent |
| GitHub 계정 | — | Repository, Vercel 연동 (선택) |

---

## 1. GitHub Repository 생성 방법

BlogBrain을 **독립 Repository**로 운영하는 것을 권장합니다. (모노레포 내부에 두는 경우 Vercel Root Directory만 `blogbrain`으로 지정하면 됩니다.)

### 1.1 새 Repository 생성

1. [GitHub](https://github.com/new) → **New repository**
2. 아래 값 입력:

| 항목 | 권장값 |
|------|--------|
| Repository name | `blogbrain` |
| Description | `AI Blog Operating System — BlogBrain` |
| Visibility | Private (팀) / Public (오픈소스) |
| Initialize | **README, .gitignore, license 추가하지 않음** (로컬 코드가 이미 있는 경우) |

**대안 이름:** `blogbrain-os`, `blogbrain-app`

### 1.2 Git 초기화 (로컬에 코드만 있는 경우)

```bash
cd blogbrain

git init
git add .
git commit -m "Initial commit: BlogBrain Sprint 1-4"
```

### 1.3 Remote 연결

```bash
git remote add origin https://github.com/<YOUR_ORG>/blogbrain.git
git branch -M main
git push -u origin main
```

SSH 사용 시:

```bash
git remote add origin git@github.com:<YOUR_ORG>/blogbrain.git
```

### 1.4 첫 Commit (이미 commit이 있는 경우)

```bash
git status
git add .
git commit -m "chore: add setup documentation"
git push origin main
```

### 1.5 Branch 전략

| Branch | 용도 | 병합 대상 |
|--------|------|-----------|
| `main` | Production-ready 코드 | — |
| `develop` | 통합 개발 브랜치 | `main` (릴리스 시) |
| `feature/*` | 기능 단위 작업 | `develop` |

**예시 워크플로:**

```bash
# develop 생성 (최초 1회)
git checkout -b develop
git push -u origin develop

# 기능 개발
git checkout develop
git pull
git checkout -b feature/sprint5-writer-agent

# 작업 후
git push -u origin feature/sprint5-writer-agent
# → GitHub에서 develop으로 PR
```

**규칙 요약:**

- `main`에는 검증된 코드만 merge
- `feature/*`는 Sprint/기능 단위로 분리 (`feature/sprint4-patterns` 등)
- Hotfix는 `main`에서 `hotfix/*` → `main` + `develop` 양쪽 merge

---

## 2. Supabase 프로젝트 생성

### 2.1 새 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard) → **New project**
2. **Organization** 선택 (없으면 생성)
3. 아래 항목 설정:

| 항목 | 권장값 |
|------|--------|
| Project name | `blogbrain-dev` (개발) / `blogbrain-prod` (운영) |
| Database password | 16자 이상 강력한 비밀번호 (반드시 저장) |
| Region | 사용자와 가까운 리전 (예: `Northeast Asia (Seoul)`) |

4. **Create new project** 클릭 → 프로비저닝 완료까지 1~2분 대기

### 2.2 Project URL / Anon Key 확인

Dashboard → **Project Settings** (⚙️) → **API**

| 값 | 용도 | 저장 위치 |
|----|------|-----------|
| **Project URL** | Supabase API 엔드포인트 | `.env.local` → `VITE_SUPABASE_URL` |
| **anon public** | 클라이언트용 공개 키 | `.env.local` → `VITE_SUPABASE_ANON_KEY` |
| **service_role** | 서버 전용 (비밀) | Edge Function 자동 주입, **프론트에 넣지 않음** |

> `service_role` key는 RLS를 우회합니다. Git / `.env.local` / Vercel에 노출하지 마세요.

---

## 3. Environment 설정

### 3.1 `.env.local` 생성

```bash
cd blogbrain
cp .env.example .env.local
```

### 3.2 환경 변수 설명

| 변수 | 필수 | 설명 |
|------|------|------|
| `VITE_SUPABASE_URL` | ✅ | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon public key |
| `VITE_OPENAI_API_KEY` | ❌ | 로컬에서 클라이언트 Agent 테스트 시에만 사용. **운영은 Edge Function Secret 사용** |
| `VITE_OPENAI_MODEL` | ❌ | 클라이언트 테스트용 모델명 (기본 `gpt-4o-mini`) |

### 3.3 예시

```env
# blogbrain/.env.local

VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 아래는 Edge Function 없이 src/ai Agent를 직접 테스트할 때만
# VITE_OPENAI_API_KEY=sk-...
# VITE_OPENAI_MODEL=gpt-4o-mini
```

> Vite는 `VITE_` 접두사가 붙은 변수만 클라이언트에 노출합니다.

---

## 4. Database Migration

Migration은 **001 → 004 순서**로 적용합니다. 순서를 바꾸면 FK·함수 오류가 발생합니다.

| 순서 | 파일 | Sprint | 내용 |
|------|------|--------|------|
| 1 | `supabase/migrations/001_saas_foundation.sql` | 1 | Auth, Workspace, Project, Brain |
| 2 | `supabase/migrations/002_sprint2_learning_layer.sql` | 2 | Sources, Knowledge, Learning |
| 3 | `supabase/migrations/003_sprint3_agent_foundation.sql` | 3 | Agent runs, Analyses, Candidates |
| 4 | `supabase/migrations/004_sprint4_pattern_intelligence.sql` | 4 | Pattern versions, items, diffs |

### 4.1 SQL Editor 실행 (가장 빠른 방법)

1. Supabase Dashboard → **SQL Editor** → **New query**
2. `001_saas_foundation.sql` 파일 내용 **전체** 복사 → **Run**
3. Success 확인 후 `002` → `003` → `004` 동일하게 반복

### 4.2 Supabase CLI 사용

**CLI 설치 (Windows — Scoop):**

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**macOS (Homebrew):**

```bash
brew install supabase/tap/supabase
```

**npm (공통):**

```bash
npm install -g supabase
```

**적용:**

```bash
cd blogbrain
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push
```

`project-ref`는 Project URL의 subdomain입니다.  
`https://abcdefghijklmnop.supabase.co` → ref는 `abcdefghijklmnop`

Dashboard → **Project Settings** → **General** → **Reference ID**에서도 확인 가능.

### 4.3 Migration 적용 확인

SQL Editor에서 실행:

```sql
-- 핵심 테이블 11개 존재 확인
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles', 'workspaces', 'workspace_members', 'projects', 'project_brains',
    'project_sources', 'knowledge_entities', 'learning_articles',
    'learning_analyses', 'pattern_candidates',
    'pattern_versions', 'pattern_items', 'agent_runs'
  )
order by table_name;

-- Sprint 4 컬럼 확인
select column_name
from information_schema.columns
where table_name = 'project_brains'
  and column_name in ('current_pattern_version_id', 'pattern_count');
```

**기대:** 테이블 목록 출력, `current_pattern_version_id` / `pattern_count` 컬럼 존재

---

## 5. OpenAI 설정

OpenAI API는 **Supabase Edge Function Secret**으로만 등록합니다. 프론트 `.env`에 OpenAI Key를 넣지 않아도 Sprint 1~4 검증이 가능합니다.

### 5.1 Secret 등록

```bash
cd blogbrain
supabase secrets set OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

| Secret | 필수 | 설명 |
|--------|------|------|
| `OPENAI_API_KEY` | ✅ | OpenAI API 인증 |
| `OPENAI_MODEL` | 선택 | 미설정 시 `gpt-4o-mini` 사용 |

### 5.2 Secret 확인

```bash
supabase secrets list
```

### 5.3 Secret 변경 시 재배포

Secret만 바꿔도 반영되지만, **안전하게 Edge Function을 재배포**합니다:

```bash
supabase functions deploy run-learning-agent
supabase functions deploy run-pattern-agent
```

---

## 6. Edge Function 배포

### 6.1 Supabase CLI 설치

[4.2절](#42-supabase-cli-사용) 참고.

### 6.2 Login

```bash
supabase login
```

브라우저에서 Supabase 계정 인증.

### 6.3 Project Link

```bash
cd blogbrain
supabase link --project-ref <YOUR_PROJECT_REF>
```

Database password 입력 요청 시 프로젝트 생성 시 설정한 비밀번호 입력.

### 6.4 Function 배포

**순서:** Learning Agent → Pattern Agent

```bash
supabase functions deploy run-learning-agent
supabase functions deploy run-pattern-agent
```

| Function | 역할 |
|----------|------|
| `run-learning-agent` | 글 1건 분석 → knowledge + pattern_candidates |
| `run-pattern-agent` | 프로젝트 패턴 종합 → pattern_versions / items |

Edge Function은 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`를 Supabase가 자동 주입합니다.

### 6.5 배포 확인

```bash
supabase functions list
```

Dashboard → **Edge Functions** → 두 함수 **Active** 상태 확인.

### 6.6 로그 확인

```bash
# 실시간 로그
supabase functions logs run-learning-agent --follow
supabase functions logs run-pattern-agent --follow
```

Dashboard → Edge Functions → 함수 선택 → **Logs** 탭.

---

## 7. 로컬 실행

### 7.1 의존성 설치

```bash
cd blogbrain
npm install
```

### 7.2 개발 서버 실행

```bash
npm run dev
```

출력 예:

```
  VITE v6.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### 7.3 localhost 접속

브라우저에서 `http://localhost:5173` 접속.

- 미로그인 → `/login` 리다이렉트
- 로그인 후 → `/projects`

### 7.4 테스트 계정 생성

1. `/login` → **계정이 없으신가요? 회원가입**
2. 이메일 / 비밀번호(8자+) / 표시 이름 입력
3. 로그인 성공 시 Workspace가 자동 생성됨 (`{이름}'s Workspace`)

### 7.5 이메일 인증 OFF 설정 (개발 편의)

Supabase Dashboard → **Authentication** → **Providers** → **Email**:

- **Confirm email** → **OFF**

이 설정이 **ON**이면 가입 후 이메일 확인 링크 클릭 전까지 로그인되지 않을 수 있습니다.

---

## 8. Sprint 1~4 검증

아래 순서로 **end-to-end** 동작을 확인합니다. 상세 체크리스트는 [sprint1-4-verification-guide.md](./sprint1-4-verification-guide.md) 참고.

### 8.1 Sprint 1 — Auth & Project OS

| 단계 | 경로 | 확인 |
|------|------|------|
| 회원가입 | `/login` | 로그인 성공 |
| Workspace | Sidebar 상단 | 자동 생성된 Workspace 표시 |
| Project 생성 | `/projects` | **새 프로젝트** → Brain Dashboard 진입 |
| Navigation | Sidebar | Brain, Sources, Knowledge, Learning, Patterns |

### 8.2 Sprint 2 — Learning Foundation

| 단계 | 경로 | 확인 |
|------|------|------|
| Source 등록 | `/p/<slug>/sources` | 참고 블로그/채널 1개 이상 |
| Knowledge 등록 | `/p/<slug>/knowledge` | 엔티티 수동 추가 (선택) |
| Learning 등록 | `/p/<slug>/learning` | **글 학습** → 제목+본문 저장 |

### 8.3 Sprint 3 — Learning Agent

| 단계 | 동작 | 확인 |
|------|------|------|
| Learning Agent 실행 | 글 저장 시 **자동** | `analysis_status`: completed |
| 분석 결과 | Learning 카드 확장 | title_pattern, intro_pattern 등 |
| Knowledge | Knowledge 페이지 | Agent가 upsert한 엔티티 |
| Dashboard | `/p/<slug>` | Recent Analysis, Recent Discoveries |

**팁:** Pattern Agent 품질을 위해 **비슷한 스타일 글 2~3편**을 Learning에 등록하세요.

### 8.4 Sprint 4 — Pattern Agent

| 단계 | 경로 | 확인 |
|------|------|------|
| Pattern Agent 실행 | `/p/<slug>/patterns` | **Run Pattern Agent** 클릭 |
| Pattern DB | Patterns UI | Active `v1.0`, 카테고리 탭, Pattern cards |
| Dashboard | Brain Dashboard | Pattern Version, Count, Avg Confidence |

두 번째 실행 시 `v1.1` 생성 및 Diff Summary 표시.

### 8.5 Dashboard 최종 확인

Brain Dashboard (`/p/<slug>`)에서:

- [ ] Brain Score (0~100)
- [ ] Learning / Knowledge / Sources / Patterns 카운트
- [ ] Brain Memory (최근 데이터)
- [ ] Activity Feed
- [ ] Recent Analysis / Discoveries / Pattern Updates

**Brain Score 공식 (Sprint 4):**

```
min(100, learning×2 + knowledge×1 + relationships×1 + sources×0.5 + patterns×0.25)
```

---

## 9. Vercel 배포

BlogBrain은 Vite SPA입니다. Supabase Edge Function은 Vercel이 아닌 **Supabase에서 별도 배포**합니다.

### 9.1 GitHub 연결

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New…** → **Project**
2. GitHub Repository `blogbrain` Import
3. **Framework Preset:** Vite
4. **Root Directory:** `blogbrain` (모노레포인 경우). 독립 repo면 `.` 유지

### 9.2 Environment Variables 등록

Vercel → Project → **Settings** → **Environment Variables**

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_SUPABASE_URL` | Supabase Project URL | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | anon public key | Production, Preview, Development |

> OpenAI Key는 Vercel에 등록하지 않습니다. Edge Function Secret만 사용.

### 9.3 Production 배포

```bash
git push origin main
```

Vercel이 `main` push 시 자동 Production deploy.

수동 deploy: Vercel Dashboard → **Deployments** → **Redeploy**

### 9.4 Preview 배포

`develop` 또는 `feature/*` branch push 시 Preview URL 자동 생성.

```bash
git push origin feature/my-feature
# → Vercel Preview URL (예: blogbrain-xxx.vercel.app)
```

### 9.5 Supabase Auth Redirect (Production)

Supabase Dashboard → **Authentication** → **URL Configuration**:

| 항목 | 값 |
|------|-----|
| Site URL | `https://your-app.vercel.app` |
| Redirect URLs | `https://your-app.vercel.app/**`, `http://localhost:5173/**` |

---

## 10. Troubleshooting

문제 발생 시 **아래 순서**로 확인합니다.

```
1. .env.local (URL, anon key)
2. Migration 001~004 적용 여부
3. Edge Function 배포 + OpenAI Secret
4. Auth 이메일 confirm 설정
5. Browser DevTools → Network / Console
6. supabase functions logs
```

### 자주 발생하는 오류

| 증상 | 원인 | 해결 |
|------|------|------|
| 로그인 안 됨 | `.env.local` 오류 / email confirm ON | URL·anon key 재확인, confirm OFF |
| 빈 화면 / Supabase 오류 | env 미설정 | `VITE_SUPABASE_*` 확인, dev 서버 재시작 |
| `relation "xxx" does not exist` | Migration 미적용 | 001→004 순서 재실행 |
| RLS permission denied | workspace membership 없음 | 재로그인, workspace bootstrap 확인 |
| Learning Agent `Unauthorized` | 세션 만료 | 로그아웃 후 재로그인 |
| Learning Agent `Failed` | OpenAI Secret / quota | `OPENAI_API_KEY` 설정, OpenAI 결제·quota 확인 |
| Pattern Agent `No pattern candidates...` | Learning 미완료 | Learning 글 저장 → completed 확인 후 재시도 |
| Edge Function 500 | Secret / deploy | secrets list, function 재배포, logs 확인 |
| CORS error | Function 미배포 | `run-learning-agent` deploy 확인 |
| Brain Score 0 | recompute 함수 없음 | migration 004 재적용 |
| Vercel 빌드 실패 | env 누락 | Vercel Environment Variables 등록 |

### 로그 확인 명령

```bash
supabase functions logs run-learning-agent --follow
supabase functions logs run-pattern-agent --follow
```

### 브라우저 Network 디버깅

1. DevTools → **Network**
2. `run-learning-agent` 또는 `run-pattern-agent` 요청 선택
3. Status code, Response body의 `error` 필드 확인

---

## 11. 프로젝트 구조 설명

### 11.1 폴더 구조

```
blogbrain/
├── docs/                          # 문서
│   ├── setup.md                   # 이 문서
│   └── sprint1-4-verification-guide.md
├── public/                        # 정적 파일
├── src/
│   ├── ai/                        # AI Engine (클라이언트 Agent OS)
│   ├── app/                       # Router, Providers
│   ├── components/                # UI, Layout (AppShell, Sidebar)
│   ├── features/                  # Feature-first 모듈
│   │   ├── auth/
│   │   ├── workspace/
│   │   ├── projects/
│   │   ├── sources/
│   │   ├── knowledge/
│   │   ├── learning/
│   │   ├── patterns/
│   │   ├── agents/                # Edge Function invoke API
│   │   └── brain/
│   ├── lib/                       # supabase client, utils
│   ├── pages/                     # Route 페이지
│   ├── styles/
│   └── types/                     # database.ts
├── supabase/
│   ├── migrations/                # 001 ~ 004 SQL
│   └── functions/                 # Edge Functions
│       ├── run-learning-agent/
│       ├── run-pattern-agent/
│       └── _shared/               # 공유 AI / CORS / Admin
├── .env.example
├── package.json
└── vite.config.ts
```

**Feature 모듈 내부 패턴:**

```
features/<name>/
├── api/          # Supabase CRUD, Edge Function invoke
├── hooks/        # React Query hooks
├── components/   # UI
└── types/        # TypeScript types
```

### 11.2 AI Engine 구조 (`src/ai/`)

Sprint 3부터 도입된 **Agent-based AI OS** 레이어입니다. 프론트에서는 타입·스키마·Agent 구조를 유지하고, **실제 OpenAI 호출은 Edge Function**에서 수행합니다.

```
src/ai/
├── core/
│   ├── AIProvider.ts           # Provider 인터페이스
│   ├── AgentManager.ts         # Agent 등록 / 실행
│   ├── PromptBuilder.ts        # Learning 프롬프트 조립
│   ├── ResultParser.ts         # JSON 추출 + Zod 검증 + retry
│   └── providers/
│       └── OpenAIProvider.ts   # (로컬 테스트용)
├── agents/
│   ├── BaseAgent.ts
│   ├── LearningAgent.ts        # 글 1건 분석
│   └── PatternAgent.ts         # 패턴 종합 분석
├── schemas/
│   ├── learningAnalysisSchema.ts
│   └── patternAnalysisSchema.ts
├── prompts/                    # Markdown 프롬프트 템플릿
└── types/
```

**데이터 흐름:**

```
Learning UI 저장
  → supabase.functions.invoke('run-learning-agent')
  → learning_analyses + pattern_candidates + knowledge upsert

Patterns UI Run Agent
  → supabase.functions.invoke('run-pattern-agent')
  → pattern_versions + pattern_items + diffs
  → project_brains.current_pattern_version_id 갱신
```

### 11.3 Supabase 구조

**핵심 테이블 (Sprint별):**

| Sprint | 테이블 |
|--------|--------|
| 1 | `profiles`, `workspaces`, `workspace_members`, `projects`, `project_brains` |
| 2 | `project_sources`, `knowledge_entities`, `knowledge_relationships`, `learning_articles`, `brain_activity_logs` |
| 3 | `agent_runs`, `learning_analyses`, `pattern_candidates` |
| 4 | `pattern_versions`, `pattern_items`, `pattern_version_diffs` |

**RLS:** 모든 public 테이블은 workspace membership 기반 Row Level Security 적용.

**Brain Score:** `recompute_project_brain()` 함수가 learning/knowledge/sources/relationships/patterns 카운트로 점수 계산 (migration 004).

### 11.4 Edge Function 구조

```
supabase/functions/
├── run-learning-agent/
│   └── index.ts              # HTTP handler, auth, pipeline 호출
├── run-pattern-agent/
│   └── index.ts
└── _shared/
    ├── cors.ts
    ├── supabaseAdmin.ts      # service_role + user client
    └── ai/
        ├── learningAgent.ts      # OpenAI 호출
        ├── learningPipeline.ts   # DB 저장 (analysis, knowledge, candidates)
        ├── patternAgent.ts
        ├── patternPipeline.ts    # version, items, diffs, brain update
        ├── learningAnalysisSchema.ts
        ├── patternAnalysisSchema.ts
        └── prompts/              # 서버용 프롬프트 (src/ai와 동기화)
```

**Edge Function 공통 패턴:**

1. CORS preflight (`OPTIONS`)
2. `Authorization` 헤더로 사용자 인증 (RLS client)
3. `service_role` admin client로 agent_runs / pipeline DB 작업
4. OpenAI 호출 → Zod JSON 검증 → DB persist
5. Brain Activity + Score 재계산

---

## 빠른 시작 (Quick Start)

전체 과정을 **한 번에** 실행할 때:

```bash
# 1. Clone & install
git clone https://github.com/<YOUR_ORG>/blogbrain.git
cd blogbrain
cp .env.example .env.local
# .env.local에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 입력
npm install

# 2. Supabase (Dashboard SQL Editor에서 001→004 실행 후)
supabase login
supabase link --project-ref <REF>
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-4o-mini
supabase functions deploy run-learning-agent
supabase functions deploy run-pattern-agent

# 3. Run
npm run dev
# → http://localhost:5173
```

**예상 소요 시간:** Supabase 프로젝트 생성 포함 **10~15분**

---

## 관련 문서

- [Sprint 1~4 검증 가이드](./sprint1-4-verification-guide.md) — 상세 테스트 절차·체크리스트·샘플 데이터
- [README](../README.md) — Sprint별 Scope 요약
