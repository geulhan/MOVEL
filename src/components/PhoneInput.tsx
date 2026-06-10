import { type KeyboardEvent } from 'react'
import {
  extractPhoneBody,
  formatPhoneBody,
  isPhoneBodyComplete,
  phoneBodyToFull,
} from '../utils/phone'

type Props = {
  value: string
  onChange: (body: string) => void
  className?: string
}

export function PhoneInput({ value, onChange, className }: Props) {
  const display = formatPhoneBody(value)

  function handleChange(raw: string) {
    onChange(extractPhoneBody(raw))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && value.length === 0) {
      e.preventDefault()
    }
  }

  return (
    <div className="relative">
      <input
        type="tel"
        inputMode="numeric"
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="010-0000-0000"
        maxLength={13}
        className={className}
      />
    </div>
  )
}

export function validatePhoneBody(body: string): string | null {
  if (!isPhoneBodyComplete(body)) {
    return '전화번호 8자리를 모두 입력해 주세요. (010-XXXX-XXXX)'
  }
  return null
}

export { phoneBodyToFull, isPhoneBodyComplete }
