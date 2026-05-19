import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Top-level error caught:', error, errorInfo)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="bg-app min-h-screen flex items-center justify-center p-6">
          <div className="bg-surface-container rounded-2xl shadow-elev2 p-8 max-w-lg w-full text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-error-container text-error-container-foreground flex items-center justify-center text-2xl">
              !
            </div>
            <h1 className="text-headline-sm text-foreground">Something went wrong</h1>
            <p className="text-body-md text-muted-foreground">
              An unexpected error occurred. Please reload the page.
            </p>
            {this.state.error?.message && (
              <pre className="text-body-sm text-left whitespace-pre-wrap rounded-lg bg-surface-container-high p-4 max-h-48 overflow-auto">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="state-layer inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 h-10 text-label-lg shadow-elev1 transition-colors duration-short3"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
