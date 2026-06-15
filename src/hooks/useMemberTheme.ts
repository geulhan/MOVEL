import { useEffect, useMemo } from 'react'
import { loadMemberTheme } from '../lib/memberTheme'
import { DEFAULT_CENTER_THEME, themeToCssVars, type CenterTheme } from '../types/centerBranding'

export function useMemberThemeVars(theme: CenterTheme) {
  return useMemo(() => themeToCssVars(theme), [theme])
}

export function useApplyMemberTheme(
  theme: CenterTheme,
  options?: { enabled?: boolean; memberName?: string },
) {
  const enabled = options?.enabled ?? true
  const memberName = options?.memberName
  const vars = useMemberThemeVars(theme)

  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value)
    }
    return () => {
      for (const key of Object.keys(vars)) {
        root.style.removeProperty(key)
      }
    }
  }, [enabled, vars])

  useEffect(() => {
    if (!enabled) {
      document.title = '모션허브 회원'
      return
    }
    document.title = memberName ? `${memberName} | 모션허브` : '모션허브 회원'
  }, [enabled, memberName])
}

export function getInitialMemberTheme(memberId?: string): CenterTheme {
  if (!memberId) return DEFAULT_CENTER_THEME
  return loadMemberTheme(memberId)
}
