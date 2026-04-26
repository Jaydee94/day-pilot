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
export async function fetchEvents(assignedTo = null) {
  const url = assignedTo
    ? `${API_BASE}/events?assigned_to=${encodeURIComponent(assignedTo)}`
    : `${API_BASE}/events`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * Fetch all open todos from the backend.
 * Does NOT trigger any AI calls.
 * @returns {Promise<Array>} list of TodoItem objects
 */
export async function fetchTodos(assignedTo = null) {
  const url = assignedTo
    ? `${API_BASE}/todos?assigned_to=${encodeURIComponent(assignedTo)}`
    : `${API_BASE}/todos`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

export async function fetchFamilyMembers() {
  const resp = await fetch(`${API_BASE}/family-members`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

export async function fetchFamilyProfiles() {
  const resp = await fetch(`${API_BASE}/family-members/profiles`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

export async function createFamilyMember(data) {
  const resp = await fetch(`${API_BASE}/family-members/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

export async function updateFamilyMember(id, data) {
  const resp = await fetch(`${API_BASE}/family-members/profiles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

export async function deleteFamilyMember(id) {
  const resp = await fetch(`${API_BASE}/family-members/profiles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${resp.status}`)
  }
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
 * @param {boolean} [isBirthday=false]
 * @returns {Promise<{status: string, index: number, url: string, is_birthday: boolean}>}
 */
export async function addICalUrl(url, isBirthday = false) {
  const resp = await fetch(`${API_BASE}/settings/ical-urls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, is_birthday: isBirthday }),
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

/**
 * Update properties of an existing iCal feed by index (e.g. toggle is_birthday).
 * @param {number} index
 * @param {{is_birthday?: boolean}} patch
 * @returns {Promise<{status: string, index: number, url: string, is_birthday: boolean}>}
 */
export async function patchICalFeed(index, patch) {
  const resp = await fetch(`${API_BASE}/settings/ical-urls/${index}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
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

/**
 * Fetch the current sync/service status (including last calendar sync time).
 * @returns {Promise<{ical_calendar: boolean, apple_calendar: boolean, weather: boolean, last_sync: string|null, errors: string[]}>}
 */
export async function fetchSyncStatus() {
  const resp = await fetch(`${API_BASE}/status`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * Delete a locally created calendar event by ID.
 * Only events with source='local' can be deleted via this endpoint.
 * @param {string} eventId
 * @returns {Promise<{status: string, event_id: string}>}
 */
export async function deleteEvent(eventId) {
  const resp = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

/**
 * Fetch upcoming birthdays detected from configured birthday calendars.
 * @param {number} daysAhead - How many days ahead to scan (default 366)
 * @param {number} limit - Maximum number of birthdays to return (default 5)
 * @returns {Promise<Array>} list of Birthday objects
 */
export async function fetchBirthdays(daysAhead = 366, limit = 5) {
  const resp = await fetch(`${API_BASE}/birthdays?days_ahead=${daysAhead}&limit=${limit}`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

/**
 * Mark a local task as completed.
 * @param {string} todoId
 * @returns {Promise<{status: string, todo_id: string}>}
 */
export async function completeTodo(todoId) {
  const resp = await fetch(`${API_BASE}/todos/${encodeURIComponent(todoId)}/complete`, {
    method: 'PATCH',
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

/**
 * Update a locally stored calendar event.
 * @param {string} eventId
 * @param {{title?: string, start?: string, end?: string, location?: string, description?: string}} data
 * @returns {Promise<Object>} updated CalendarEvent
 */
export async function updateEvent(eventId, data) {
  const resp = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

export async function fetchShoppingItems() {
  const resp = await fetch(`${API_BASE}/shopping`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

export async function addShoppingItem(name, category = 'Sonstiges', quantity = null) {
  const resp = await fetch(`${API_BASE}/shopping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category, quantity }),
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

export async function checkShoppingItem(itemId) {
  const resp = await fetch(`${API_BASE}/shopping/${encodeURIComponent(itemId)}/check`, {
    method: 'PATCH',
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

export async function deleteShoppingItem(itemId) {
  const resp = await fetch(`${API_BASE}/shopping/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${resp.status}`)
  }
  return resp.json()
}

export async function clearCheckedShoppingItems() {
  const resp = await fetch(`${API_BASE}/shopping/clear-checked`, { method: 'POST' })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

