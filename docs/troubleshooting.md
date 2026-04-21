# ❓ Troubleshooting Guide

Something not working as expected? This guide covers the most common issues and how to fix them.

---

## The dashboard won't load (blank page or error)

**Check that DayPilot is running:**

```bash
docker compose ps
```

You should see both `day-pilot-backend` and `day-pilot-frontend` with status `Up`.

If they're not running, start them:

```bash
docker compose up -d
```

**Check for errors in the logs:**

```bash
docker compose logs backend
docker compose logs frontend
```

---

## I see "Error: HTTP 500" or "Failed to load summary"

This usually means the backend is having trouble fetching data from one of the services.

**Check which service is failing:**

Open `http://localhost:8000/api/status` in your browser. You'll see a status for each integration:

```json
{
  "google_calendar": true,
  "apple_calendar": false,
  "weather": true,
  "errors": ["Apple Calendar: CALDAV_URL not configured"]
}
```

Any `false` or error message tells you what needs to be fixed.

---

## Google Calendar isn't syncing

**Symptoms:** Events from Google Calendar don't appear, or `google_calendar: false` in `/api/status`.

**Check your credentials file:**

Make sure `credentials.json` is in the `data/` folder:

```
day-pilot/
└── data/
    └── credentials.json   ← must be here
```

**Authorise Google access:**

On the first run, DayPilot needs you to open a link in your browser to grant access. Check the backend logs for a URL:

```bash
docker compose logs backend | grep "authorize"
```

Open the URL in your browser, log in with your Google account, and grant the requested permissions.

**The token expired:**

If it worked before but stopped, the OAuth token may have expired. Delete it and re-authorise:

```bash
rm data/google_token.json
docker compose restart backend
```

Then check the logs again for the authorisation URL.

---

## Apple Calendar (iCloud) isn't syncing

**Check your settings in `.env`:**

```
CALDAV_URL=https://caldav.icloud.com
CALDAV_USERNAME=your@icloud.com
CALDAV_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

Make sure `CALDAV_PASSWORD` is an **App-Specific Password**, not your regular iCloud password.

**Generate a new App-Specific Password:**

1. Go to [appleid.apple.com](https://appleid.apple.com/)
2. Sign in → "Sign-In and Security" → "App-Specific Passwords"
3. Click **+** to generate a new one for "DayPilot"
4. Update `CALDAV_PASSWORD` in your `.env` and restart:
   ```bash
   docker compose restart backend
   ```

---

## Weather isn't showing

**Check your API key:**

Make sure `OPENWEATHERMAP_API_KEY` is set in `.env`. You can get a free key at [openweathermap.org/api](https://openweathermap.org/api).

**Check your city name:**

Make sure `WEATHER_CITY` in `.env` matches a real city name (e.g. `London`, `New York`, `São Paulo`).

**New API keys take up to 2 hours to activate** — if you just created your key, wait a bit and try again.

---

## AI briefing says "AI summary not available"

**Check your OpenAI API key:**

Make sure `OPENAI_API_KEY` is set in `.env` with a valid key from [platform.openai.com](https://platform.openai.com/).

**Check your OpenAI usage/credits:**

Log in to [platform.openai.com](https://platform.openai.com) and check that you have available credits. New accounts get some free credits, but they expire after a few months.

**The AI is always optional** — DayPilot works without it, it just won't have the intelligent briefing text.

---

## Push notifications aren't arriving

**Check your ntfy topic:**

Make sure `NTFY_TOPIC` in `.env` is set to the same topic name you subscribed to in the ntfy app on your phone.

**Test manually:**

```bash
curl -X POST http://localhost:8000/api/summary/push
```

Check the backend logs:

```bash
docker compose logs backend | tail -20
```

**Make sure the ntfy app is set up:**

1. Install ntfy on your phone (search "ntfy" in the App Store or Play Store)
2. Open the app → tap **+** → enter your topic name (e.g. `smith-family`)
3. Make sure notifications are allowed for the ntfy app in your phone's Settings

**Private topics:**

If you're using a private ntfy topic, make sure `NTFY_TOKEN` is set in `.env`.

---

## The "Add Event" or "Add Task" button isn't working

**Check your calendar connection:**

Events and tasks are added to Google Calendar / Google Tasks. If Google isn't connected, these buttons won't work.

See [Google Calendar isn't syncing](#google-calendar-isnt-syncing) above.

**Check the error message:**

When you tap "Add Event" or "Add Task", if something goes wrong, an error message will appear in red below the form. The message explains what went wrong.

---

## DayPilot is running but I can't access it from another device

**Find your server's IP address:**

On your server, run:
```bash
# Linux/Mac
hostname -I

# Windows
ipconfig
```

Then access DayPilot at `http://<that-ip-address>:3000` from any device on your home network.

**Check your firewall:**

If you're on Linux, make sure ports 3000 and 8000 are open:

```bash
sudo ufw allow 3000
sudo ufw allow 8000
```

---

## How to fully restart DayPilot

If something is behaving strangely, a full restart often fixes it:

```bash
docker compose down
docker compose up -d
```

---

## How to update DayPilot to the latest version

```bash
git pull
docker compose down
docker compose up -d --build
```

---

## How to view the full logs

```bash
# All services
docker compose logs

# Just the backend (where most errors happen)
docker compose logs -f backend

# Just the frontend
docker compose logs -f frontend
```

The `-f` flag "follows" the logs in real time. Press `Ctrl+C` to stop.

---

## Resetting everything (fresh start)

> ⚠️ **Warning:** This deletes your Google authorisation token. You'll need to re-authorise Google access afterwards.

```bash
docker compose down
rm -f data/google_token.json
docker compose up -d
```

---

## Still stuck?

If none of the above helps, check the **full API documentation** at `http://localhost:8000/docs` — it shows all available API endpoints and lets you test them directly in the browser.

You can also open an issue on [GitHub](https://github.com/Jaydee94/day-pilot/issues).
