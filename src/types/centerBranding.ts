export type CenterTheme = {
  sidebarBg: string
  sidebarText: string
  sidebarMuted: string
  accent: string
  accentDark: string
  mainBg: string
  mainText: string
  tabActiveBg: string
  tabActiveText: string
}

export type CenterBranding = {
  centerId: string
  centerName: string
  centerSlug: string
  logoUrl: string | null
  theme: CenterTheme
}

export const DEFAULT_CENTER_THEME: CenterTheme = {
  sidebarBg: '#1c1c1c',
  sidebarText: '#f5f0e8',
  sidebarMuted: 'rgba(245,240,232,0.65)',
  accent: '#c8b882',
  accentDark: '#a89868',
  mainBg: '#f5f0e8',
  mainText: '#1c1c1c',
  tabActiveBg: 'rgba(200,184,130,0.22)',
  tabActiveText: '#c8b882',
}

export type ThemePreset = {
  id: string
  name: string
  description: string
  theme: CenterTheme
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'classic',
    name: '클래식 다크',
    description: '차분한 다크 사이드바 + 골드 포인트',
    theme: DEFAULT_CENTER_THEME,
  },
  {
    id: 'ocean',
    name: '오션 블루',
    description: '시원한 블루 톤',
    theme: {
      sidebarBg: '#0f2744',
      sidebarText: '#eef6ff',
      sidebarMuted: 'rgba(238,246,255,0.68)',
      accent: '#5eb3ff',
      accentDark: '#3d93df',
      mainBg: '#f3f8fd',
      mainText: '#10243d',
      tabActiveBg: 'rgba(94,179,255,0.18)',
      tabActiveText: '#2f7fd1',
    },
  },
  {
    id: 'forest',
    name: '포레스트',
    description: '그린 기반 자연 톤',
    theme: {
      sidebarBg: '#1a2f24',
      sidebarText: '#edf7f0',
      sidebarMuted: 'rgba(237,247,240,0.68)',
      accent: '#7fbf8a',
      accentDark: '#5f9f6a',
      mainBg: '#f2f7f3',
      mainText: '#1a2f24',
      tabActiveBg: 'rgba(127,191,138,0.2)',
      tabActiveText: '#4f8f5d',
    },
  },
  {
    id: 'rose',
    name: '로즈',
    description: '부드러운 로즈 포인트',
    theme: {
      sidebarBg: '#3a2430',
      sidebarText: '#fff5f8',
      sidebarMuted: 'rgba(255,245,248,0.68)',
      accent: '#e7a1b5',
      accentDark: '#c97f97',
      mainBg: '#fbf4f6',
      mainText: '#3a2430',
      tabActiveBg: 'rgba(231,161,181,0.2)',
      tabActiveText: '#c97f97',
    },
  },
  {
    id: 'minimal',
    name: '미니멀 라이트',
    description: '밝은 사이드바 + 심플 톤',
    theme: {
      sidebarBg: '#ffffff',
      sidebarText: '#1c1c1c',
      sidebarMuted: 'rgba(28,28,28,0.55)',
      accent: '#4b5563',
      accentDark: '#374151',
      mainBg: '#f8fafc',
      mainText: '#111827',
      tabActiveBg: 'rgba(75,85,99,0.12)',
      tabActiveText: '#374151',
    },
  },
]

export function parseCenterTheme(raw: unknown): CenterTheme {
  let value: unknown = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return DEFAULT_CENTER_THEME
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_CENTER_THEME
  }
  const row = value as Record<string, unknown>
  const pick = (key: keyof CenterTheme) => {
    const value = row[key]
    return typeof value === 'string' && value.trim() ? value : DEFAULT_CENTER_THEME[key]
  }
  return {
    sidebarBg: pick('sidebarBg'),
    sidebarText: pick('sidebarText'),
    sidebarMuted: pick('sidebarMuted'),
    accent: pick('accent'),
    accentDark: pick('accentDark'),
    mainBg: pick('mainBg'),
    mainText: pick('mainText'),
    tabActiveBg: pick('tabActiveBg'),
    tabActiveText: pick('tabActiveText'),
  }
}

export function themeToCssVars(theme: CenterTheme): Record<string, string> {
  return {
    '--center-sidebar-bg': theme.sidebarBg,
    '--center-sidebar-text': theme.sidebarText,
    '--center-sidebar-muted': theme.sidebarMuted,
    '--center-accent': theme.accent,
    '--center-accent-dark': theme.accentDark,
    '--center-main-bg': theme.mainBg,
    '--center-main-text': theme.mainText,
    '--center-tab-active-bg': theme.tabActiveBg,
    '--center-tab-active-text': theme.tabActiveText,
  }
}
