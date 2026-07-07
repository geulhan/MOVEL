import { Component, type ErrorInfo, type ReactNode } from 'react'
import { captureAppError } from '../lib/sentry'
import { getAdminSession } from '../lib/adminSession'
import { btnOutline } from '../styles/theme'

type Props = {
  children: ReactNode
  area?: 'admin' | 'member' | 'platform'
}

type State = {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const session = getAdminSession()
    captureAppError(error, {
      area: this.props.area ?? 'admin',
      action: 'error_boundary',
      component_stack: info.componentStack?.slice(0, 200) ?? '',
      center_id: session?.centerId ?? '',
      role: session?.role ?? '',
      route: window.location.pathname,
    })
  }

  private handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-charcoal/10 bg-white px-6 py-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-charcoal">
            화면을 불러오는 중 문제가 발생했습니다.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            잠시 후 다시 시도해주세요.
            <br />
            문제가 반복되면 모션허브에 문의해주세요.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" className={btnOutline} onClick={this.handleRetry}>
              다시 시도
            </button>
            <button
              type="button"
              className={btnOutline}
              onClick={() => window.location.reload()}
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      </div>
    )
  }
}
