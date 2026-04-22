# 📱 Daily Usage Guide

<p align="center">
  <img src="../frontend/public/logo.svg" alt="DayPilot Logo" width="300" />
</p>

Everything you need to know to use DayPilot every day.

---

## Opening the dashboard

Open your web browser and go to:

```
http://localhost:3000
```

If you're accessing DayPilot from another device on your home network, replace `localhost` with your server's IP address:

```
http://192.168.1.100:3000
```

> 💡 **Tip:** You can find your server's IP address by running `hostname -I` (Linux/macOS) or `ipconfig` (Windows) on the server.

### Add DayPilot to your phone's home screen

DayPilot works as a Progressive Web App (PWA), so you can install it on your home screen for quick access:

- **iPhone / iPad:** Tap the Share button → **"Add to Home Screen"**
- **Android:** Tap the browser menu (⋮) → **"Add to Home Screen"** or **"Install app"**

---

## The Today Screen

When you open DayPilot, you land on the **Today** screen — your central view for the day.

### 🤖 AI Briefing

At the very top, you'll find the AI-generated morning briefing — a short, friendly paragraph that summarises your day. It might read:

> *"Good morning! It's going to be a busy Tuesday. You have school drop-off at 8:30, a team meeting at 11:00, and it looks like rain this afternoon — remember to pack an umbrella. Your top priority today is the quarterly report due tomorrow."*

If `OPENAI_API_KEY` is not configured, this section will be empty and the rest of the dashboard is still fully functional.

### 🎯 Top 3 Priorities

Just below the briefing you'll see the **Top 3 Priorities** — three items automatically chosen by the AI as the most important things to focus on today. These are derived from your calendar events and open tasks.

### 📅 Events

Your calendar events for today are listed in chronological order. Each event shows:

| Field | Description |
|---|---|
| Time | Start and end time |
| Title | Event name |
| Location | Where it takes place (if set) |
| Source | Which calendar it came from (Google or Apple) |

### ✅ Tasks

Your open to-do items appear in this section. Each task shows:

- Task title
- Due date (if set)
- Priority level (if set in Google Tasks)

Completed tasks appear at the bottom with a strikethrough.

### 🌤 Weather

The weather card shows current conditions for your configured city:

- Temperature and "feels like" temperature
- Weather description and icon
- Humidity percentage
- Wind speed

The weather data also influences the AI briefing — if it's raining, the AI will mention it; if it's a great day for outdoor activities, the AI will note that too.

### 🎂 Birthdays

If any of your Google Contacts have a birthday today, they're highlighted here. Never forget to send a birthday message again.

---

## Navigating the app

The navigation bar at the bottom of the screen has four sections:

| Tab | What's there |
|---|---|
| **Today** | Your daily overview — the main screen |
| **Calendar** | Today's events in full detail |
| **Tasks** | Your complete to-do list |
| **Settings** | Configuration overview and integration status |

---

## Adding events and tasks

The floating **blue + button** in the bottom-right corner opens the quick-add form.

### Adding a calendar event

1. Tap the **+** button
2. Make sure the **Event** tab is selected (it's the default)
3. Fill in the details:
   - **Title** *(required)* — e.g. `Dentist appointment`
   - **Start** *(required)* — date and time picker
   - **End** *(optional)* — defaults to 1 hour after the start time
   - **Location** *(optional)* — e.g. `City Dental Clinic, 10 Main Street`
4. Tap **Add Event**

The event is saved immediately to your Google Calendar. If Google is not connected, DayPilot will try Apple Calendar as a fallback.

### Adding a task

1. Tap the **+** button
2. Tap the **Task** tab
3. Fill in the details:
   - **Task** *(required)* — e.g. `Buy birthday present for Mum`
   - **Due date** *(optional)* — date picker
4. Tap **Add Task**

The task is saved immediately to your Google Tasks list and appears in the Tasks section.

> 💡 **Voice alternative:** You can also add events using Siri or Google Assistant without touching your phone — see the [Voice Control Guide](voice-control.md).

---

## Refreshing the dashboard

The dashboard automatically refreshes every **15 minutes** to stay up to date.

To refresh manually, click the **🔄 refresh button** in the top-right corner of the header. The timestamp next to it shows when the data was last loaded.

---

## Receiving morning notifications

Every morning at your configured time (default: 7:00 AM), DayPilot automatically sends a push notification to all devices subscribed to your ntfy topic.

The notification includes:
- The full AI briefing text
- Your top 3 priorities
- A weather summary
- How many events you have today
- Any birthdays

### Setting up notifications on a new device

To receive notifications on an additional device:

1. Install the **ntfy app** ([iOS](https://apps.apple.com/app/ntfy/id1625396347) / [Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy))
2. Tap **+** and enter your topic name (the `NTFY_TOPIC` value from your `.env` file, e.g. `smith-family-2024`)
3. Allow notifications when prompted

### Triggering a briefing manually

You can send the push notification at any time without waiting for the scheduled run:

```bash
curl -X POST http://localhost:8000/api/summary/push
```

Or trigger the entire pipeline (fetch all data + generate AI briefing + push):

```bash
curl -X POST http://localhost:8000/api/pipeline/run
```

---

## Viewing the API

DayPilot's full interactive API documentation is available at:

```
http://localhost:8000/docs
```

This is a Swagger UI where you can browse all available endpoints and run them directly from the browser — useful for testing integrations or triggering manual refreshes.

---

## Next steps

- ✨ Learn about all features in depth → [Features Explained](features.md)
- 🗣 Add events with your voice → [Voice Control Guide](voice-control.md)
- ⚙️ Adjust configuration settings → [Configuration Reference](configuration.md)
- ❓ Something's not working? → [Troubleshooting Guide](troubleshooting.md)
