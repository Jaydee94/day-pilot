import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import Navigation from './components/Navigation.jsx'
import TodayPage from './pages/TodayPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import ShoppingPage from './pages/ShoppingPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import SchedulerPage from './pages/SchedulerPage.jsx'
import SetupWizard from './pages/SetupWizard.jsx'
import KioskPage from './pages/KioskPage.jsx'
import DesignPlayground from './pages/_design'
import { fetchSetupStatus, fetchSettings, API_BASE } from './lib/api'
import type { DailySummary } from './lib/types'
import { I18nProvider, useI18n } from './i18n.jsx'
import { ThemeToggle } from './components/layout/ThemeToggle'

interface AppContentProps {
  setLanguage: (lang: string) => void
}

function AppContent({ setLanguage }: AppContentProps): JSX.Element {
  const { t, locale } = useI18n()
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)

  useEffect(() => {
    fetchSetupStatus()
      .then(data => setNeedsSetup(data.needs_setup))
      .catch(() => setNeedsSetup(false))
  }, [])

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(`${API_BASE}/summary`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = (await resp.json()) as DailySummary
      setSummary(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
    const interval = setInterval(fetchSummary, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchSummary])

  if (needsSetup === true) {
    return (
      <BrowserRouter>
        <SetupWizard
          onComplete={() => {
            setNeedsSetup(false)
            fetchSummary()
          }}
          onLanguageChange={setLanguage}
        />
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <div className="bg-app min-h-screen flex flex-col pb-24 md:pb-0 md:pl-20">
        <header className="sticky top-0 z-40 bg-surface-container-low/80 backdrop-blur-md border-b border-outline-variant pt-safe">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="DayPilot logo" className="w-8 h-8" />
              <div className="leading-tight">
                <h1 className="text-title-lg text-foreground">DayPilot</h1>
                <p className="text-label-sm text-muted-foreground -mt-0.5">{t('appTagline')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastRefresh && (
                <span className="hidden sm:inline text-label-md text-muted-foreground">
                  {t('updatedAt', {
                    time: lastRefresh.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
                  })}
                </span>
              )}
              <ThemeToggle />
              <button
                type="button"
                onClick={fetchSummary}
                disabled={loading}
                title={t('refresh')}
                aria-label={t('refresh')}
                className="state-layer relative w-10 h-10 rounded-full text-foreground hover:bg-surface-container disabled:opacity-50 inline-flex items-center justify-center transition-colors duration-short3"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
          {loading && !summary && (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
              <div className="w-10 h-10 rounded-full border-[3px] border-outline-variant border-t-primary animate-spin" />
              <p className="text-body-md">{t('loadingSummary')}</p>
            </div>
          )}
          {error && (
            <div className="bg-error-container text-error-container-foreground rounded-2xl p-6 flex flex-col items-center gap-3 max-w-md mx-auto mt-12">
              <AlertTriangle className="w-8 h-8" />
              <p className="text-body-md text-center">
                {t('errorPrefix')} {error}
              </p>
              <button
                type="button"
                onClick={fetchSummary}
                className="state-layer rounded-full bg-error text-error-foreground h-10 px-6 text-label-lg shadow-elev1"
              >
                {t('tryAgain')}
              </button>
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
              <Route path="/_design" element={<DesignPlayground />} />
              <Route path="*" element={<Navigate to="/today" replace />} />
            </Routes>
          )}
        </main>

        <Navigation />
      </div>
    </BrowserRouter>
  )
}

function App(): JSX.Element {
  const [language, setLanguage] = useState<string>('en')

  useEffect(() => {
    fetchSettings()
      .then(data => {
        const lang = data.APP_LANGUAGE === 'de' ? 'de' : 'en'
        setLanguage(lang)
      })
      .catch(() => {
        setLanguage('en')
      })
  }, [])

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
