# ❓ Troubleshooting Guide

<p align="center">
  <img src="../frontend/public/logo.svg" alt="DayPilot Logo" width="300" />
</p>

Something not working as expected? This guide covers the most common issues and how to fix them.

---

## Quick diagnostics

Before diving into specific issues, run these two commands to get an overview:

```bash
# Check if both containers are running
docker compose ps

# Check the integration health endpoint
curl -s http://localhost:8000/api/status | python3 -m json.tool
```

The status endpoint returns something like:

```json
{
  "google_calendar": true,
  "apple_calendar": false,
  "weather": true,
  "last_sync": "2024-06-01T07:00:00+02:00",
  "errors": ["Apple Calendar: CALDAV_URL not configured"]
}
```

Any `false` value or error message tells you exactly which integration needs attention.

---

## The dashboard won't load (blank page or connection refused)

**Check that DayPilot is running:**

```bash
docker compose ps
```

Both `day-pilot-backend` and `day-pilot-frontend` should show status `Up`. If they're not:

```bash
docker compose up -d
```

**Check for startup errors:**

```bash
docker compose logs backend
docker compose logs frontend
```

Look for lines starting with `ERROR` or `CRITICAL`.

**Check the port:**

Make sure nothing else is using port 3000 or 8000:

```bash
# Linux/macOS
lsof -i :3000
lsof -i :8000
```

If another process is using those ports, you can change DayPilot's ports in `docker-compose.yml`.

---

## I see "Error: HTTP 500" or "Failed to load summary"

This usually means the backend had a problem fetching data from one of the services.

**Identify the failing service:**

```bash
curl -s http://localhost:8000/api/status | python3 -m json.tool
```

The `errors` array in the response will tell you which service is failing and why.

**Check the backend logs for details:**

```bash
docker compose logs backend | tail -50
```

---

## Google Calendar isn't syncing

**Symptom:** Events don't appear, or `"google_calendar": false` in `/api/status`.

### Missing credentials file

Make sure `credentials.json` is in the correct location:

```
day-pilot/
└── data/
    └── credentials.json   ← must exist
```

Check with:

```bash
ls -la data/
```

If the file is missing, follow the [Google Calendar setup steps](getting-started.md#step-3--connect-google-calendar) in the Getting Started guide.

### Authorisation required (first run)

On first launch, DayPilot needs you to grant Google access by clicking a link. Check the logs:

```bash
docker compose logs backend | grep -i "authorize\|auth\|oauth"
```

Open the URL shown in your browser, sign in with your Google account, and grant the requested permissions. The token is saved automatically after authorisation.

### Token expired

If calendar sync worked before but has stopped, the OAuth token may have expired.

```bash
rm data/google_token.json
docker compose restart backend
```

Then check the logs again for a new authorisation URL and complete the authorisation flow.

### Wrong credentials file

Make sure the `credentials.json` file is a **Desktop app** OAuth2 client credential, not a service account. Service accounts don't work for personal Google Calendar access.

---

## Apple Calendar (iCloud) isn't syncing

**Symptom:** iCloud events don't appear, or `"apple_calendar": false` in `/api/status`.

### Check your `.env` settings

```
CALDAV_URL=https://caldav.icloud.com
CALDAV_USERNAME=your@icloud.com
CALDAV_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

All three variables must be set. Make sure `CALDAV_PASSWORD` is an **App-Specific Password** — not your regular iCloud password.

### Generate a new App-Specific Password

1. Go to [appleid.apple.com](https://appleid.apple.com/) and sign in
2. Navigate to **"Sign-In and Security"** → **"App-Specific Passwords"**
3. Click **"+"** and enter the label `DayPilot`
4. Copy the generated password
5. Update `CALDAV_PASSWORD` in your `.env` file
6. Restart the backend:
   ```bash
   docker compose restart backend
   ```

### Two-factor authentication

If your Apple account has two-factor authentication enabled (which it should), app-specific passwords are required. Regular passwords will not work.

---

## Weather isn't showing

**Symptom:** Weather card is empty, or `"weather": false` in `/api/status`.

### Missing or invalid API key

Make sure `OPENWEATHERMAP_API_KEY` is set in `.env` with a valid key from [openweathermap.org/api](https://openweathermap.org/api).

> ⏳ **New API keys can take up to 2 hours to activate.** If you just created your key, wait and try again.

### Incorrect city name

Make sure `WEATHER_CITY` in `.env` matches a real city name recognised by OpenWeatherMap. Try common variations:

```
# Works
WEATHER_CITY=London
WEATHER_CITY=New York
WEATHER_CITY=São Paulo

# May not work
WEATHER_CITY=london uk    # too specific
WEATHER_CITY=NYC          # abbreviation
```

Test your city name directly:

```bash
curl "https://api.openweathermap.org/data/2.5/weather?q=YourCity&appid=YOUR_KEY"
```

---

## AI briefing says "AI summary not available"

**Symptom:** The briefing section shows a placeholder message or is empty.

### Missing or invalid OpenAI API key

Check that `OPENAI_API_KEY` is set in `.env` with a valid key from [platform.openai.com](https://platform.openai.com/).

### No OpenAI credits

Log in to [platform.openai.com](https://platform.openai.com) → Usage → check your balance. New accounts get free credits, but they expire after a few months.

### Model not available

If you've set `OPENAI_MODEL` to a model your API key doesn't have access to, the request will fail. The default `gpt-4o-mini` works with all standard OpenAI API keys.

> 💡 The AI briefing is **optional**. DayPilot still shows all events, tasks, and weather without it.

---

## Push notifications aren't arriving

**Symptom:** No notification arrives at the scheduled time.

### Wrong topic name

Make sure `NTFY_TOPIC` in your `.env` exactly matches the topic name you subscribed to in the ntfy app on your phone. Topic names are case-sensitive.

### ntfy app not set up

1. Install the ntfy app: [iOS](https://apps.apple.com/app/ntfy/id1625396347) / [Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
2. Open the app → tap **+**
3. Enter your exact topic name (from `NTFY_TOPIC` in `.env`)
4. Allow notifications when prompted in your phone's settings

### Test manually

Send a test notification right now:

```bash
curl -X POST http://localhost:8000/api/summary/push
```

Then check the backend logs:

```bash
docker compose logs backend | tail -20
```

Look for `Notification sent` or any error messages.

### Private topics

If `NTFY_TOKEN` is set in `.env`, you must subscribe using a token in the ntfy app as well. For private topics:

1. In the ntfy app, when subscribing, enter your topic name and also set the access token
2. Or access the topic URL directly: `https://ntfy.sh/your-topic` with the correct token

---

## The "Add Event" or "Add Task" button isn't working

### Google not connected

Events and tasks are written to Google Calendar / Google Tasks. If Google isn't connected, these buttons will fail.

See [Google Calendar isn't syncing](#google-calendar-isnt-syncing) above to fix the connection.

### Error message in the form

When something goes wrong, an error message appears in red below the form. Read the message — it will tell you what failed (e.g. "Could not add event to any calendar").

---

## DayPilot is running but I can't access it from another device on my network

### Find your server's IP address

Run this on the server:

```bash
# Linux/macOS
hostname -I

# Windows
ipconfig
```

Then access DayPilot at `http://<that-ip>:3000` from any device on the same network.

### Check firewall rules

If you're running Linux with ufw (Ubuntu Firewall), open the required ports:

```bash
sudo ufw allow 3000
sudo ufw allow 8000
sudo ufw reload
```

---

## How to fully restart DayPilot

A full restart resolves many transient issues:

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

## How to view logs

```bash
# All services
docker compose logs

# Backend only (most errors appear here)
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend

# Last 100 lines of backend logs
docker compose logs --tail=100 backend
```

The `-f` flag follows logs in real time. Press `Ctrl+C` to stop following (DayPilot keeps running).

---

## Resetting Google authorisation (fresh start)

> ⚠️ **Warning:** This deletes your saved Google token. You'll need to re-authorise Google access afterwards.

```bash
docker compose down
rm -f data/google_token.json
docker compose up -d
docker compose logs -f backend   # watch for the authorisation URL
```

---

## Resetting everything completely

> ⚠️ **Warning:** This removes all saved tokens and stops DayPilot. You will need to re-authorise all integrations.

```bash
docker compose down
rm -f data/google_token.json
docker compose up -d
```

Your `.env` configuration and `credentials.json` are preserved — only the authorisation token is removed.

---

## Still stuck?

- Browse the interactive API docs at `http://localhost:8000/docs` to test endpoints directly
- Check the full configuration reference → [Configuration Reference](configuration.md)
- Open an issue on [GitHub](https://github.com/Jaydee94/day-pilot/issues) with your error logs
