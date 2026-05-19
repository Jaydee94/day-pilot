/**
 * Centralised, typed API client for the DayPilot backend.
 */

import type {
  Birthday,
  CalDAVAccount,
  CalendarEvent,
  DailySummary,
  FamilyMemberProfile,
  ICalFeed,
  IntegrationTestResult,
  ScheduledJob,
  SetupStatus,
  ShoppingItem,
  SyncStatus,
  TodoItem,
  UserSettings,
} from './types'

export const API_BASE: string = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const DEFAULT_TIMEOUT_MS = 15_000

export interface ApiFetchOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  timeoutMs?: number
  raw?: boolean
}

/**
 * Generic fetch wrapper.
 *  - Prefixes `API_BASE` (path should start with `/`).
 *  - Applies a configurable AbortController timeout (default 15s).
 *  - Auto-serialises object bodies to JSON.
 *  - On non-OK responses, parses `{detail}` and throws Error(detail).
 */
export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, raw = false } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const finalHeaders: Record<string, string> = { ...headers }
  let finalBody: BodyInit | undefined
  if (body !== undefined && body !== null) {
    if (typeof body === 'string' || body instanceof FormData) {
      finalBody = body as BodyInit
    } else {
      finalBody = JSON.stringify(body)
      if (!finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'application/json'
    }
  }

  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      method,
      headers: finalHeaders,
      body: finalBody,
      signal: controller.signal,
    })
    if (!resp.ok) {
      let detail: string | undefined
      try {
        const j = (await resp.json()) as { detail?: string }
        detail = j.detail
      } catch {
        // ignore JSON parse errors on error responses
      }
      throw new Error(detail || `HTTP ${resp.status}`)
    }
    return raw ? (resp as unknown as T) : ((await resp.json()) as T)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${path}`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ---------- Summary ----------

export async function fetchSummary(): Promise<DailySummary> {
  return apiFetch<DailySummary>('/summary')
}

// ---------- Settings ----------

export async function fetchSettings(): Promise<UserSettings> {
  return apiFetch<UserSettings>('/settings')
}

export async function saveSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
  return apiFetch<UserSettings>('/settings', { method: 'PUT', body: updates })
}

export async function testIntegrationConnection(
  integration: string,
  overrides: Partial<UserSettings> = {},
): Promise<IntegrationTestResult> {
  return apiFetch<IntegrationTestResult>(`/settings/test-connection/${integration}`, {
    method: 'POST',
    body: { overrides },
  })
}

export async function fetchSetupStatus(): Promise<SetupStatus> {
  return apiFetch<SetupStatus>('/settings/status')
}

// ---------- Scheduler ----------

export async function fetchSchedulerJobs(): Promise<ScheduledJob[]> {
  return apiFetch<ScheduledJob[]>('/scheduler/jobs')
}

export async function triggerSchedulerJob(jobId: string): Promise<{ status: string; job_id: string }> {
  return apiFetch(`/scheduler/jobs/${encodeURIComponent(jobId)}/run`, { method: 'POST' })
}

// ---------- Events ----------

export async function fetchEvents(assignedTo: string | null = null): Promise<CalendarEvent[]> {
  const path = assignedTo ? `/events?assigned_to=${encodeURIComponent(assignedTo)}` : '/events'
  return apiFetch<CalendarEvent[]>(path)
}

export async function createEvent(data: {
  title: string
  start: string
  end?: string
  location?: string
  description?: string
  assigned_to?: string
}): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>('/events', { method: 'POST', body: data })
}

export async function updateEvent(eventId: string, data: Partial<CalendarEvent>): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>(`/events/${encodeURIComponent(eventId)}`, { method: 'PUT', body: data })
}

export async function deleteEvent(eventId: string): Promise<{ status: string; event_id: string }> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
}

// ---------- Todos ----------

export async function fetchTodos(assignedTo: string | null = null): Promise<TodoItem[]> {
  const path = assignedTo ? `/todos?assigned_to=${encodeURIComponent(assignedTo)}` : '/todos'
  return apiFetch<TodoItem[]>(path)
}

export async function createTodo(data: {
  title: string
  due?: string
  recurrence?: 'daily' | 'weekly' | 'monthly'
  assigned_to?: string
}): Promise<TodoItem> {
  return apiFetch<TodoItem>('/todos', { method: 'POST', body: data })
}

export async function completeTodo(todoId: string): Promise<{ status: string; todo_id: string }> {
  return apiFetch(`/todos/${encodeURIComponent(todoId)}/complete`, { method: 'PATCH' })
}

export async function deleteTodo(todoId: string): Promise<{ status: string; todo_id: string }> {
  return apiFetch(`/todos/${encodeURIComponent(todoId)}`, { method: 'DELETE' })
}

// ---------- Family members ----------

export async function fetchFamilyMembers(): Promise<string[]> {
  return apiFetch<string[]>('/family-members')
}

export async function fetchFamilyProfiles(): Promise<FamilyMemberProfile[]> {
  return apiFetch<FamilyMemberProfile[]>('/family-members/profiles')
}

export async function createFamilyMember(data: {
  name: string
  age?: number
  notes?: string[]
}): Promise<FamilyMemberProfile> {
  return apiFetch<FamilyMemberProfile>('/family-members/profiles', { method: 'POST', body: data })
}

export async function updateFamilyMember(id: string, data: Partial<FamilyMemberProfile>): Promise<FamilyMemberProfile> {
  return apiFetch<FamilyMemberProfile>(`/family-members/profiles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteFamilyMember(id: string): Promise<{ status: string; id: string }> {
  return apiFetch(`/family-members/profiles/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ---------- iCal Feeds ----------

export async function fetchICalUrls(): Promise<ICalFeed[]> {
  return apiFetch<ICalFeed[]>('/settings/ical-urls')
}

export async function addICalUrl(url: string, isBirthday = false): Promise<ICalFeed & { status: string }> {
  return apiFetch('/settings/ical-urls', { method: 'POST', body: { url, is_birthday: isBirthday } })
}

export async function patchICalFeed(index: number, patch: { is_birthday?: boolean }): Promise<ICalFeed & { status: string }> {
  return apiFetch(`/settings/ical-urls/${index}`, { method: 'PATCH', body: patch })
}

export async function deleteICalUrl(index: number): Promise<{ status: string; url: string }> {
  return apiFetch(`/settings/ical-urls/${index}`, { method: 'DELETE' })
}

// ---------- CalDAV ----------

export async function fetchCalDAVAccounts(): Promise<CalDAVAccount[]> {
  return apiFetch<CalDAVAccount[]>('/settings/caldav-accounts')
}

export async function addCalDAVAccount(account: {
  url: string
  username: string
  password: string
}): Promise<{ status: string; index: number; url: string }> {
  return apiFetch('/settings/caldav-accounts', { method: 'POST', body: account })
}

export async function deleteCalDAVAccount(index: number): Promise<{ status: string; url: string }> {
  return apiFetch(`/settings/caldav-accounts/${index}`, { method: 'DELETE' })
}

// ---------- Status ----------

export async function fetchSyncStatus(): Promise<SyncStatus> {
  return apiFetch<SyncStatus>('/status')
}

// ---------- Birthdays ----------

export async function fetchBirthdays(daysAhead = 366, limit = 5): Promise<Birthday[]> {
  return apiFetch<Birthday[]>(`/birthdays?days_ahead=${daysAhead}&limit=${limit}`)
}

// ---------- Shopping ----------

export async function fetchShoppingItems(): Promise<ShoppingItem[]> {
  return apiFetch<ShoppingItem[]>('/shopping')
}

export async function addShoppingItem(
  name: string,
  category = 'Sonstiges',
  quantity: string | null = null,
): Promise<ShoppingItem> {
  return apiFetch<ShoppingItem>('/shopping', { method: 'POST', body: { name, category, quantity } })
}

export async function checkShoppingItem(itemId: string): Promise<ShoppingItem> {
  return apiFetch<ShoppingItem>(`/shopping/${encodeURIComponent(itemId)}/check`, { method: 'PATCH' })
}

export async function deleteShoppingItem(itemId: string): Promise<{ status: string; id: string }> {
  return apiFetch(`/shopping/${encodeURIComponent(itemId)}`, { method: 'DELETE' })
}

export async function clearCheckedShoppingItems(): Promise<{ status: string; cleared: number }> {
  return apiFetch('/shopping/clear-checked', { method: 'POST' })
}
