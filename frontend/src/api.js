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
