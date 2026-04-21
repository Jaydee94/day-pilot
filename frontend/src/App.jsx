import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navigation from './components/Navigation.jsx'
import TodayPage from './pages/TodayPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
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
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <div className="app-header__inner">
            <div className="app-header__brand">
              <img src="/favicon.svg" alt="DayPilot logo" className="app-header__logo" />
              <h1 className="app-header__title">
                DayPilot
                <span className="app-header__tagline"> your daily co-pilot</span>
              </h1>
            </div>
            <div className="app-header__meta">
              {lastRefresh && (
                <span className="app-header__refresh">
                  Updated: {lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                className="btn btn--icon"
                onClick={fetchSummary}
                disabled={loading}
                title="Refresh"
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
              <p>Loading your daily summary…</p>
            </div>
          )}
          {error && (
            <div className="error-state">
              <span>⚠️</span>
              <p>Error: {error}</p>
              <button className="btn" onClick={fetchSummary}>Try again</button>
            </div>
          )}
          {summary && (
            <Routes>
              <Route path="/" element={<Navigate to="/today" replace />} />
              <Route path="/today" element={<TodayPage summary={summary} />} />
              <Route path="/calendar" element={<CalendarPage events={summary.events || []} />} />
              <Route path="/tasks" element={<TasksPage todos={summary.todos || []} />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/today" replace />} />
            </Routes>
          )}
        </main>

        <Navigation />
      </div>
    </BrowserRouter>
  )
}

export default App
