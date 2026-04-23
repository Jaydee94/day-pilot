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
 * Upload a Google credentials.json file to the backend.
 * @param {File} file
 * @returns {Promise<{status: string, path: string, filename: string}>}
 */
export async function uploadGoogleCredentials(file) {
  const formData = new FormData()
  formData.append('file', file)
  const resp = await fetch(`${API_BASE}/settings/google-credentials/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

/**
 * List all configured Google credentials entries.
 * @returns {Promise<Array<{index: number, path: string, filename: string, exists: boolean}>>}
 */
export async function fetchGoogleCredentials() {
  const resp = await fetch(`${API_BASE}/settings/google-credentials`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * Remove a Google credentials entry by index.
 * @param {number} index
 * @returns {Promise<{status: string, path: string}>}
 */
export async function deleteGoogleCredential(index) {
  const resp = await fetch(`${API_BASE}/settings/google-credentials/${index}`, {
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
