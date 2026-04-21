import { useState, useEffect, useCallback } from 'react'
import DailySummary from './components/DailySummary.jsx'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

function App() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(`${API_BASE}/summary`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      setSummary(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
    // Auto-refresh every 15 minutes
    const interval = setInterval(fetchSummary, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchSummary])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__brand">
            <span className="app-header__icon">✈️</span>
            <h1 className="app-header__title">Day Pilot</h1>
          </div>
          <div className="app-header__meta">
            {lastRefresh && (
              <span className="app-header__refresh">
                Stand: {lastRefresh.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              className="btn btn--icon"
              onClick={fetchSummary}
              disabled={loading}
              title="Aktualisieren"
            >
              {loading ? '⏳' : '🔄'}
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {loading && !summary && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Lade Tages-Zusammenfassung…</p>
          </div>
        )}
        {error && (
          <div className="error-state">
            <span>⚠️</span>
            <p>Fehler: {error}</p>
            <button className="btn" onClick={fetchSummary}>Erneut versuchen</button>
          </div>
        )}
        {summary && <DailySummary summary={summary} />}
      </main>
    </div>
  )
}

export default App
