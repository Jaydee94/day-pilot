# 📱 Daily Usage Guide

Everything you need to know to use DayPilot every single day.

---

## Opening the dashboard

Open your browser and go to:

```
http://localhost:3000
```

*(From another device on your home network, use your server's IP address instead of `localhost`.)*

The dashboard works like a website — you can also add it to your phone's home screen for quick access:
- **iPhone**: Tap Share → "Add to Home Screen"
- **Android**: Tap the menu (⋮) → "Add to Home Screen"

---

## The Today Screen

When you open DayPilot, you land on the **Today** screen. This is your main view for the day.

### 🤖 DayPilot Briefing

At the top, you'll see the AI-generated morning briefing — a short, friendly paragraph that summarises your day. It might say something like:

> *"Good morning! It's going to be a busy Tuesday. You have a school run at 8:30, a team meeting at 11:00, and it looks like rain this afternoon — remember to pack an umbrella. Your top priority today is the quarterly report due tomorrow."*

Below the briefing you'll also see your **Top 3 Priorities** — the three most important things to focus on today, automatically chosen by the AI.

### 📅 Events

Your calendar events for today are listed in time order. Each event shows:
- ⏰ Start and end time
- 📍 Location (if set)
- Which calendar it came from (Google or Apple)

### ✅ Tasks

Your open to-do items appear here. Completed tasks are shown with a strikethrough at the bottom. Tasks can have:
- A due date
- A priority level (High / Medium / Low)

### 🌤 Weather

The weather card shows current conditions for your city:
- Temperature (and what it "feels like")
- Weather description
- Humidity and wind speed

The weather is also used by the AI to give you smart advice (e.g. if it's very hot, it might suggest rescheduling outdoor activities).

### 🎂 Birthdays

If any of your Google Contacts have a birthday today, they'll be highlighted so you never forget to send a message!

---

## Navigating the app

At the bottom of the screen you'll find the navigation bar with four sections:

| Tab | What's there |
|---|---|
| **Today** | Your daily overview — the main screen |
| **Calendar** | All today's events in detail |
| **Tasks** | Your full to-do list |
| **Settings** | Configuration reference |

---

## Adding events and tasks quickly

You'll notice a **blue + button** floating in the bottom-right corner. Tap it to quickly add:

### Adding an event

1. Tap the **+** button
2. Make sure the **Event** tab is selected (it's the default)
3. Fill in:
   - **Title** — what the event is (e.g. "Dentist appointment")
   - **Start** — date and time
   - **End** — optional (defaults to 1 hour after start)
   - **Location** — optional (e.g. "City Dental Clinic")
4. Tap **Add Event**

The event is saved to your Google Calendar (or Apple Calendar if Google isn't connected).

### Adding a task

1. Tap the **+** button
2. Switch to the **Task** tab
3. Fill in:
   - **Task** — what you need to do (e.g. "Buy birthday present for Mum")
   - **Due date** — optional
4. Tap **Add Task**

The task is saved to your Google Tasks list.

> 💡 **Tip:** You can also add events using Siri or Google Assistant — see [Voice Control](../README.md#voice-control) in the main README.

---

## How notifications work

Every morning at your configured time (default: 7:00 AM), DayPilot sends a push notification to everyone subscribed to your ntfy topic.

The notification contains:
- The AI morning briefing text
- Your top 3 priorities
- A weather summary
- How many events you have today
- Any birthdays

To receive notifications on a new device, just install the **ntfy app** and subscribe to your topic (the `NTFY_TOPIC` value from your `.env` file).

### Triggering a briefing manually

If you want to send the briefing right now (without waiting for the scheduled time), you can do so via the API:

```
POST http://localhost:8000/api/summary/push
```

Or use curl:
```bash
curl -X POST http://localhost:8000/api/summary/push
```

---

## Refreshing the dashboard

The dashboard refreshes automatically every 15 minutes. To refresh manually, click the **🔄** button in the top-right corner of the header.

The last refresh time is shown next to the button.

---

## Next steps

- ✨ Want to understand the features more deeply? → [Features Explained](features.md)
- ❓ Something's not working? → [Troubleshooting Guide](troubleshooting.md)
