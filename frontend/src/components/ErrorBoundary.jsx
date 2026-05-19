import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('Top-level error caught:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Please reload the page.</p>
          {this.state.error?.message && (
            <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f4f4', padding: '1rem' }}>
              {this.state.error.message}
            </pre>
          )}
          <button type="button" onClick={this.handleReload}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
