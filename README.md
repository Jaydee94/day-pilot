# ✈️ Day Pilot

<p align="center">
  <img src="frontend/public/logo.svg" alt="DayPilot Logo" width="300" />
</p>

> **Your calm, intelligent daily co-pilot for family life.**

DayPilot is a self-hosted, AI-powered family planning system that runs on your home server. Every morning it merges your Google and Apple calendars, fetches the weather, surfaces birthdays and open to-dos, and asks an AI to write a friendly morning briefing — delivered as a push notification to every device in the family and displayed on a beautiful React dashboard.

---

## ✨ Features

| Feature | Details |
|---|---|
| 📅 **Calendar sync** | Google Calendar + Apple iCloud Calendar (CalDAV) |
| ✅ **To-do sync** | Google Tasks |
| 🌤 **Weather intelligence** | WeatherAPI — influences AI advice, not just displayed |
| 🎂 **Birthdays** | Extracted from Google Contacts |
| 🤖 **AI briefing** | OpenAI GPT — narrative morning summary + top-3 priorities |
| 🔔 **Push notifications** | ntfy.sh (self-hosted or cloud) — all subscribed devices |
| ⚡ **Quick capture** | Floating + button — add events or tasks in 2 taps |
| 🗣 **Voice control** | Siri Shortcuts / Google Assistant webhook to add events |
| 📊 **Dashboard** | React SPA — mobile-first, dark mode, responsive |
| ⏰ **Scheduler** | Cron job at your chosen time every morning |
| 🐳 **Docker Compose** | One-command deploy on any home server |
| ☸️ **Helm / Kubernetes** | Production-grade deploy via Helm chart |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Docker Compose / Kubernetes (home server or cloud)              │
│                                                                  │
│  ┌──────────────────────────┐   ┌────────────────────────────┐  │
│  │   Backend  (FastAPI)     │   │  Frontend (React + Nginx)  │  │
│  │  :8000                   │◄──│  :3000                     │  │
│  │                          │   └────────────────────────────┘  │
│  │  services/               │                                    │
│  │    calendar_sync.py      │──► Google Calendar API            │
│  │    calendar_sync.py      │──► Apple iCloud (CalDAV)          │
│  │    weather.py            │──► WeatherAPI                     │
│  │    ai_summary.py         │──► OpenAI API                     │
│  │    notifications.py      │──► ntfy.sh  ──► 📱 phones        │
│  │    scheduler.py          │   (daily cron)                    │
│  │                          │                                    │
│  │  api/                    │                                    │
│  │    routes.py   (REST)    │◄── Dashboard / external clients   │
│  │    voice.py    (webhook) │◄── Siri / Google Assistant        │
│  └──────────────────────────┘                                    │
│            │                                                     │
│  ┌─────────┴──────────┐   ┌─────────────────────────────────┐   │
│  │  PostgreSQL :5432  │   │  Redis :6379                    │   │
│  │  (primary store)   │   │  (job queue & cache)            │   │
│  └────────────────────┘   └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Prerequisites

- Docker ≥ 24 + Docker Compose v2
- API keys / credentials (see [Configuration](#configuration))

### 2. Clone & configure

```bash
git clone https://github.com/Jaydee94/day-pilot.git
cd day-pilot
cp .env.example .env
# Edit .env with your credentials
```

### 3. Start

```bash
docker compose up -d --build
```

- Dashboard → http://localhost:3000
- API docs  → http://localhost:8000/docs

### Deploy on Kubernetes

```bash
helm install day-pilot ./helm/day-pilot \
  --namespace day-pilot \
  --create-namespace \
  --set backend.image.repository=ghcr.io/your-username/day-pilot-backend \
  --set frontend.image.repository=ghcr.io/your-username/day-pilot-frontend \
  --set secrets.openaiApiKey=sk-proj-... \
  --set secrets.weatherapiApiKey=your-weather-key \
  --set postgresql.auth.password="$(openssl rand -hex 16)" \
  --set secrets.voiceWebhookSecret="$(openssl rand -hex 32)"
```

See the [Kubernetes / Helm deployment guide](docs/kubernetes.md) for full instructions.

---

## Configuration

All settings live in `.env` (copy from `.env.example`).

### Required for full functionality

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key |
| `WEATHERAPI_API_KEY` | Free key from weatherapi.com |
| `GOOGLE_CREDENTIALS_JSON` | Path to your Google OAuth2 `credentials.json` |
| `NTFY_TOPIC` | ntfy topic name (push target) |

### Google Calendar OAuth2 setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → enable **Calendar API**, **Tasks API**, **People API**
3. Create OAuth2 credentials → Download `credentials.json`
4. Copy `credentials.json` to `./data/credentials.json`
5. On first run the backend will log an authorisation URL — open it in a
   browser to grant access; the token is saved to `./data/google_token.json`

### Apple Calendar (iCloud)

1. Sign in to [appleid.apple.com](https://appleid.apple.com/) and generate an
   **App-Specific Password**
2. Set `CALDAV_URL=https://caldav.icloud.com`, `CALDAV_USERNAME=your@icloud.com`,
   and `CALDAV_PASSWORD=<app-specific-password>`

### ntfy push notifications

```bash
# Subscribe on your phone by installing the ntfy app and subscribing to your topic
NTFY_TOPIC=my-day-pilot-topic
```

For a private topic add a token:

```bash
NTFY_TOKEN=tk_...
```

---

## Voice Control

Day Pilot exposes a webhook at `POST /api/voice/command`.

### Siri Shortcuts

1. Open Shortcuts → New Shortcut → **Get Contents of URL**
2. URL: `http://<your-server>:8000/api/voice/command`
3. Method: `POST`, Headers: `Content-Type: application/json`
4. Body (JSON):
   ```json
   {
     "secret": "your-voice-webhook-secret",
     "command": "add_event",
     "title": "Meeting with Alice",
     "start": "2024-06-01T14:00:00+02:00",
     "end":   "2024-06-01T15:00:00+02:00",
     "location": "Office"
   }
   ```
5. Use *Ask Each Time* for dynamic fields so Siri can fill them in.

### Google Assistant (via IFTTT)

1. Create an IFTTT Applet triggered by Google Assistant
2. Use the **Webhooks** service to `POST` to the same URL with the JSON above

---

## API Reference

Full interactive docs at `http://localhost:8000/docs` (Swagger UI).

| Method | Path | Description |
|---|---|---|
| GET | `/api/summary` | Full daily summary (events, todos, weather, AI) |
| GET | `/api/summary?date=YYYY-MM-DD` | Summary for a specific date |
| POST | `/api/summary/push` | Send push notification now |
| POST | `/api/pipeline/run` | Run full daily pipeline manually |
| GET | `/api/events` | Today's calendar events |
| POST | `/api/events` | Create a calendar event |
| GET | `/api/todos` | Open to-dos |
| POST | `/api/todos` | Create a task |
| GET | `/api/weather` | Current weather |
| GET | `/api/birthdays` | Today's birthdays |
| GET | `/api/status` | Integration health status |
| POST | `/api/voice/command` | Add event via voice webhook |

---

## Documentation

📚 **[Full documentation in /docs](docs/README.md)** — written for non-technical family members.

| Guide | Description |
|---|---|
| [Getting Started](docs/getting-started.md) | Step-by-step setup guide |
| [Kubernetes / Helm](docs/kubernetes.md) | Deploy on Kubernetes with Helm |
| [Configuration Reference](docs/configuration.md) | Every setting explained with examples |
| [Daily Usage](docs/daily-usage.md) | How to use the dashboard every day |
| [Features Explained](docs/features.md) | What each feature does |
| [Voice Control](docs/voice-control.md) | Siri Shortcuts & Google Assistant setup |
| [API Reference](docs/api-reference.md) | Complete REST API documentation |
| [Troubleshooting](docs/troubleshooting.md) | Fixes for common problems |

---

## Development

### Backend

```bash
cd backend
poetry install
cp ../.env.example ../.env   # fill in values
poetry run uvicorn app.main:app --reload
```

Run tests:

```bash
poetry run pytest
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests (vitest)
```

---

## Project Structure

```
day-pilot/
├── docker-compose.yml
├── .env.example
├── data/                          # Google tokens & credentials (git-ignored)
├── helm/
│   └── day-pilot/                 # Helm chart for Kubernetes deployment
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/             # Kubernetes resource templates
├── docs/                          # User-friendly documentation
│   ├── README.md                  # Documentation index
│   ├── getting-started.md         # Setup guide
│   ├── daily-usage.md             # How to use the dashboard
│   ├── features.md                # Feature explanations
│   └── troubleshooting.md         # Common issues & fixes
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── poetry.lock
│   ├── pytest.ini
│   ├── app/
│   │   ├── main.py                # FastAPI application
│   │   ├── config.py              # Settings (pydantic-settings)
│   │   ├── api/
│   │   │   ├── routes.py          # REST endpoints
│   │   │   └── voice.py           # Voice-control webhook
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic models
│   │   └── services/
│   │       ├── calendar_sync.py   # Google + Apple calendar
│   │       ├── weather.py         # WeatherAPI
│   │       ├── ai_summary.py      # OpenAI summary generation
│   │       ├── notifications.py   # ntfy push notifications
│   │       └── scheduler.py       # APScheduler daily pipeline
│   └── tests/
│       ├── test_calendar.py
│       ├── test_weather.py
│       ├── test_summary.py
│       ├── test_notifications.py
│       └── test_routes.py
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── components/
        │   ├── DailySummary.jsx
        │   ├── AISummary.jsx
        │   ├── CalendarEvents.jsx
        │   ├── Weather.jsx
        │   ├── TodoList.jsx
        │   ├── Birthdays.jsx
        │   └── QuickAddButton.jsx
        └── test/
            ├── setup.js
            └── components.test.jsx
```

---

## Modular Extension Points

- **New calendar source**: add a service in `backend/app/services/`, call it
  from `scheduler.py::build_daily_summary`.
- **Different LLM**: swap `ai_summary.py` – the function signature stays the same.
- **Alternative push channel**: replace or extend `notifications.py`.
- **Extra dashboard widgets**: add a component in `frontend/src/components/`
  and import it in `DailySummary.jsx`.

---

## License

MIT
