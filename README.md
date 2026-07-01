# 모벨 퍼포먼스 회원관리

React + Supabase로 만든 PT 회원 관리자 페이지입니다.

## 기능

| 기능 | 설명 |
|------|------|
| 회원 등록 | 이름, 전화번호, 등록일, 만료일, 담당 트레이너, 상태, PT 횟수, 결제 금액 |
| 회원 목록 | 등록일순 테이블, 상태 뱃지 |
| 회원 검색 | 이름·전화번호·트레이너 부분 일치 검색 |
| PT 차감 | 활성 회원만 차감 (만료·휴면·종료 차단) |
| 회원 상태 | 활성 / 휴면 / 종료 (목록에서 즉시 변경) |

## 프로젝트 위치

```
C:\Users\kjh56\Projects\motionhub
```

Cursor에서 **File → Open Folder** 로 위 폴더를 열면 됩니다.

---

## DB 오류 / 데이터가 안 보일 때

Supabase **SQL Editor**에서 `supabase/fix_all.sql` 을 실행하세요.

- **기존 데이터를 삭제하지 않습니다**
- 트레이너 테이블, 권한(RLS), 누락된 컬럼을 한 번에 복구합니다
- 실행 후 맨 아래 `members`, `trainers` 행 수로 데이터 존재 여부를 확인할 수 있습니다

데이터 확인: Supabase → **Table Editor** → `members` 테이블

---

## 기존 DB 업데이트 (이미 사용 중인 경우)

Supabase **SQL Editor**에서 아래 마이그레이션을 **순서대로** 실행하세요.

1. `supabase/migration_002_member_fields.sql` — 등록일, 만료일, 트레이너, 상태
2. `supabase/migration_003_member_detail.sql` — 결제 내역, 메모, 상담 기록
3. `supabase/migration_004_trainers_and_period.sql` — 트레이너 선택, 세션당 4일, 기간 연장

- 기존 회원 데이터는 그대로 유지됩니다.
- **등록일**은 기존 `created_at` 날짜로 자동 채워집니다.
- **상태**는 기본값 `활성(active)` 으로 설정됩니다.

실행 후 개발 서버를 재시작하세요.

---

## 초보자용 설정 가이드 (순서대로 진행)

### 1단계: Node.js 설치

1. 브라우저에서 [https://nodejs.org](https://nodejs.org) 접속
2. **LTS** 버전 다운로드 후 설치 (기본 옵션 그대로 Next)
3. 설치 후 **새 터미널**을 열고 확인:

```powershell
node -v
npm -v
```

버전 숫자가 나오면 성공입니다.

---

### 2단계: 패키지 설치

터미널에서 프로젝트 폴더로 이동한 뒤:

```powershell
cd C:\Users\kjh56\Projects\motionhub
npm install
```

`node_modules` 폴더가 생기면 완료입니다. (1~3분 걸릴 수 있습니다)

---

### 3단계: Supabase 프로젝트 만들기

1. [https://supabase.com](https://supabase.com) 에서 무료 회원가입
2. **New project** 클릭
3. 프로젝트 이름: 예) `mobel-performance`
4. 데이터베이스 비밀번호 설정 후 리전 선택 (가까운 곳, 예: Northeast Asia)
5. 프로젝트가 생성될 때까지 1~2분 대기

---

### 4단계: 데이터베이스 테이블 만들기

1. Supabase 대시보드 왼쪽 **SQL Editor** 클릭
2. **New query** 선택
3. 이 프로젝트의 `supabase/schema.sql` 파일 내용을 **전부 복사**해 붙여넣기
4. **Run** 클릭 → Success 메시지 확인

`members`, `session_logs` 테이블이 생성됩니다.

---

### 5단계: API 키 연결 (.env 파일)

1. Supabase 대시보드 → **Project Settings** (톱니바퀴) → **API**
2. 아래 두 값을 복사:
   - **Project URL**
   - **anon public** key
3. 프로젝트 폴더에 `.env` 파일 생성 (`.env.example` 참고):

```env
VITE_SUPABASE_URL=여기에_Project_URL
VITE_SUPABASE_ANON_KEY=여기에_anon_key
```

> `.env`는 Git에 올리지 마세요. 비밀키가 아닌 anon key이지만, 습관적으로 로컬만 두는 것이 좋습니다.

---

### 6단계: 개발 서버 실행

```powershell
npm run dev
```

터미널에 나온 주소(보통 `http://localhost:5173`)를 브라우저에서 엽니다.

---

### 7단계: 동작 확인

1. **회원 등록** 폼에 테스트 회원 입력 후 등록
2. **회원 목록**에 표시되는지 확인
3. **검색**에 이름 일부 입력 후 검색
4. **-1회** 버튼으로 PT 차감 → 남은 횟수 감소 확인

---

## 자주 묻는 문제

### `npm`을 찾을 수 없음

Node.js 설치 후 **터미널을 완전히 닫았다가 다시** 열어주세요.

### 회원 등록 시 오류

- `.env`의 URL·키가 맞는지 확인
- `schema.sql`을 실행했는지 확인
- 같은 전화번호는 중복 등록할 수 없습니다

### 목록이 비어 있음

Supabase **Table Editor** → `members` 에 데이터가 있는지 확인하세요.

---

## 폴더 구조

```
motionhub/
├── src/
│   ├── api/members.ts      # Supabase CRUD
│   ├── components/         # UI 컴포넌트
│   ├── lib/supabase.ts     # Supabase 클라이언트
│   └── App.tsx             # 메인 화면
├── supabase/schema.sql     # DB 테이블 정의
├── .env.example
└── package.json
```

---

## 배포 (나중에)

로컬에서 잘 동작하면 [Vercel](https://vercel.com) 등에 Git 연동 후 배포할 수 있습니다.  
배포 시 Vercel 환경 변수에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 를 동일하게 설정하세요.

---

## 기술 스택

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS 4**
- **Supabase** (PostgreSQL + REST API)
