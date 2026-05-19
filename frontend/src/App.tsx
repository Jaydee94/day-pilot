import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import TodayPage from './pages/TodayPage'
import CalendarPage from './pages/CalendarPage'
import TasksPage from './pages/TasksPage'
import ShoppingPage from './pages/ShoppingPage'
import SettingsPage from './pages/SettingsPage'
import SchedulerPage from './pages/SchedulerPage'
import SetupWizard from './pages/SetupWizard'
import KioskPage from './pages/KioskPage'
import DesignPlayground from './pages/_design'
import { API_BASE, fetchSettings, fetchSetupStatus } from './lib/api'
import type { DailySummary } from './lib/types'
import { I18nProvider, useI18n } from './i18n.jsx'
import { AppShell } from './components/layout/AppShell'
import { Spinner } from './components/feedback/Spinner'
import { ErrorState } from './components/feedback/ErrorState'

interface AppContentProps {
  setLanguage: (lang: string) => void
}

function AppContent({ setLanguage }: AppContentProps): JSX.Element {
  const { t } = useI18n()
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
      <AppShell loading={loading} lastRefresh={lastRefresh} onRefresh={fetchSummary}>
        {loading && !summary && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
            <Spinner size="md" />
            <p className="text-body-md">{t('loadingSummary')}</p>
          </div>
        )}
        {error && (
          <ErrorState
            title={t('errorPrefix')}
            message={error}
            onRetry={fetchSummary}
            retryLabel={t('tryAgain')}
            className="mt-12"
          />
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
      </AppShell>
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
      .catch(() => setLanguage('en'))
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
