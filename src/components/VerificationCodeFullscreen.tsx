import { useEffect } from 'react'
import { formatDate, todayDateString } from '../api/members'
import { btnGold, btnOutline } from '../styles/theme'

type Props = {
  code: string
  onClose: () => void
}

export function VerificationCodeFullscreen({ code, onClose }: Props) {
  const today = todayDateString()

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-charcoal text-cream"
      role="dialog"
      aria-modal="true"
      aria-label="인증코드 전체화면"
    >
      <div className="flex items-center justify-between border-b border-gold/20 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
          MOVEL 인증
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm font-bold text-cream/80 hover:bg-white/10"
        >
          닫기
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-medium text-cream/60">오늘의 인증코드</p>
        <p className="mt-2 text-sm tabular-nums text-gold">{formatDate(today)}</p>
        <p className="mt-6 text-5xl font-bold tracking-[0.15em] text-gold sm:text-6xl">
          {code}
        </p>
        <p className="mt-8 max-w-xs text-sm leading-relaxed text-cream/70">
          건강앱(삼성헬스·Apple 건강 등)과{' '}
          <strong className="text-gold">이 화면이 함께</strong> 보이게 캡처하세요.
        </p>
      </div>

      <div className="space-y-3 border-t border-gold/20 bg-charcoal-light px-5 py-5">
        <ol className="space-y-2 text-left text-xs leading-relaxed text-cream/75">
          <li>
            <strong className="text-gold">①</strong> 아래「전체화면 유지」상태에서
          </li>
          <li>
            <strong className="text-gold">②</strong> 휴대폰 <strong>분할 화면</strong>
            으로 건강앱 + 모벨 회원페이지를 나란히 띄우거나
          </li>
          <li>
            <strong className="text-gold">③</strong> 건강앱 걸음 화면 캡처 시{' '}
            <strong>이 코드가 보이게</strong> 한 장에 담아 업로드
          </li>
        </ol>
        <div className="flex gap-2">
          <button type="button" onClick={() => void handleCopy()} className={btnOutline}>
            코드 복사
          </button>
          <button type="button" onClick={onClose} className={`flex-1 ${btnGold}`}>
            캡처 준비 완료
          </button>
        </div>
      </div>
    </div>
  )
}
