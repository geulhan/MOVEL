# Launch Sprint Week 1 — 배포 전 테스트 시나리오

> 목표: 첫 유료 고객에게 보여줄 수 있는 안전한 서비스 검증

## 사전 조건

- [ ] Supabase에 `migration_102_launch_week1_rpc_hardening.sql` 적용
- [ ] Edge Functions 재배포 (`send-notification` 등)
- [ ] Vercel에서 `VITE_NOTIFICATION_TRIGGER_KEY` 제거 확인
- [ ] Supabase Secrets: `NOTIFICATION_INTERNAL_SECRET`, `SOLAPI_*` 설정

---

## 1. 관리자 온보딩 (Beta-start)

| # | 단계 | 확인 항목 | 통과 |
|---|------|-----------|------|
| 1 | 신규 센터 가입 | `/signup` → 로그인 → `/admin/beta-start` 리다이렉트 | ☐ |
| 2 | Beta-start 진입 | 미완료 시 `/admin` 접속 시 체크리스트 우선 표시 | ☐ |
| 3 | 운영 기능 활성화 | Settings 상단 프리셋 선택 → **기능 설정 저장** → 체크 완료 | ☐ |
| 4 | 회원 등록 | 회원 1명 등록 → Beta-start 체크 | ☐ |
| 5 | 예약 생성 | `/admin/reservations`에서 PT 예약 1건 → 체크 | ☐ |
| 6 | 출석 처리 | 출석 1건 → 체크 | ☐ |
| 7 | 알림톡 테스트 | 메시지 발송 (환영/수동) — 세션 토큰으로 Edge Function 호출 | ☐ |
| 8 | AI 리포트 | 경영관리 → 리포트 탭에서 리포트 **생성 표시** 후 체크 (탭 진입만으로 X) | ☐ |
| 9 | Today Feed | Beta-start 100% 후 `/admin` Today Feed 정상 표시 | ☐ |
| 10 | 오류 배너 | 네트워크 차단 시 Beta-start 상단 에러 + 재시도 버튼 | ☐ |

---

## 2. 트레이너 권한

| # | 확인 항목 | 통과 |
|---|-----------|------|
| 1 | 트레이너 계정 로그인 | ☐ |
| 2 | 담당 회원만 목록에 표시 | ☐ |
| 3 | 결제(`/admin/payments`) 접근 불가 | ☐ |
| 4 | 센터 설정(`/admin/settings`) 접근 불가 | ☐ |
| 5 | 플랫폼(`/platform`) 접근 불가 | ☐ |

---

## 3. 회원 포털

| # | 확인 항목 | 통과 |
|---|-----------|------|
| 1 | `/member/welcome` 접속 | ☐ |
| 2 | 휴대폰 + 뒤 4자리 로그인 | ☐ |
| 3 | 본인 정보만 조회 (타 회원 데이터 없음) | ☐ |

---

## 4. 보안

| # | 확인 항목 | 기대 결과 | 통과 |
|---|-----------|-----------|------|
| 1 | 타 `center_id` 데이터 조회 | 빈 결과 또는 403 | ☐ |
| 2 | `reset_member_password_to_default` anon 호출 | 거부 (세션 토큰 필요) | ☐ |
| 3 | `list_trainer_admin_accounts` anon 호출 | 거부 | ☐ |
| 4 | `send-notification` 무인증 호출 | 401 Unauthorized | ☐ |
| 5 | `send-notification` 관리자 세션 | 200 (또는 skipped/failed 비즈니스 응답) | ☐ |
| 6 | 프론트 번들 시크릿 검색 | `VITE_OPENAI`, `VITE_NOTIFICATION_TRIGGER` 없음 | ☐ |

---

## 5. 기능 토글 / Dead-end

| # | 확인 항목 | 통과 |
|---|-----------|------|
| 1 | PT·클래스 모두 OFF → `/admin/reservations` | Settings CTA 표시 | ☐ |
| 2 | 프리셋 적용 후 저장 → 예약 메뉴/페이지 정상 | ☐ |

---

## 6. Error Boundary / Sentry

| # | 확인 항목 | 통과 |
|---|-----------|------|
| 1 | `VITE_SENTRY_DSN` 없음 | 앱 정상 동작, Sentry 비활성 | ☐ |
| 2 | 의도적 렌더 오류 (개발 환경) | Fallback UI + 다시 시도 | ☐ |
| 3 | DSN 설정 시 | Sentry에 center_id, route, role 태그 | ☐ |

---

## 7. 빌드

```bash
npm run build
```

- [ ] TypeScript + Vite 빌드 통과

---

## Week 2 TODO (구조 변경 필요)

- RLS `using (true)` 전면 교체 — `docs/launch-week1-security-audit.md` 참고
- OpenAI 실제 API 호출은 Edge Function으로 이전
