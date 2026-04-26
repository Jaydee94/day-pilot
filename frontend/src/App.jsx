import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navigation from './components/Navigation.jsx'
import TodayPage from './pages/TodayPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import ShoppingPage from './pages/ShoppingPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import SchedulerPage from './pages/SchedulerPage.jsx'
import SetupWizard from './pages/SetupWizard.jsx'
import KioskPage from './pages/KioskPage.jsx'
import AppIcon from './components/AppIcon.jsx'
import { fetchSetupStatus, fetchSettings } from './api.js'
import { I18nProvider, useI18n } from './i18n.jsx'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

function AppContent({ setLanguage }) {
  const { t, locale } = useI18n()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  // null = not yet checked, true = wizard needed, false = already done
  const [needsSetup, setNeedsSetup] = useState(null)

  // Check setup status once on mount
  useEffect(() => {
    fetchSetupStatus()
      .then(data => setNeedsSetup(data.needs_setup))
      .catch(() => setNeedsSetup(false)) // if backend unreachable, skip wizard
  }, [])

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
    // Auto-refresh every 60 minutes to keep the Today page reasonably fresh.
    // More frequent refreshes are NOT needed here because:
    //  - Calendar and Tasks pages fetch their own data directly (no AI)
    //  - The AI briefing is cached per day on the backend (one AI call per day)
    //  - Weather and event data changes slowly enough that 60 min is acceptable
    const interval = setInterval(fetchSummary, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchSummary])

  // Show setup wizard as a full-page experience when first-run setup is needed
  if (needsSetup === true) {
    return (
      <BrowserRouter>
        <SetupWizard
          onComplete={() => { setNeedsSetup(false); fetchSummary() }}
          onLanguageChange={setLanguage}
        />
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <div className="app-header__inner">
            <div className="app-header__brand">
              <img src="/favicon.svg" alt="DayPilot logo" className="app-header__logo" />
              <h1 className="app-header__title">
                DayPilot
                <span className="app-header__tagline"> {t('appTagline')}</span>
              </h1>
            </div>
            <div className="app-header__meta">
              {lastRefresh && (
                <span className="app-header__refresh">
                  {t('updatedAt', {
                    time: lastRefresh.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
                  })}
                </span>
              )}
              <button
                className="btn btn--icon"
                onClick={fetchSummary}
                disabled={loading}
                title={t('refresh')}
                aria-label={t('refresh')}
              >
                {loading ? (
                  <span className="app-header__refresh-loading" aria-hidden="true">...</span>
                ) : (
                  <AppIcon name="refresh" className="btn__icon-svg" />
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="app-main">
          {loading && !summary && (
            <div className="loading-state">
              <div className="spinner" />
              <p>{t('loadingSummary')}</p>
            </div>
          )}
          {error && (
            <div className="error-state">
              <span>⚠️</span>
              <p>{t('errorPrefix')} {error}</p>
              <button className="btn" onClick={fetchSummary}>{t('tryAgain')}</button>
            </div>
          )}
          {summary && (
            <Routes>
              <Route path="/" element={<Navigate to="/today" replace />} />
              <Route path="/today" element={<TodayPage summary={summary} onAddSuccess={fetchSummary} />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/shopping" element={<ShoppingPage />} />
              <Route path="/settings" element={<SettingsPage onLanguageChange={setLanguage} />} />
              <Route path="/scheduler" element={<SchedulerPage />} />
              <Route path="*" element={<Navigate to="/today" replace />} />
            </Routes>
          )}
        </main>

        <Navigation />
      </div>
    </BrowserRouter>
  )
}

function App() {
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        const lang = data.APP_LANGUAGE === 'de' ? 'de' : 'en'
        setLanguage(lang)
      })
      .catch(() => {
        setLanguage('en')
      })
  }, [])

  // Kiosk mode — full-screen view without header/navigation
  if (window.location.pathname.startsWith('/kiosk')) {
    return (
      <I18nProvider language={language} setLanguage={setLanguage}>
        <BrowserRouter>
          <KioskPage />
        </BrowserRouter>
      </I18nProvider>
    )
  }

  return (
    <I18nProvider language={language} setLanguage={setLanguage}>
      <AppContent setLanguage={setLanguage} />
    </I18nProvider>
  )
}

export default App
