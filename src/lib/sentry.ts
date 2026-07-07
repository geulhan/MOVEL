import * as Sentry from '@sentry/react'
import { getAdminSession } from './adminSession'

let initialized = false

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  if (!dsn || initialized) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1,
    beforeSend(event) {
      const session = getAdminSession()
      if (session) {
        event.user = {
          id: session.adminId,
          username: session.username,
        }
        event.tags = {
          ...event.tags,
          center_id: session.centerId,
          role: session.role,
        }
      }
      event.tags = {
        ...event.tags,
        route: window.location.pathname,
      }
      return event
    },
  })

  initialized = true
}

export function captureAppError(error: unknown, context?: Record<string, string>): void {
  if (!initialized) {
    console.error('[MotionHub] uncaught error', error, context)
    return
  }

  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setTag(key, value)
      }
    }
    Sentry.captureException(error)
  })
}

export { Sentry }
