# BlogBrain Sprint 1~4 검증 실행 가이드

Sprint 1~4 기능이 **실제 환경에서 end-to-end로 동작하는지** 확인하기 위한 테스트 환경 구성 및 실행 절차입니다.

> **전제:** Supabase 프로젝트 1개, OpenAI API Key 1개, Node.js 18+

---

## 1. Supabase Migration 순서

Migration은 **반드시 아래 순서대로** 적용합니다. 순서를 바꾸거나 건너뛰면 FK·함수·RLS 오류가 발생합니다.

| 순서 | 파일 | Sprint | 주요 내용 |
|------|------|--------|-----------|
| 1 | `supabase/migrations/001_saas_foundation.sql` | 1 | profiles, workspaces, projects, project_brains, RLS |
| 2 | `supabase/migrations/002_sprint2_learning_layer.sql` | 2 | sources, knowledge, learning, brain_activity, Brain Score |
| 3 | `supabase/migrations/003_sprint3_agent_foundation.sql` | 3 | agent_runs, learning_analyses, pattern_candidates |
| 4 | `supabase/migrations/004_sprint4_pattern_intelligence.sql` | 4 | pattern_versions, pattern_items, pattern_version_diffs |

### 적용 방법 A — Supabase Dashboard (권장, 가장 단순)

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **SQL Editor** → **New query**
3. `001` → `002` → `003` → `004` 순서로 파일 내용 전체 복사 후 **Run**
4. 각 migration 실행 후 **Success** 확인

### 적용 방법 B — Supabase CLI

```bash
cd blogbrain
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>

# migrations 폴더 기준 일괄 적용
supabase db push
```

### Migration 검증 SQL

```sql
-- 핵심 테이블 존재 확인
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles', 'workspaces', 'projects', 'project_brains',
    'learning_articles', 'learning_analyses', 'pattern_candidates',
    'pattern_versions', 'pattern_items', 'pattern_version_diffs',
    'agent_runs'
  )
order by table_name;

-- project_brains에 Sprint 4 컬럼 확인
select column_name
from information_schema.columns
where table_name = 'project_brains'
  and column_name in ('current_pattern_version_id', 'pattern_count');
```

**기대 결과:** 11개 테이블 모두 존재, `current_pattern_version_id` / `pattern_count` 컬럼 존재

---

## 2. Edge Function 배포 순서

Edge Function은 **Learning Agent → Pattern Agent** 순으로 배포합니다. Pattern Agent는 Learning 결과(`pattern_candidates`, `learning_analyses`)가 있어야 동작합니다.

| 순서 | Function | 경로 | 역할 |
|------|----------|------|------|
| 1 | `run-learning-agent` | `supabase/functions/run-learning-agent/` | 글 1건 분석 → knowledge + pattern_candidates |
| 2 | `run-pattern-agent` | `supabase/functions/run-pattern-agent/` | 프로젝트 패턴 종합 → pattern_versions/items |

### 배포 명령

```bash
cd blogbrain

# 프로젝트 연결 (아직 안 했다면)
supabase link --project-ref <YOUR_PROJECT_REF>

# 순서대로 배포
supabase functions deploy run-learning-agent
supabase functions deploy run-pattern-agent
```

### 배포 확인

```bash
supabase functions list
```

Dashboard → **Edge Functions**에서 두 함수 모두 **Active** 상태인지 확인합니다.

> Edge Function은 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`를 Supabase가 자동 주입합니다. 별도 설정 불필요.

---

## 3. OpenAI Secret 설정

OpenAI 호출은 **Edge Function에서만** 수행됩니다. 프론트 `.env`에 OpenAI Key를 넣을 필요 없습니다.

```bash
cd blogbrain

supabase secrets set OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

### Secret 확인

```bash
supabase secrets list
```

| Secret | 필수 | 기본값 |
|--------|------|--------|
| `OPENAI_API_KEY` | ✅ | 없으면 Agent 500 오류 |
| `OPENAI_MODEL` | 선택 | `gpt-4o-mini` |

Secret 변경 후 **Edge Function을 재배포**하는 것이 안전합니다.

---

## 4. npm install

```bash
cd blogbrain
npm install
```

### 프론트 환경 변수

```bash
cp .env.example .env.local
```

`.env.local` 작성:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

값 위치: Supabase Dashboard → **Project Settings** → **API** → `URL`, `anon public`

---

## 5. npm run dev

```bash
cd blogbrain
npm run dev
```

브라우저에서 Vite가 출력하는 로컬 URL 접속 (보통 `http://localhost:5173`).

### Auth 설정 (회원가입 테스트용)

Supabase Dashboard → **Authentication** → **Providers** → **Email**:

- **테스트 편의:** `Confirm email` **OFF** → 가입 즉시 로그인 가능
- **운영과 동일:** `Confirm email` **ON** → 가입 후 이메일 확인 필요

---

## 6. 테스트 계정 생성

### UI에서 생성

1. `http://localhost:5173/login` 접속
2. **계정이 없으신가요? 회원가입** 클릭
3. 입력 예시:
   - 이메일: `test@blogbrain.local` (실제 수신 가능한 메일 권장)
   - 비밀번호: 8자 이상
   - 표시 이름: `Test User`
4. 로그인 성공 → `/projects`로 이동

### 자동 Workspace

- 첫 로그인 시 Workspace가 없으면 `{display_name}'s Workspace`가 **자동 생성**됩니다.
- Sidebar 상단 Workspace Switcher에서 확인 가능

### 프로젝트 생성

1. `/projects` → **새 프로젝트**
2. 예시:
   - 이름: `연예 블로그 테스트`
   - 설명: `Sprint 1~4 검증`
3. 프로젝트 카드 클릭 → `/p/<project-slug>` Brain Dashboard 진입

### (선택) Sprint 2 기초 데이터

Pattern 테스트 품질을 높이려면 Learning 전에:

- **Sources** (`/p/<slug>/sources`): 참고 블로그 1~2개 등록
- **Knowledge** (`/p/<slug>/knowledge`): 엔티티 1~2개 수동 추가 (선택)

---

## 7. Learning 테스트

**경로:** `/p/<project-slug>/learning`

### 테스트 절차

1. **글 학습** 버튼 클릭
2. 아래 샘플 **최소 2~3편** 저장 (비슷한 제목·구조·CTA를 쓰면 Pattern Agent 효과가 좋음)
3. 저장 즉시 **Learning Agent 자동 실행** (`run-learning-agent`)
4. 각 글 카드에서 상태 배지 확인

### 샘플 글 1

**제목:** `카리나, 인천공항 패션 화제… "이 코디 실화?"`

**본문 (요약):**
```
에스파 카리나가 인천국제공항을 통해 출국하며 패션 화제를 모았다.
오versized 자켓과 슬림한 팬츠 조합이 '공항 패션' 검색어를 자극했다.
팬들은 "역시 패션 아이콘"이라며 반응했다.
```

**태그:** `카리나, 공항패션, 연예`

### 샘플 글 2

**제목:** `윈터, 공항 출국룩 공개… "깔끔함의 정석"`

**본문 (요약):**
```
에스파 윈터가 출국길 공항 패션을 선보였다.
미니멀한 톤온톤 코디가 '공항 패션' 트렌드와 맞닿았다.
"이번 룩 저장각"이라는 댓글이 이어졌다.
```

### 샘플 글 3 (선택)

**제목:** `○○, 공항 패션으로 화제… "이번엔 ○○ 스타일"`

비슷한 **제목 공식 + 인트로 + CTA** 패턴을 유지합니다.

### Learning 성공 기준

| 확인 항목 | 기대 결과 |
|-----------|-----------|
| `analysis_status` | `pending` → `processing` → `completed` |
| 글 카드 확장 | title_pattern, intro_pattern, writing_style 등 표시 |
| Knowledge | `/knowledge`에 엔티티 자동 upsert |
| Dashboard | Recent Analysis, Recent Discoveries에 데이터 표시 |

### Learning 실패 시 UI

- 배지: **Failed**
- 카드에 `analysis_error` 메시지 표시
- **Analyze** 버튼으로 재실행 가능

---

## 8. Pattern 테스트

**경로:** `/p/<project-slug>/patterns`

### 사전 조건

- Learning Agent로 **completed** 분석 ≥ 1건
- `pattern_candidates` 또는 `learning_analyses` 데이터 존재

### 테스트 절차

1. Patterns 페이지 진입
2. **Run Pattern Agent** 클릭
3. 실행 완료까지 대기 (수십 초~1분+)
4. UI 확인

### Pattern 성공 기준

| 확인 항목 | 첫 실행 (v1.0) | 두 번째 실행 (v1.1) |
|-----------|------------------|---------------------|
| Active Badge | `Active: v1.0` | `Active: v1.1` |
| Version Selector | v1.0 목록 | v1.0, v1.1 목록 |
| Category Tabs | Title, Intro, … New Patterns | 동일 |
| Pattern Cards | label, formula, examples, confidence | diff 반영 |
| Diff Summary | 없음 (이전 버전 없음) | added/strengthened 요약 |
| Version Summary | AI summary 텍스트 | 새 summary |

### DB 검증 SQL

```sql
-- 프로젝트 ID 치환
select pb.current_pattern_version_id, pv.version_label, pb.pattern_count
from project_brains pb
left join pattern_versions pv on pv.id = pb.current_pattern_version_id
where pb.project_id = '<PROJECT_UUID>';

select category, label, confidence, occurrence_count
from pattern_items
where pattern_version_id = '<VERSION_UUID>'
order by category, label;
```

---

## 9. Dashboard 확인

**경로:** `/p/<project-slug>` (Brain Dashboard)

### Sprint 1 — OS Skeleton

- [ ] Sidebar: Brain, Sources, Knowledge, Learning, Patterns, Trends, Settings
- [ ] 프로젝트 전환 / Workspace Switcher 동작
- [ ] 로그아웃 후 `/login` 리다이렉트

### Sprint 2 — Learning Foundation

- [ ] Brain Score 링 표시 (0~100)
- [ ] Learning / Knowledge / Sources / Relationships 카운트
- [ ] Brain Memory 섹션 (최근 learning, knowledge, sources)
- [ ] Activity Feed (brain_activity_logs)

### Sprint 3 — Learning Agent

- [ ] **Recent Analysis** — learning_analyses 목록
- [ ] **Recent Discoveries** — pattern_candidates 목록

### Sprint 4 — Pattern Intelligence

- [ ] **Current Pattern Version** (예: v1.0)
- [ ] **Pattern Count**
- [ ] **Pattern Confidence Average**
- [ ] **Recent Pattern Updates** — pattern_items
- [ ] **New Patterns Discovered** — pattern_version_diffs (2회차 이후)

### Brain Score 공식 (Sprint 4)

```
Brain Score = min(100,
  learning × 2
  + knowledge × 1
  + relationships × 1
  + sources × 0.5
  + patterns × 0.25
)
```

Learning 2편 + Pattern 10개 기준 대략: `4 + knowledge + relationships + sources + 2.5`

---

## 10. 예상 결과

전체 플로우를 **한 번** 성공적으로 끝내면:

```
회원가입/로그인
  → Workspace 자동 생성
  → 프로젝트 생성 (+ project_brains row)
  → Learning 글 2~3편 저장
  → run-learning-agent × N (자동)
  → learning_analyses, pattern_candidates, knowledge_entities 생성
  → Brain Score 상승, Dashboard Analysis/Discoveries 표시
  → Run Pattern Agent (수동)
  → run-pattern-agent × 1
  → pattern_versions v1.0, pattern_items N개
  → project_brains.current_pattern_version_id 갱신
  → brain_activity_logs: pattern_version_created, pattern_agent_completed
  → Dashboard Pattern 카드 갱신
```

### agent_runs 기대 상태

| agent_name | status | output_ref |
|------------|--------|------------|
| `learning_agent` | `completed` | analysis_id 포함 |
| `pattern_agent` | `completed` | pattern_version_id 포함 |

---

## 11. 오류 발생 시 확인할 부분

### Migration / DB

| 증상 | 확인 |
|------|------|
| 테이블 없음 | migration 001→004 순서 재확인 |
| RLS permission denied | 해당 테이블 RLS policy, workspace_members membership |
| Brain Score 0 고정 | `recompute_project_brain` 함수 존재 여부 (004 재적용) |

### Auth / 프론트

| 증상 | 확인 |
|------|------|
| 로그인 안 됨 | `.env.local` URL/anon key, Email confirm 설정 |
| 빈 화면 | 브라우저 Console, Network 탭 |
| 프로젝트 목록 비어 있음 | workspace bootstrap, active workspace ID |

### Learning Agent

| 증상 | 확인 |
|------|------|
| `Unauthorized` | 로그인 세션, invoke 시 Authorization 헤더 |
| `Learning article not found` | article ID, RLS로 본인 프로젝트 접근 가능한지 |
| `Failed` + OpenAI 오류 | `OPENAI_API_KEY` secret, API quota/결제 |
| CORS 오류 | Edge Function `cors.ts`, OPTIONS preflight |
| JSON validation failed | Edge Function logs — OpenAI 응답 형식 |

**로그 확인:**

```bash
supabase functions logs run-learning-agent --follow
```

Dashboard → **Edge Functions** → `run-learning-agent` → **Logs**

### Pattern Agent

| 증상 | 확인 |
|------|------|
| `No pattern candidates or learning analyses found` | Learning Agent 먼저 completed 상태인지 |
| `Project not found or access denied` | projectId, workspace membership |
| v1.0 생성 안 됨 | `patternPipeline.ts` logs, agent_runs.status |
| Dashboard Pattern Count 0 | `current_pattern_version_id` 연결, active version의 items |

```bash
supabase functions logs run-pattern-agent --follow
```

### Network 디버깅 (브라우저)

1. DevTools → **Network**
2. `run-learning-agent` / `run-pattern-agent` 요청 선택
3. **Status** (200 vs 400/401/500), **Response** body의 `error` 필드 확인

---

## 12. Checklist

### 환경 구성

- [ ] Supabase 프로젝트 생성
- [ ] Migration 001 적용
- [ ] Migration 002 적용
- [ ] Migration 003 적용
- [ ] Migration 004 적용
- [ ] `OPENAI_API_KEY` secret 설정
- [ ] `OPENAI_MODEL` secret 설정 (선택)
- [ ] `run-learning-agent` 배포
- [ ] `run-pattern-agent` 배포
- [ ] `.env.local` 작성 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] `npm install` 완료
- [ ] `npm run dev` 실행
- [ ] Auth Email confirm 정책 확인

### Sprint 1 — Auth & Project OS

- [ ] 회원가입 성공
- [ ] 로그인 / 로그아웃
- [ ] Workspace 자동 생성
- [ ] 프로젝트 CRUD
- [ ] Brain Dashboard 진입
- [ ] Sidebar 네비게이션

### Sprint 2 — Learning Layer

- [ ] Source 등록 (선택)
- [ ] Knowledge 수동 등록 (선택)
- [ ] Learning 글 저장
- [ ] Brain Score / Memory 카드 표시
- [ ] Activity Feed 기록

### Sprint 3 — Learning Agent

- [ ] 글 저장 시 Agent 자동 실행
- [ ] `analysis_status`: completed
- [ ] 분석 결과 UI 표시
- [ ] Knowledge 자동 생성
- [ ] Dashboard Recent Analysis
- [ ] Dashboard Recent Discoveries (pattern_candidates)
- [ ] `agent_runs` learning_agent completed

### Sprint 4 — Pattern Agent

- [ ] Run Pattern Agent 클릭
- [ ] v1.0 생성 + Active badge
- [ ] Category tabs + Pattern cards
- [ ] formula / examples / confidence 표시
- [ ] Dashboard Pattern Version / Count / Avg Confidence
- [ ] Dashboard Recent Pattern Updates
- [ ] (2회 실행 시) v1.1 + Diff Summary + New Patterns Discovered
- [ ] `agent_runs` pattern_agent completed

### 빌드 검증 (선택)

```bash
cd blogbrain
npm run build
```

- [ ] `tsc -b` 오류 없음
- [ ] `vite build` 성공

---

## 빠른 참조 — 명령어 한 줄 요약

```bash
# 1. 프론트
cd blogbrain && cp .env.example .env.local && npm install && npm run dev

# 2. Supabase (link 후)
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-4o-mini
supabase functions deploy run-learning-agent
supabase functions deploy run-pattern-agent
```

---

## 관련 파일

| 구분 | 경로 |
|------|------|
| Migrations | `blogbrain/supabase/migrations/001~004_*.sql` |
| Learning EF | `blogbrain/supabase/functions/run-learning-agent/` |
| Pattern EF | `blogbrain/supabase/functions/run-pattern-agent/` |
| Patterns UI | `blogbrain/src/features/patterns/` |
| Dashboard | `blogbrain/src/features/brain/components/BrainDashboard.tsx` |
