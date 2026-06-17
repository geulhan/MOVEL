import { getMotionHubKakaoUrl, MOTIONHUB_CONTACT } from '../../constants/motionhub'

type Props = {
  className?: string
  compact?: boolean
}

/** 센터 관리자 → MotionHub 플랫폼 문의 (카카오 채널) */
export function MotionHubSupportLink({ className = '', compact = false }: Props) {
  return (
    <a
      href={getMotionHubKakaoUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal underline-offset-2 hover:underline ${className}`}
    >
      {compact ? '모션허브 문의' : MOTIONHUB_CONTACT.kakaoLabel}
      <span aria-hidden className="text-xs opacity-60">
        ↗
      </span>
    </a>
  )
}
