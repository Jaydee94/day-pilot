/**
 * Centralised API helper for Day Pilot frontend.
 */

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

/**
 * Fetch the current user-configurable settings from the backend.
 * @returns {Promise<Object>} settings object
 */
export async function fetchSettings() {
  const resp = await fetch(`${API_BASE}/settings`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * Save (partial) settings to the backend.
 * @param {Object} updates – only the keys to update need to be provided
 * @returns {Promise<Object>} updated settings object
 */
export async function saveSettings(updates) {
  const resp = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * Test a single integration connection using the current unsaved settings values.
 * @param {string} integration
 * @param {Object} overrides
 * @returns {Promise<{integration: string, ok: boolean, message: string}>}
 */
export async function testIntegrationConnection(integration, overrides = {}) {
  const resp = await fetch(`${API_BASE}/settings/test-connection/${integration}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides }),
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

/**
 * Check whether the initial setup wizard has been completed.
 * @returns {Promise<{setup_complete: boolean, needs_setup: boolean}>}
 */
export async function fetchSetupStatus() {
  const resp = await fetch(`${API_BASE}/settings/status`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * Fetch all scheduled jobs from the backend scheduler.
 * @returns {Promise<Array>} list of ScheduledJob objects
 */
export async function fetchSchedulerJobs() {
  const resp = await fetch(`${API_BASE}/scheduler/jobs`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * Manually trigger a scheduled job by its ID.
 * @param {string} jobId
 * @returns {Promise<{status: string, job_id: string}>}
 */
export async function triggerSchedulerJob(jobId) {
  const resp = await fetch(`${API_BASE}/scheduler/jobs/${jobId}/run`, { method: 'POST' })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * Fetch all calendar events for today from the backend.
 * Does NOT trigger any AI calls.
 * @returns {Promise<Array>} list of CalendarEvent objects
 */
export async function fetchEvents() {
  const resp = await fetch(`${API_BASE}/events`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * Fetch all open todos from the backend.
 * Does NOT trigger any AI calls.
 * @returns {Promise<Array>} list of TodoItem objects
 */
export async function fetchTodos() {
  const resp = await fetch(`${API_BASE}/todos`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * List all configured iCal feed URLs.
 * @returns {Promise<Array<{index: number, url: string}>>}
 */
export async function fetchICalUrls() {
  const resp = await fetch(`${API_BASE}/settings/ical-urls`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * Add a new iCal feed URL.
 * @param {string} url
 * @returns {Promise<{status: string, index: number, url: string}>}
 */
export async function addICalUrl(url) {
  const resp = await fetch(`${API_BASE}/settings/ical-urls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

/**
 * Remove an iCal feed URL by index.
 * @param {number} index
 * @returns {Promise<{status: string, url: string}>}
 */
export async function deleteICalUrl(index) {
  const resp = await fetch(`${API_BASE}/settings/ical-urls/${index}`, {
    method: 'DELETE',
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

/**
 * List all configured CalDAV accounts.
 * @returns {Promise<Array<{index: number, url: string, username: string, password_set: boolean}>>}
 */
export async function fetchCalDAVAccounts() {
  const resp = await fetch(`${API_BASE}/settings/caldav-accounts`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * Add a new CalDAV account.
 * @param {{url: string, username: string, password: string}} account
 * @returns {Promise<{status: string, index: number, url: string}>}
 */
export async function addCalDAVAccount(account) {
  const resp = await fetch(`${API_BASE}/settings/caldav-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account),
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

/**
 * Remove a CalDAV account by index.
 * @param {number} index
 * @returns {Promise<{status: string, url: string}>}
 */
export async function deleteCalDAVAccount(index) {
  const resp = await fetch(`${API_BASE}/settings/caldav-accounts/${index}`, {
    method: 'DELETE',
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}
