import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          role="alert"
          className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center"
          dir="rtl"
        >
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 space-y-4">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800">אירעה שגיאה בלתי צפויה</h1>
            <p className="text-gray-500 text-sm">
              {this.state.error?.message ?? 'שגיאה לא ידועה'}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                נסה שוב
              </button>
              <button
                onClick={() => window.location.assign('/')}
                className="w-full border border-gray-300 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
              >
                חזור לדף הבית
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
