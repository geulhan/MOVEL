import { useMemo } from 'react'
import { SIGNUP_TERMS_SUMMARY } from '../../constants/signupTerms'

export type SignupConsentState = {
  agreeAge: boolean
  agreeTerms: boolean
  agreePrivacy: boolean
  agreeMarketing: boolean
}

type Props = {
  value: SignupConsentState
  onChange: (next: SignupConsentState) => void
  disabled?: boolean
}

export function isSignupConsentComplete(value: SignupConsentState): boolean {
  return value.agreeAge && value.agreeTerms && value.agreePrivacy
}

export function SignupConsentFields({ value, onChange, disabled }: Props) {
  const allChecked = useMemo(
    () =>
      value.agreeAge &&
      value.agreeTerms &&
      value.agreePrivacy &&
      value.agreeMarketing,
    [value],
  )

  function toggleAll(checked: boolean) {
    onChange({
      agreeAge: checked,
      agreeTerms: checked,
      agreePrivacy: checked,
      agreeMarketing: checked,
    })
  }

  return (
    <div className="space-y-3 rounded-xl border border-charcoal/10 bg-cream/40 p-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-charcoal">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => toggleAll(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-gold/50"
        />
        모두 동의
      </label>

      <ConsentRow
        label="만 14세 이상입니다 (필수)"
        checked={value.agreeAge}
        onChange={(agreeAge) => onChange({ ...value, agreeAge })}
        disabled={disabled}
      />

      <ConsentRow
        label="서비스 이용약관 동의 (필수)"
        checked={value.agreeTerms}
        onChange={(agreeTerms) => onChange({ ...value, agreeTerms })}
        disabled={disabled}
        detail={SIGNUP_TERMS_SUMMARY.service}
      />

      <ConsentRow
        label="개인정보 수집·이용 동의 (필수)"
        checked={value.agreePrivacy}
        onChange={(agreePrivacy) => onChange({ ...value, agreePrivacy })}
        disabled={disabled}
        detail={SIGNUP_TERMS_SUMMARY.privacy}
      />

      <ConsentRow
        label="마케팅·프로모션 정보 수신 동의 (선택)"
        checked={value.agreeMarketing}
        onChange={(agreeMarketing) => onChange({ ...value, agreeMarketing })}
        disabled={disabled}
        detail={SIGNUP_TERMS_SUMMARY.marketing}
        optional
      />
    </div>
  )
}

function ConsentRow({
  label,
  checked,
  onChange,
  disabled,
  detail,
  optional,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  detail?: string
  optional?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex cursor-pointer items-start gap-2 text-sm text-charcoal">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gold/50"
        />
        <span>
          {label}
          {optional && <span className="ml-1 text-xs text-muted">선택</span>}
        </span>
      </label>
      {detail && (
        <div className="ml-6 max-h-20 overflow-y-auto rounded-lg border border-charcoal/10 bg-white/80 px-3 py-2 text-xs leading-relaxed text-charcoal/70">
          {detail}
        </div>
      )}
    </div>
  )
}
