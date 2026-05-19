/**
 * Centralised API helper for Day Pilot frontend.
 */

export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const DEFAULT_TIMEOUT_MS = 15000

/**
 * Generic fetch wrapper for the Day Pilot backend.
 *
 * - Prefixes `API_BASE` (path should start with `/`).
 * - Applies a configurable `AbortController` timeout (default 15s).
 * - Auto-serialises object bodies to JSON and sets `Content-Type` if absent.
 * - On non-OK responses, attempts to parse `{detail}` and throws `Error(detail)`.
 * - Returns parsed JSON by default; pass `raw: true` to receive the `Response`.
 *
 * @param {string} path
 * @param {{
 *   method?: string,
 *   body?: any,
 *   headers?: Record<string,string>,
 *   timeoutMs?: number,
 *   raw?: boolean,
 * }} [options]
 */
export async function apiFetch(
  path,
  { method = 'GET', body, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, raw = false } = {},
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const finalHeaders = { ...headers }
  let finalBody = body
  if (body !== undefined && typeof body !== 'string' && !(body instanceof FormData)) {
    finalBody = JSON.stringify(body)
    if (!finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'application/json'
  }
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      method,
      headers: finalHeaders,
      body: finalBody,
      signal: controller.signal,
    })
    if (!resp.ok) {
      let detail
      try {
        detail = (await resp.json()).detail
      } catch {
        /* ignore JSON parse errors on error responses */
      }
      throw new Error(detail || `HTTP ${resp.status}`)
    }
    return raw ? resp : resp.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${path}`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetch the current user-configurable settings from the backend.
 * @returns {Promise<Object>} settings object
 */
export async function fetchSettings() {
  return apiFetch('/settings')
}

/**
 * Save (partial) settings to the backend.
 * @param {Object} updates – only the keys to update need to be provided
 * @returns {Promise<Object>} updated settings object
 */
export async function saveSettings(updates) {
  return apiFetch('/settings', { method: 'PUT', body: updates })
}

/**
 * Test a single integration connection using the current unsaved settings values.
 * @param {string} integration
 * @param {Object} overrides
 * @returns {Promise<{integration: string, ok: boolean, message: string}>}
 */
export async function testIntegrationConnection(integration, overrides = {}) {
  return apiFetch(`/settings/test-connection/${integration}`, {
    method: 'POST',
    body: { overrides },
  })
}

/**
 * Check whether the initial setup wizard has been completed.
 * @returns {Promise<{setup_complete: boolean, needs_setup: boolean}>}
 */
export async function fetchSetupStatus() {
  return apiFetch('/settings/status')
}

/**
 * Fetch all scheduled jobs from the backend scheduler.
 * @returns {Promise<Array>} list of ScheduledJob objects
 */
export async function fetchSchedulerJobs() {
  return apiFetch('/scheduler/jobs')
}

/**
 * Manually trigger a scheduled job by its ID.
 * @param {string} jobId
 * @returns {Promise<{status: string, job_id: string}>}
 */
export async function triggerSchedulerJob(jobId) {
  return apiFetch(`/scheduler/jobs/${jobId}/run`, { method: 'POST' })
}

/**
 * Fetch all calendar events for today from the backend.
 * Does NOT trigger any AI calls.
 * @returns {Promise<Array>} list of CalendarEvent objects
 */
export async function fetchEvents(assignedTo = null) {
  const path = assignedTo
    ? `/events?assigned_to=${encodeURIComponent(assignedTo)}`
    : '/events'
  return apiFetch(path)
}

/**
 * Fetch all open todos from the backend.
 * Does NOT trigger any AI calls.
 * @returns {Promise<Array>} list of TodoItem objects
 */
export async function fetchTodos(assignedTo = null) {
  const path = assignedTo
    ? `/todos?assigned_to=${encodeURIComponent(assignedTo)}`
    : '/todos'
  return apiFetch(path)
}

export async function fetchFamilyMembers() {
  return apiFetch('/family-members')
}

export async function fetchFamilyProfiles() {
  return apiFetch('/family-members/profiles')
}

export async function createFamilyMember(data) {
  return apiFetch('/family-members/profiles', { method: 'POST', body: data })
}

export async function updateFamilyMember(id, data) {
  return apiFetch(`/family-members/profiles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteFamilyMember(id) {
  return apiFetch(`/family-members/profiles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

/**
 * List all configured iCal feed URLs.
 * @returns {Promise<Array<{index: number, url: string}>>}
 */
export async function fetchICalUrls() {
  return apiFetch('/settings/ical-urls')
}

/**
 * Add a new iCal feed URL.
 * @param {string} url
 * @param {boolean} [isBirthday=false]
 * @returns {Promise<{status: string, index: number, url: string, is_birthday: boolean}>}
 */
export async function addICalUrl(url, isBirthday = false) {
  return apiFetch('/settings/ical-urls', {
    method: 'POST',
    body: { url, is_birthday: isBirthday },
  })
}

/**
 * Update properties of an existing iCal feed by index (e.g. toggle is_birthday).
 * @param {number} index
 * @param {{is_birthday?: boolean}} patch
 * @returns {Promise<{status: string, index: number, url: string, is_birthday: boolean}>}
 */
export async function patchICalFeed(index, patch) {
  return apiFetch(`/settings/ical-urls/${index}`, { method: 'PATCH', body: patch })
}

/**
 * Remove an iCal feed URL by index.
 * @param {number} index
 * @returns {Promise<{status: string, url: string}>}
 */
export async function deleteICalUrl(index) {
  return apiFetch(`/settings/ical-urls/${index}`, { method: 'DELETE' })
}

/**
 * List all configured CalDAV accounts.
 * @returns {Promise<Array<{index: number, url: string, username: string, password_set: boolean}>>}
 */
export async function fetchCalDAVAccounts() {
  return apiFetch('/settings/caldav-accounts')
}

/**
 * Add a new CalDAV account.
 * @param {{url: string, username: string, password: string}} account
 * @returns {Promise<{status: string, index: number, url: string}>}
 */
export async function addCalDAVAccount(account) {
  return apiFetch('/settings/caldav-accounts', { method: 'POST', body: account })
}

/**
 * Remove a CalDAV account by index.
 * @param {number} index
 * @returns {Promise<{status: string, url: string}>}
 */
export async function deleteCalDAVAccount(index) {
  return apiFetch(`/settings/caldav-accounts/${index}`, { method: 'DELETE' })
}

/**
 * Fetch the current sync/service status (including last calendar sync time).
 * @returns {Promise<{ical_calendar: boolean, apple_calendar: boolean, weather: boolean, last_sync: string|null, errors: string[]}>}
 */
export async function fetchSyncStatus() {
  return apiFetch('/status')
}

/**
 * Delete a locally created calendar event by ID.
 * Only events with source='local' can be deleted via this endpoint.
 * @param {string} eventId
 * @returns {Promise<{status: string, event_id: string}>}
 */
export async function deleteEvent(eventId) {
  return apiFetch(`/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
}

/**
 * Fetch upcoming birthdays detected from configured birthday calendars.
 * @param {number} daysAhead - How many days ahead to scan (default 366)
 * @param {number} limit - Maximum number of birthdays to return (default 5)
 * @returns {Promise<Array>} list of Birthday objects
 */
export async function fetchBirthdays(daysAhead = 366, limit = 5) {
  return apiFetch(`/birthdays?days_ahead=${daysAhead}&limit=${limit}`)
}

/**
 * Mark a local task as completed.
 * @param {string} todoId
 * @returns {Promise<{status: string, todo_id: string}>}
 */
export async function completeTodo(todoId) {
  return apiFetch(`/todos/${encodeURIComponent(todoId)}/complete`, { method: 'PATCH' })
}

/**
 * Update a locally stored calendar event.
 * @param {string} eventId
 * @param {{title?: string, start?: string, end?: string, location?: string, description?: string}} data
 * @returns {Promise<Object>} updated CalendarEvent
 */
export async function updateEvent(eventId, data) {
  return apiFetch(`/events/${encodeURIComponent(eventId)}`, { method: 'PUT', body: data })
}

export async function fetchShoppingItems() {
  return apiFetch('/shopping')
}

export async function addShoppingItem(name, category = 'Sonstiges', quantity = null) {
  return apiFetch('/shopping', {
    method: 'POST',
    body: { name, category, quantity },
  })
}

export async function checkShoppingItem(itemId) {
  return apiFetch(`/shopping/${encodeURIComponent(itemId)}/check`, { method: 'PATCH' })
}

export async function deleteShoppingItem(itemId) {
  return apiFetch(`/shopping/${encodeURIComponent(itemId)}`, { method: 'DELETE' })
}

export async function clearCheckedShoppingItems() {
  return apiFetch('/shopping/clear-checked', { method: 'POST' })
}
