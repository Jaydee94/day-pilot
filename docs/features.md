# ✨ Features Explained

<p align="center">
  <img src="../frontend/public/logo.svg" alt="DayPilot Logo" width="300" />
</p>

A detailed explanation of every DayPilot feature and how it helps your family.

---

## 🤖 AI Daily Briefing

Every morning DayPilot gathers all your information — calendars, tasks, weather, and birthdays — and asks an AI to write a short, friendly summary of your day.

**Why it's useful:** Instead of opening five different apps and piecing together your day yourself, DayPilot does it for you in seconds. You get one clear, conversational paragraph that tells you everything you need to know.

**What goes into the briefing:**
- All calendar events for the day (from Google and Apple)
- Open to-do items from Google Tasks
- Today's weather conditions
- Any birthdays from your Google Contacts
- The AI's assessment of how busy or stressful the day looks

**Example briefing:**
> *"Good morning! Today is a full day — you have Sarah's school drop-off at 8:30, a video call at 10:00, and the dentist at 3:00 PM in town. The weather will be cloudy with a chance of rain in the afternoon, so pack an umbrella. Your most important task today is finishing the budget report."*

**Below the briefing text** you'll also see your **Top 3 Priorities** — automatically extracted by the AI from your events and tasks.

**Supported AI providers:**

| Provider | What you need | Set in `.env` |
|---|---|---|
| **OpenAI** (default) | OpenAI API key | `AI_PROVIDER=openai` + `OPENAI_API_KEY=…` |
| **GitHub Copilot** | GitHub account + Copilot subscription | `AI_PROVIDER=github` + `GITHUB_TOKEN=…` |

You can switch provider at any time by updating `.env` and restarting DayPilot.

**Choosing a model:**

Set `AI_MODEL` in `.env` to pick the exact model you want (e.g. `AI_MODEL=gpt-4o`).
When `AI_MODEL` is empty, DayPilot uses a sensible default for the active provider (`gpt-4o-mini`).

To see which models are available for the GitHub provider, visit `http://localhost:8000/api/ai/models` after DayPilot is running.
To check your current provider and model, visit `http://localhost:8000/api/ai/config`.

> 💡 The AI briefing is **optional**. If no AI credential is configured, DayPilot still shows all your events, tasks, and weather — just without the AI-generated text.

---

## 📅 Calendar Sync

DayPilot connects to your existing calendars — you don't need to manage a separate one.

### Google Calendar

- Reads **all** your Google Calendars (work, personal, family, shared)
- Supports multiple calendars per account
- Merges events from all calendars into one chronological view
- Can add new events via the **+ button** or the [voice webhook](voice-control.md)

### Apple Calendar (iCloud)

- Reads your Apple Calendar via the **CalDAV** protocol
- Works with iCloud personal, family, and shared calendars
- Connects using an app-specific password (your main iCloud password is never used)
- Can also add events via the **+ button** or the voice webhook

**Events from both sources are merged** and displayed together, sorted by time. Each event shows which source it came from.

---

## ✅ To-Do Sync

DayPilot reads your open tasks from **Google Tasks**.

- Shows all incomplete tasks from your default Google Tasks list
- Displays due dates when available
- Supports priority levels (surfaced in the AI briefing)
- Tasks can be added directly from the dashboard's **+ button**
- Completed tasks are shown with a strikethrough at the bottom of the list

> 💡 Google Tasks is included with your Google account — no separate sign-up needed.

---

## 🌤 Weather Intelligence

DayPilot doesn't just *show* the weather — it uses it to make the AI briefing smarter.

**How it works:**
1. When building a daily summary, DayPilot fetches current conditions for your configured city from OpenWeatherMap
2. This data is passed to the AI alongside your calendar and tasks
3. The AI incorporates weather into its advice naturally

**Examples of weather-aware advice:**
- *"It will be 35°C today — you might want to move your afternoon walk to the morning"*
- *"Rain is expected this afternoon — your outdoor event at 3 PM may be affected"*
- *"Great running weather this morning — perfect timing before your 10 AM meeting"*

**What the weather card shows:**
- Current temperature and "feels like" temperature
- Weather description (e.g. "Partly cloudy")
- Humidity percentage
- Wind speed
- Weather icon

**Units:** Configure `WEATHER_UNITS=metric` for °C and m/s, or `WEATHER_UNITS=imperial` for °F and mph.

**Data source:** [OpenWeatherMap](https://openweathermap.org/) — free tier provides more than enough requests for daily use.

---

## 🎂 Birthday Reminders

DayPilot checks your Google Contacts for birthdays and surfaces them in the daily briefing and dashboard.

- Birthdays are shown prominently on the dashboard on the day they occur
- The AI briefing mentions birthdays so you never forget to reach out
- Age is calculated and displayed when a birth year is available in the contact

> 💡 To make sure birthdays appear, ensure the contacts you care about have a birthday set in your Google Contacts ([contacts.google.com](https://contacts.google.com/)).

---

## 🔔 Push Notifications

DayPilot sends a push notification every morning via the free **ntfy** service.

**Why ntfy?**
- Free and open-source
- Works on iPhone and Android
- Multiple family members can subscribe to the same topic
- Can be self-hosted on your own server for complete privacy
- No account required for public topics

**What the notification contains:**
- The full AI morning briefing text
- Your top 3 priorities for the day
- A weather summary
- Number of calendar events today
- Any birthdays

**Delivery time:** Controlled by `DAILY_SUMMARY_TIME` in your `.env` (default: `07:00` in your configured timezone).

**Setting up ntfy:**
1. Install the ntfy app ([iOS](https://apps.apple.com/app/ntfy/id1625396347) / [Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy))
2. Subscribe to your topic (the `NTFY_TOPIC` value from your `.env`)
3. All subscribed devices receive the briefing simultaneously

**Self-hosting ntfy for privacy:** Set `NTFY_SERVER` in your `.env` to point to your own ntfy instance instead of `https://ntfy.sh`. See the [ntfy self-hosting docs](https://docs.ntfy.sh/install/).

---

## ⚡ Quick Capture

The floating **+** button lets you add events and tasks without leaving the dashboard.

### Adding an event

1. Tap/click **+**
2. Ensure the **Event** tab is selected
3. Fill in:
   - **Title** — required
   - **Start date & time** — required
   - **End date & time** — optional (defaults to 1 hour after start)
   - **Location** — optional
4. Tap **Add Event**

The event is immediately added to Google Calendar (falls back to Apple Calendar if Google is not connected) and appears in the events list.

### Adding a task

1. Tap/click **+**
2. Switch to the **Task** tab
3. Fill in:
   - **Task title** — required
   - **Due date** — optional
4. Tap **Add Task**

The task is immediately added to your Google Tasks list.

**Design principle:** Maximum 2 taps to start adding. Only the title is required — everything else is optional.

---

## 🗣 Voice Control

Add events hands-free using Siri (iPhone) or Google Assistant (Android).

DayPilot exposes a secure webhook at `POST /api/voice/command`. You configure it once and then just speak to your phone.

- Siri Shortcuts can call the webhook with structured data
- Google Assistant can trigger it via IFTTT
- The webhook is protected by a secret key (`VOICE_WEBHOOK_SECRET` in `.env`)

**Full setup instructions:** See the [Voice Control Guide](voice-control.md).

---

## 📊 Dashboard

DayPilot's dashboard is a responsive React web app that works on any device.

**Key dashboard characteristics:**
- **Mobile-first design** — optimised for phones and tablets, but works perfectly on desktop
- **Dark mode** — easy on the eyes in the morning
- **Auto-refresh** — the dashboard automatically refreshes every 15 minutes
- **Manual refresh** — click the 🔄 button in the header to refresh immediately
- **Offline-friendly** — shows the last loaded data if the server is temporarily unreachable
- **Installable as PWA** — add to your phone's home screen for an app-like experience

**Dashboard sections:**
- AI Briefing + Top 3 Priorities
- Calendar Events (today, sorted by time)
- To-Do List
- Weather Card
- Birthdays

**Navigation tabs:**
- **Today** — main daily overview
- **Calendar** — event detail view
- **Tasks** — full to-do list
- **Settings** — configuration overview

---

## ⏰ Automated Daily Pipeline

DayPilot runs a fully automated daily pipeline using APScheduler.

**What happens at the scheduled time:**
1. All Google and Apple calendar events for the day are fetched
2. Google Tasks are fetched
3. Weather data is fetched from OpenWeatherMap
4. Birthdays are checked from Google Contacts
5. The AI generates a briefing and extracts top priorities
6. A push notification is sent to all ntfy subscribers

**Configuring the schedule:**
```
DAILY_SUMMARY_TIME=07:00
APP_TIMEZONE=Europe/Berlin
```

The pipeline can also be triggered manually at any time via the API:

```bash
# Trigger the full pipeline (build + push)
curl -X POST http://localhost:8000/api/pipeline/run

# Send the push notification only
curl -X POST http://localhost:8000/api/summary/push
```

---

## 🏠 Self-Hosted & Private

DayPilot runs entirely on your home server. Your family data stays in your home network.

**Data flow:**
- Calendar events are fetched directly from Google/Apple APIs to your server
- The AI receives your event titles, task names, and weather data (no contact names or private details beyond what is in your calendar)
- Push notifications go through ntfy (self-hostable for complete privacy)
- No telemetry, no analytics, no tracking

**Replacing external services for full privacy:**
- **AI:** Replace OpenAI with a local LLM (e.g. [Ollama](https://ollama.ai/)) by swapping `backend/app/services/ai_summary.py`
- **Push notifications:** Self-host [ntfy](https://docs.ntfy.sh/install/) and set `NTFY_SERVER` to your instance
- **Weather:** Replace the OpenWeatherMap service if desired

---

## Next steps

- 🚀 Not set up yet? → [Getting Started Guide](getting-started.md)
- ⚙️ Configure every setting → [Configuration Reference](configuration.md)
- 📱 Learn the dashboard → [Daily Usage Guide](daily-usage.md)
- 🗣 Set up voice control → [Voice Control Guide](voice-control.md)
- ❓ Something's not working? → [Troubleshooting Guide](troubleshooting.md)
