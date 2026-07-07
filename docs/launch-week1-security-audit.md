# Launch Week 1 — RLS / 권한 점검 보고서

작성 기준: Sprint 22 완료 후 코드베이스 (`migration_100` 포함)

## 요약

| 위험도 | 건수 | Week 1 조치 |
|--------|------|-------------|
| **Critical** | 4 | RPC 3종 수정 (`migration_100`) / RLS는 Week 2 TODO |
| **High** | 5 | 클라이언트 시크릿 제거 완료 |
| **Medium** | 6 | 문서화 + 온보딩 개선 |
| **Low** | 3 | 모니터링 준비 |

---

## Critical

### C1. RLS `using (true)` — 핵심 테이블 전체 개방

**영향 테이블:** `members`, `payment_history`, `payment_requests`, `pt_schedules`, `attendance_logs`, `consultation_leads`, `message_logs`, `trainers`, `class_schedules`, `center_features` 등 다수

**증상:** `VITE_SUPABASE_ANON_KEY`만으로 타 센터 PII·결제·출석 데이터 REST 조회/수정 가능

**Week 1:** 구조 변경 범위가 커서 **즉시 전면 RLS 교체 불가** (앱이 direct `supabase.from()` 사용)

**Week 2 TODO:**
1. `verify_auth_session` 기반 RLS 헬퍼 함수 도입
2. 테이블별 `center_id = session_center_id()` 정책
3. 클라이언트 direct table access → RPC 점진 이전

**권장 마이그레이션 템플릿:**
```sql
-- 예시 (Week 2)
drop policy if exists members_all on public.members;
create policy members_select_own_center on public.members
  for select using (
    center_id in (
      select s.center_id from public.verify_auth_session(
        current_setting('request.headers', true)::json->>'x-session-token',
        'center_user'
      ) s
    )
  );
```
※ PostgREST 커스텀 헤더 연동 또는 전면 RPC 전환 필요

---

### C2. `reset_member_password_to_default` anon 호출 ✅ 수정됨

- **파일:** `migration_102_launch_week1_rpc_hardening.sql`
- **조치:** `p_session_token` + `center_user/admin` 검증, 동일 센터 회원만
- **클라이언트:** `src/api/memberAuth.ts` 토큰 전달

---

### C3. `upsert_trainer_admin_account` / `list_trainer_admin_accounts` anon ✅ 수정됨

- **조치:** 관리자 세션 토큰 필수
- **클라이언트:** `src/api/trainerAccounts.ts`

---

### C4. 알림 Edge Function 정적 시크릿 (`VITE_NOTIFICATION_TRIGGER_KEY`) ✅ 수정됨

- **조치:** 클라이언트 → `x-session-token` (관리자 세션)
- **Edge:** `notificationAuth.ts` 세션 검증 추가
- **Cron:** `NOTIFICATION_INTERNAL_SECRET` / `NOTIFICATION_CRON_SECRET` 서버 전용 유지

---

## High

### H1. Admin role이 sessionStorage에만 존재

- **파일:** `src/lib/adminSession.ts`, `adminPermissions.ts`
- **위험:** DevTools로 role 위조 가능 (RLS 미적용 시 데이터 노출)
- **Week 2 TODO:** 라우트 진입 시 `verify_auth_session` 재검증 RPC

### H2. Member token 미사용

- **파일:** `src/api/memberPortal.ts`
- **위험:** member UUID만 알면 데이터 접근 (RLS 개방 시)
- **Week 2 TODO:** 모든 member API에 `x-member-session-token` 검증

### H3. `VITE_OPENAI_API_KEY` 클라이언트 노출 ✅ 제거됨

- **조치:** 클라이언트 OpenAI 호출 제거, 규칙 기반 리포트만 사용
- **Week 3 TODO:** Edge Function `generate-ai-report` 로 이전

### H4. `find_member_by_phone_in_center` security definer

- **파일:** `migration_079`
- **Week 2 TODO:** 세션 토큰 검증 추가

### H5. `center_features` direct read

- **현재:** `saveCenterOperationalFeatures`는 RPC로 저장, read는 direct
- **Week 2:** read도 RPC 또는 RLS

---

## Medium

| ID | 항목 | 조치 |
|----|------|------|
| M1 | Beta-start silent fail | `BetaStartContext` error 배너 |
| M2 | AI 리포트 localStorage 허위 완료 | 리포트 생성 시에만 체크 |
| M3 | Settings 방문 = 완료 | 기능 저장 시에만 체크 |
| M4 | 기능 OFF dead-end | Settings CTA 컴포넌트 |
| M5 | platform_activity silent catch | 유지 (분석용) |
| M6 | Member 비밀번호 4자리 | Week 2 정책 강화 검토 |

---

## Low

| ID | 항목 |
|----|------|
| L1 | Member session localStorage 장기 보관 |
| L2 | Storage bucket 정책 별도 점검 필요 |
| L3 | Platform growth tables open RLS |

---

## 우선 테이블 점검 매트릭스

| 테이블 | RLS 상태 | center_id 컬럼 | Week 1 |
|--------|----------|----------------|--------|
| members | `using(true)` | ✅ | TODO Week 2 |
| consultation_leads | `using(true)` | ✅ | TODO Week 2 |
| payment_history | `using(true)` | ✅ | TODO Week 2 |
| payment_requests | `using(true)` | ✅ | TODO Week 2 |
| attendance_logs | `using(true)` | ✅ | TODO Week 2 |
| pt_schedules | `using(true)` | ✅ | TODO Week 2 |
| class_schedules | `using(true)` | ✅ | TODO Week 2 |
| message_logs | `using(true)` | ✅ | TODO Week 2 |
| center_features | RPC 저장 / open read | ✅ | TODO Week 2 |
| center_messaging_config | RPC only | ✅ | OK |
| trainers | `using(true)` | ✅ | TODO Week 2 |

---

## 배포 체크리스트

1. Supabase SQL Editor에서 `migration_102_launch_week1_rpc_hardening.sql` 실행
2. Vercel에서 `VITE_NOTIFICATION_TRIGGER_KEY` **제거** (더 이상 불필요)
3. `VITE_OPENAI_API_KEY` 제거 (있다면)
4. Edge Functions 재배포 (`notificationAuth` 변경)
5. `VITE_SENTRY_DSN` 선택 설정
