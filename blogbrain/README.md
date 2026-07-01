# BlogBrain — Sprint 1

AI Blog Operating System skeleton.

## Setup

1. Create a Supabase project
2. Run migration: `supabase/migrations/001_saas_foundation.sql`
3. Copy env file:

```bash
cp .env.example .env.local
```

4. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

5. Install and run:

```bash
npm install
npm run dev
```

## Sprint 2 Scope

- Source Manager (CRUD)
- Knowledge Manager + Relationships
- Learning (article paste + tags + source link)
- Brain Memory Dashboard
- Real Brain Score calculation

## Sprint 3 Scope

- AI Agent Foundation (`src/ai/`)
- Learning Agent (OpenAI via Edge Function)
- Prompt templates, JSON Schema validation, retry
- Learning Pipeline → Knowledge + Pattern Candidates
- Dashboard: Recent Analysis, Discoveries

### Supabase Edge Function setup

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-4o-mini
supabase functions deploy run-learning-agent
```

## Sprint 4 Scope

- Pattern Agent (`pattern_agent`)
- Pattern Database: versions, items, diffs
- Patterns UI with version selector
- Dashboard pattern intelligence cards

Run migration `004_sprint4_pattern_intelligence.sql` after Sprint 3.

Deploy Pattern Agent:
```bash
supabase functions deploy run-pattern-agent
```
