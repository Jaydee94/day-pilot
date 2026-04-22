# 🔌 API Reference

<p align="center">
  <img src="../frontend/public/logo.svg" alt="DayPilot Logo" width="300" />
</p>

Complete reference for the DayPilot REST API. All endpoints are served by the FastAPI backend on port `8000`.

---

## Interactive documentation

The full API is also available as an interactive Swagger UI:

```
http://localhost:8000/docs
```

The Swagger UI lets you browse every endpoint, view request/response schemas, and execute calls directly from your browser — no tools required.

---

## Base URL

```
http://localhost:8000/api
```

Replace `localhost` with your server's IP address if accessing from another device.

---

## Authentication

The main API endpoints do not require authentication by default (DayPilot is designed for home network use). The **voice control webhook** (`POST /api/voice/command`) requires a `secret` field in the request body.

---

## Data formats

- All request and response bodies use **JSON**
- Dates use **ISO 8601** format: `YYYY-MM-DDTHH:MM:SS+HH:MM`
- All responses use `Content-Type: application/json`

---

## Endpoints

### GET `/api/summary`

Returns the full daily summary for today or a specific date. This is the primary endpoint used by the dashboard.

**Query Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `date` | string | No | ISO date `YYYY-MM-DD` — defaults to today |

**Example request**

```bash
# Today's summary
curl http://localhost:8000/api/summary

# Summary for a specific date
curl "http://localhost:8000/api/summary?date=2024-06-15"
```

**Response schema**

```json
{
  "date": "2024-06-01T07:00:00+02:00",
  "events": [
    {
      "id": "abc123",
      "title": "Team meeting",
      "start": "2024-06-01T10:00:00+02:00",
      "end": "2024-06-01T11:00:00+02:00",
      "location": "Conference Room A",
      "description": "Weekly sync",
      "source": "google"
    }
  ],
  "todos": [
    {
      "id": "todo456",
      "title": "Finish quarterly report",
      "due": "2024-06-02T00:00:00+02:00",
      "completed": false,
      "priority": 1,
      "source": "google"
    }
  ],
  "birthdays": [
    {
      "name": "Alice Smith",
      "date": "2024-06-01T00:00:00+02:00",
      "age": 35
    }
  ],
  "weather": {
    "city": "London",
    "temperature": 18.5,
    "feels_like": 17.2,
    "description": "Partly cloudy",
    "icon": "02d",
    "humidity": 65,
    "wind_speed": 3.5,
    "units": "metric"
  },
  "ai_summary": "Good morning! Today looks busy...",
  "top_priorities": [
    "Finish quarterly report",
    "Prepare for the 10 AM team meeting",
    "Buy birthday gift for Alice"
  ]
}
```

**Priority values** in `todos[].priority`: `1` = high, `5` = medium, `9` = low (Google Tasks convention).

---

### POST `/api/summary/push`

Builds the current day's summary and immediately sends a push notification to the configured ntfy topic.

**Request body:** None

**Example request**

```bash
curl -X POST http://localhost:8000/api/summary/push
```

**Response**

```json
{
  "sent": true
}
```

`sent: false` indicates the notification could not be delivered (check backend logs for details).

---

### POST `/api/pipeline/run`

Triggers the complete daily pipeline: fetch all data → generate AI summary → send push notification.

This is equivalent to what DayPilot runs automatically at `DAILY_SUMMARY_TIME` every day.

**Request body:** None

**Example request**

```bash
curl -X POST http://localhost:8000/api/pipeline/run
```

**Response**

```json
{
  "status": "pipeline triggered"
}
```

---

### GET `/api/status`

Returns the health status of each integration. Useful for diagnosing connection issues.

**Example request**

```bash
curl http://localhost:8000/api/status
```

**Response schema**

```json
{
  "google_calendar": true,
  "apple_calendar": false,
  "weather": true,
  "last_sync": "2024-06-01T08:15:00+02:00",
  "errors": [
    "Apple Calendar: CALDAV_URL not configured"
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `google_calendar` | boolean | `true` if Google Calendar API is reachable and authenticated |
| `apple_calendar` | boolean | `true` if CalDAV/iCloud is reachable and authenticated |
| `weather` | boolean | `true` if WeatherAPI is reachable and returning data |
| `last_sync` | datetime | Timestamp of the last status check |
| `errors` | array | Human-readable error messages for each failing integration |

---

### GET `/api/events`

Returns all calendar events for today (or a specific date), merged from Google and Apple calendars and sorted by start time.

**Query Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `date` | string | No | ISO date `YYYY-MM-DD` — defaults to today |

**Example request**

```bash
# Today's events
curl http://localhost:8000/api/events

# Events for a specific date
curl "http://localhost:8000/api/events?date=2024-06-15"
```

**Response schema** — array of `CalendarEvent` objects:

```json
[
  {
    "id": "abc123",
    "title": "Team meeting",
    "start": "2024-06-01T10:00:00+02:00",
    "end": "2024-06-01T11:00:00+02:00",
    "location": "Conference Room A",
    "description": "Weekly sync",
    "source": "google"
  },
  {
    "id": "def456",
    "title": "Dentist",
    "start": "2024-06-01T15:00:00+02:00",
    "end": "2024-06-01T15:30:00+02:00",
    "location": null,
    "description": null,
    "source": "apple"
  }
]
```

---

### POST `/api/events`

Creates a new calendar event. DayPilot tries Google Calendar first; if Google is not connected, it falls back to Apple Calendar.

**Request body**

```json
{
  "title": "Dentist appointment",
  "start": "2024-06-01T15:00:00+02:00",
  "end": "2024-06-01T15:30:00+02:00",
  "location": "City Dental Clinic",
  "description": "Annual check-up"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | **Yes** | Event title |
| `start` | datetime | **Yes** | Start time (ISO 8601 with timezone) |
| `end` | datetime | No | End time — defaults to 1 hour after `start` |
| `location` | string | No | Location text |
| `description` | string | No | Event description / notes |

**Example request**

```bash
curl -X POST http://localhost:8000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Dentist appointment",
    "start": "2024-06-01T15:00:00+02:00",
    "end": "2024-06-01T15:30:00+02:00",
    "location": "City Dental Clinic"
  }'
```

**Response** — the created `CalendarEvent` object (same schema as `GET /api/events`).

**Errors**

| Status | Meaning |
|---|---|
| `503` | Could not add event to any connected calendar |

---

### GET `/api/todos`

Returns all open (incomplete) tasks from Google Tasks.

**Example request**

```bash
curl http://localhost:8000/api/todos
```

**Response schema** — array of `TodoItem` objects:

```json
[
  {
    "id": "todo123",
    "title": "Buy birthday present",
    "due": "2024-06-05T00:00:00+02:00",
    "completed": false,
    "priority": 1,
    "source": "google"
  }
]
```

---

### POST `/api/todos`

Creates a new task in Google Tasks.

**Request body**

```json
{
  "title": "Buy birthday present for Mum",
  "due": "2024-06-05T00:00:00+02:00"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | **Yes** | Task title |
| `due` | datetime | No | Due date (ISO 8601) |

**Example request**

```bash
curl -X POST http://localhost:8000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy birthday present for Mum", "due": "2024-06-05T00:00:00+02:00"}'
```

**Response** — the created `TodoItem` object.

**Errors**

| Status | Meaning |
|---|---|
| `503` | Could not add task to Google Tasks |

---

### GET `/api/weather`

Returns current weather conditions for the configured city.

**Example request**

```bash
curl http://localhost:8000/api/weather
```

**Response schema**

```json
{
  "city": "London",
  "temperature": 18.5,
  "feels_like": 17.2,
  "description": "Partly cloudy",
  "icon": "https://cdn.weatherapi.com/weather/64x64/day/116.png",
  "humidity": 65,
  "wind_speed": 3.5,
  "units": "metric"
}
```

| Field | Type | Description |
|---|---|---|
| `city` | string | City name |
| `temperature` | float | Current temperature |
| `feels_like` | float | Perceived temperature |
| `description` | string | Human-readable weather description |
| `icon` | string | Weather icon URL provided by WeatherAPI |
| `humidity` | integer | Relative humidity (%) |
| `wind_speed` | float | Wind speed (m/s if metric, mph if imperial) |
| `units` | string | `metric` or `imperial` |

**Errors**

| Status | Meaning |
|---|---|
| `503` | Weather data unavailable (check API key and city name) |

---

### GET `/api/birthdays`

Returns all birthdays from Google Contacts that fall on today's date.

**Example request**

```bash
curl http://localhost:8000/api/birthdays
```

**Response schema** — array of `Birthday` objects:

```json
[
  {
    "name": "Alice Smith",
    "date": "2024-06-01T00:00:00+02:00",
    "age": 35
  }
]
```

`age` is `null` if no birth year is stored in the contact.

---

### POST `/api/voice/command`

Adds a calendar event via a voice-control webhook. Used by Siri Shortcuts and Google Assistant integrations.

All requests must include the `VOICE_WEBHOOK_SECRET` configured in `.env`.

**Request body**

```json
{
  "secret": "your-configured-voice-webhook-secret",
  "command": "add_event",
  "title": "Meeting with Alice",
  "start": "2024-06-01T14:00:00+02:00",
  "end": "2024-06-01T15:00:00+02:00",
  "location": "Office"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `secret` | string | **Yes** | Must match `VOICE_WEBHOOK_SECRET` in `.env` |
| `command` | string | **Yes** | The action to perform — currently only `add_event` is supported |
| `title` | string | **Yes** | Event title |
| `start` | datetime | **Yes for `add_event`** | Start time (ISO 8601) |
| `end` | datetime | No | End time — defaults to 1 hour after `start` |
| `location` | string | No | Event location |

**Example request**

```bash
curl -X POST http://localhost:8000/api/voice/command \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your-webhook-secret",
    "command": "add_event",
    "title": "Meeting with Alice",
    "start": "2024-06-01T14:00:00+02:00",
    "end": "2024-06-01T15:00:00+02:00"
  }'
```

**Response**

```json
{
  "status": "created",
  "source": "google",
  "event": { ... }
}
```

**Errors**

| Status | Meaning |
|---|---|
| `401` | Invalid or missing `secret` |
| `400` | Missing required field or unknown command |
| `503` | Could not add event to any connected calendar |

---

## Error responses

All error responses follow this format:

```json
{
  "detail": "Human-readable error message"
}
```

Common HTTP status codes:

| Status | Meaning |
|---|---|
| `200` | Success |
| `400` | Bad request — invalid input or missing required field |
| `401` | Unauthorised — invalid webhook secret |
| `503` | Service unavailable — external API (Google, Apple, WeatherAPI) not reachable |

---

## Next steps

- 🗣 Set up voice control → [Voice Control Guide](voice-control.md)
- ⚙️ Configure API keys and settings → [Configuration Reference](configuration.md)
- ❓ Something not working? → [Troubleshooting Guide](troubleshooting.md)
