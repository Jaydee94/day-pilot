/**
 * Frontend TypeScript types mirroring `backend/app/models/schemas.py`.
 * Keep these in sync when the backend Pydantic schemas change.
 */

export type EventSource = 'ical' | 'apple' | 'local'
export type TodoSource = 'google' | 'apple' | 'local'
export type Recurrence = 'daily' | 'weekly' | 'monthly'

export interface CalendarEvent {
  id: string
  title: string
  start: string // ISO datetime
  end: string // ISO datetime
  location?: string | null
  description?: string | null
  source: EventSource | string
  calendar_name?: string | null
  assigned_to?: string | null
}

export interface TodoItem {
  id: string
  title: string
  due?: string | null
  completed: boolean
  priority?: number | null
  source: TodoSource | string
  recurrence?: Recurrence | null
  assigned_to?: string | null
}

export interface Birthday {
  name: string
  date: string
  age?: number | null
}

export interface HourlyForecastPoint {
  time: string
  temperature: number
  icon: string
  description: string
  chance_of_rain: number
}

export interface DailyForecastPoint {
  date: string
  min_temperature: number
  max_temperature: number
  icon: string
  description: string
  chance_of_rain: number
}

export interface WeatherInfo {
  city: string
  temperature: number
  feels_like: number
  description: string
  icon: string
  humidity: number
  wind_speed: number
  units: 'metric' | 'imperial' | string
  hourly_forecast: HourlyForecastPoint[]
  daily_forecast: DailyForecastPoint[]
}

export interface TimeBlock {
  start: string // "09:00"
  end: string // "11:00"
  task: string
  type?: 'focus' | 'buffer' | 'break' | string
}

export interface DailySummary {
  date: string
  events: CalendarEvent[]
  todos: TodoItem[]
  birthdays: Birthday[]
  weather?: WeatherInfo | null
  ai_summary?: string | null
  top_priorities: string[]
  time_blocks: TimeBlock[]
}

export interface ShoppingItem {
  id: string
  name: string
  category: string
  quantity?: string | null
  checked: boolean
}

export interface FamilyMemberProfile {
  id: string
  name: string
  age?: number | null
  notes: string[]
}

export interface CalDAVAccount {
  index: number
  url: string
  username: string
  password_set: boolean
}

export interface ICalFeed {
  index: number
  url: string
  is_birthday?: boolean
}

export interface ScheduledJob {
  id: string
  name: string
  description: string
  trigger: string
  next_run?: string | null
}

export interface SyncStatus {
  ical_calendar: boolean
  apple_calendar: boolean
  weather: boolean
  last_sync?: string | null
  errors: string[]
}

export interface IntegrationTestResult {
  integration: string
  ok: boolean
  message: string
}

export interface SetupStatus {
  setup_complete: boolean
  needs_setup: boolean
}

export interface UserSettings {
  APP_NAME?: string | null
  APP_TIMEZONE?: string | null
  APP_LANGUAGE?: string | null
  APP_THEME?: 'light' | 'dark' | 'system' | null
  DAILY_SUMMARY_TIME?: string | null
  AI_PROVIDER?: string | null
  AI_MODEL?: string | null
  OPENAI_API_KEY?: string | null
  OPENAI_MODEL?: string | null
  GITHUB_TOKEN?: string | null
  GROQ_API_KEY?: string | null
  GOOGLE_AI_API_KEY?: string | null
  WEATHERAPI_API_KEY?: string | null
  WEATHER_CITY?: string | null
  WEATHER_UNITS?: string | null
  ICAL_URLS?: string | null
  ICAL_FEEDS?: string | null
  BIRTHDAY_CALENDAR_NAMES?: string | null
  CALDAV_URL?: string | null
  CALDAV_USERNAME?: string | null
  CALDAV_PASSWORD?: string | null
  CALDAV_CONFIGS?: string | null
  NTFY_SERVER?: string | null
  NTFY_TOPIC?: string | null
  NTFY_TOKEN?: string | null
  VOICE_WEBHOOK_SECRET?: string | null
  AI_PROMPT_TEMPLATE?: string | null
  SETUP_COMPLETE?: boolean | null
  FAMILY_MEMBERS?: string | null
}
