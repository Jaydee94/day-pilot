# ✨ Features Explained

A friendly, plain-English explanation of every DayPilot feature and how it helps your family.

---

## 🤖 AI Daily Briefing

Every morning DayPilot brings all your information together — calendars, tasks, weather, and birthdays — and asks an AI to write a short, friendly summary of your day.

**Why it's useful:** Instead of opening five different apps and piecing together your day yourself, DayPilot does it for you in seconds. You get one clear paragraph that tells you everything you need to know.

**What goes into it:**
- All your calendar events for the day
- Your open to-do items
- Today's weather
- Any birthdays from your contacts
- The AI's assessment of how busy or stressful the day looks

**Example briefing:**
> *"Good morning! Today is a full day — you have Sarah's school drop-off at 8:30, a video call at 10:00, and the dentist at 3:00 PM in town. The weather will be cloudy with a chance of rain in the afternoon, so pack an umbrella. Your most important task today is finishing the budget report."*

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

---

## 📅 Smart Day Planning

DayPilot doesn't just list your events — it thinks about your day intelligently.

**What it does:**
- **Detects tight schedules** — if two events are back-to-back with no travel time, the AI flags this in the briefing
- **Considers travel** — if an event has a location, the AI may suggest when you should leave
- **Highlights busy days** — if you have a lot on, the briefing will acknowledge this and help you focus on what matters most
- **Extracts top 3 priorities** — from all your tasks and events, the AI picks the three most important things to focus on

**The priorities are shown** just below the briefing text on the Today screen.

---

## 🔔 Push Notifications

DayPilot sends you a push notification every morning via the free **ntfy** service.

**Why ntfy?**
- It's free and open-source
- You can self-host it on your own server for complete privacy
- Or use the free cloud service at ntfy.sh
- Works on iPhone and Android
- Multiple family members can all subscribe to the same topic

**What the notification contains:**
- The full AI morning briefing
- Your top 3 priorities
- Current weather conditions
- Number of events today
- Any birthdays

**When it arrives:** At the time you set in `.env` with `DAILY_SUMMARY_TIME` (default is `07:00`).

**Privacy:** The notification goes through the ntfy service. If you want complete privacy, you can self-host ntfy on your own server — see [ntfy self-hosting docs](https://docs.ntfy.sh/install/).

---

## 🌤 Weather Intelligence

DayPilot doesn't just *show* the weather — it uses it to make smarter suggestions.

**How it works:**
- Every time DayPilot builds a briefing, it fetches current weather for your city
- This weather data is given to the AI alongside your calendar and tasks
- The AI uses it to give contextually relevant advice

**Examples of weather-aware advice:**
- "It will be 35°C today — you might want to move your afternoon walk to the morning"
- "Rain is expected this afternoon — your outdoor event at 3 PM might be affected"
- "Great running weather this morning — perfect for your planned jog before the 10 AM meeting"

**The weather data comes from** [OpenWeatherMap](https://openweathermap.org/) — a free service with a generous free tier.

---

## 📆 Calendar Sync

DayPilot connects to your existing calendars — you don't need to manage a separate calendar.

### Google Calendar
- Reads all your Google Calendars (work, personal, family — all of them)
- Reads your Google Tasks (to-do list)
- Can also read birthdays from your Google Contacts
- Can add events directly from the DayPilot **+ button**

### Apple Calendar (iCloud)
- Reads your Apple Calendar via a secure protocol called CalDAV
- Works with iCloud personal, family, and shared calendars
- Can also add events from the DayPilot **+ button**

**Events from both sources are merged** and shown together in the app, sorted by time.

---

## 👨‍👩‍👧 Family Awareness

DayPilot is designed for families, not just individuals.

**How it helps:**
- The AI understands that your calendar may contain events for different family members
- School events, kids' activities, and family appointments are all considered
- The AI can detect when a day will be particularly hectic (e.g. school run + work meeting + dentist appointment all on the same day)
- Birthdays from your contacts ensure you never forget to wish someone well

**Shared notifications:** Multiple family members can subscribe to the same ntfy topic on their phones, so everyone gets the same morning briefing.

---

## ⚡ Quick Capture

Never lose a thought. The floating **+** button lets you add events and tasks in just a few taps.

**Adding an event:**
1. Tap **+**
2. Type the event title
3. Set the start time
4. Optionally set the end time and location
5. Tap **Add Event** — it appears in your Google Calendar immediately

**Adding a task:**
1. Tap **+**
2. Switch to the **Task** tab
3. Type what you need to do
4. Optionally set a due date
5. Tap **Add Task** — it appears in your Google Tasks immediately

**Design principle:** Maximum 2 taps to start adding. Minimum friction. Everything is optional except the title.

---

## 🗣 Voice Control

You can add events hands-free using Siri (iPhone) or Google Assistant (Android).

DayPilot exposes a secure webhook at `POST /api/voice/command`. You set this up once and then just speak to your phone.

**Full setup instructions:** See [Voice Control in the README](../README.md#voice-control).

---

## 🏠 Self-Hosted & Private

DayPilot runs entirely on your home server. Your calendar data and family information never leave your home network (except for the external API calls to OpenAI, OpenWeatherMap, and ntfy, which you can replace or self-host).

**Data you control:**
- All calendar events are fetched from Google/Apple APIs and processed locally
- The AI sends anonymised data to OpenAI — no names from contacts are included unless they're in the calendar event title
- You can replace OpenAI with a local LLM if you want complete privacy

---

## Next steps

- 🚀 Not set up yet? → [Getting Started Guide](getting-started.md)
- 📱 Learn the dashboard → [Daily Usage Guide](daily-usage.md)
- ❓ Something's not working? → [Troubleshooting Guide](troubleshooting.md)
