# 🚀 Getting Started with DayPilot

This guide walks you through setting up DayPilot on your home server from scratch. You only need to do this once!

---

## What you need before you start

- A computer or home server running **24/7** (e.g. a Raspberry Pi, NAS, old PC, or any Linux/Mac/Windows machine)
- **Docker** installed (free software — [download here](https://www.docker.com/get-started/))
- About **15–30 minutes** to set everything up

> 💡 **Don't have Docker?** Visit [docker.com/get-started](https://www.docker.com/get-started/) and follow the installer for your operating system. It's free and safe.

---

## Step 1 – Download DayPilot

Open a terminal (on Mac: search "Terminal", on Windows: search "Command Prompt" or "PowerShell") and type:

```bash
git clone https://github.com/Jaydee94/day-pilot.git
cd day-pilot
```

If you don't have `git`, you can also download the ZIP file from GitHub and unzip it.

---

## Step 2 – Create your configuration file

Copy the example settings file:

```bash
cp .env.example .env
```

Now open the `.env` file in any text editor (Notepad, TextEdit, VS Code, etc.).

You'll see many settings — don't worry, most have sensible defaults. Here are the ones you **should** fill in:

### Required settings

| Setting | What to put here | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` | Your OpenAI key | [platform.openai.com](https://platform.openai.com) → API keys |
| `OPENWEATHERMAP_API_KEY` | Your weather key | [openweathermap.org/api](https://openweathermap.org/api) → free tier |
| `NTFY_TOPIC` | A name for your notifications | Make up any name, e.g. `smith-family` |
| `WEATHER_CITY` | Your city | e.g. `London`, `Berlin`, `New York` |

### Optional (but recommended)

| Setting | What it does |
|---|---|
| `APP_TIMEZONE` | Your timezone, e.g. `Europe/London`, `America/New_York` |
| `DAILY_SUMMARY_TIME` | When to send your morning briefing, e.g. `07:00` |
| `OPENAI_MODEL` | Which AI model to use (default `gpt-4o-mini` is great and cheap) |

---

## Step 3 – Connect your calendars

### Google Calendar (recommended)

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and sign in
2. Click **"Create Project"** → give it a name like "DayPilot"
3. In the search bar, search for **"Google Calendar API"** → click **Enable**
4. Also enable **"Tasks API"** and **"People API"** the same way
5. Go to **"APIs & Services" → "Credentials"**
6. Click **"Create Credentials" → "OAuth client ID"**
7. Choose **"Desktop App"** → download the JSON file
8. Rename the file to `credentials.json`
9. Copy it into the `data/` folder inside your DayPilot directory:
   ```
   day-pilot/
   └── data/
       └── credentials.json   ← put it here
   ```
10. Set `GOOGLE_CREDENTIALS_JSON=/app/data/credentials.json` in your `.env`

> ✅ On first launch, DayPilot will print a link in its logs. Open it in your browser to grant calendar access. This only happens once.

### Apple Calendar (iCloud) — optional

1. Go to [appleid.apple.com](https://appleid.apple.com/) → "Sign-In and Security" → "App-Specific Passwords"
2. Generate a new password for "DayPilot"
3. In your `.env` file, set:
   ```
   CALDAV_URL=https://caldav.icloud.com
   CALDAV_USERNAME=your@icloud.com
   CALDAV_PASSWORD=the-app-specific-password-you-just-created
   ```

---

## Step 4 – Set up push notifications

DayPilot uses the free app **ntfy** to send morning briefings to your phone.

1. Install the **ntfy app** on your phone:
   - [iOS (App Store)](https://apps.apple.com/app/ntfy/id1625396347)
   - [Android (Play Store)](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
2. Open the app → tap **"+"** → type in the topic name you chose in `.env` (e.g. `smith-family`)
3. That's it! Any family member can subscribe to the same topic to get briefings

---

## Step 5 – Launch DayPilot

In your terminal, inside the `day-pilot` folder, run:

```bash
docker compose up -d --build
```

This downloads everything needed and starts DayPilot in the background. The first run may take a few minutes.

To check it started correctly:

```bash
docker compose logs -f
```

Press `Ctrl+C` to stop watching logs (DayPilot keeps running).

---

## Step 6 – Open the dashboard

Once started, open your web browser and go to:

```
http://localhost:3000
```

If you're accessing it from another device on your home network, replace `localhost` with your server's IP address (e.g. `http://192.168.1.100:3000`).

> 🎉 **You're all set!** DayPilot will send a briefing to your phone every morning at the time you configured.

---

## Keeping DayPilot running

DayPilot is set to restart automatically if your server reboots (`restart: unless-stopped` in Docker). You don't need to do anything special.

To stop DayPilot:
```bash
docker compose down
```

To start it again:
```bash
docker compose up -d
```

---

## Next steps

- 📱 Learn how to use the dashboard → [Daily Usage Guide](daily-usage.md)
- ✨ Explore all features → [Features Explained](features.md)
- ❓ Having trouble? → [Troubleshooting Guide](troubleshooting.md)
