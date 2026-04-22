# 🚀 Getting Started with DayPilot

<p align="center">
  <img src="../frontend/public/logo.svg" alt="DayPilot Logo" width="300" />
</p>

This guide walks you through a complete DayPilot installation from scratch. You only need to do this once — after setup, DayPilot runs automatically every day.

---

## Prerequisites

Before you begin, make sure you have:

- A computer or home server running **24/7** (e.g. a Raspberry Pi, NAS, old PC, or any Linux/macOS/Windows machine)
- **Docker** and **Docker Compose v2** installed ([download Docker Desktop](https://www.docker.com/get-started/) — it's free and includes both)
- About **20–30 minutes** for a first-time setup

> 💡 **Don't have Docker?** Visit [docker.com/get-started](https://www.docker.com/get-started/) and follow the installer for your operating system. No technical experience required.

---

## Step 1 – Download DayPilot

Open a terminal and run:

```bash
git clone https://github.com/Jaydee94/day-pilot.git
cd day-pilot
```

> **No `git`?** Download the ZIP from [github.com/Jaydee94/day-pilot](https://github.com/Jaydee94/day-pilot) → click **Code → Download ZIP**, then unzip it.

---

## Step 2 – Create your configuration file

Copy the example settings file:

```bash
cp .env.example .env
```

Open `.env` in any text editor (Notepad, TextEdit, VS Code, nano, etc.) and fill in your values.

The file is divided into sections — here are the most important settings to fill in right away:

### Minimum required settings

| Setting | What to enter | Where to get it |
|---|---|---|
| `WEATHERAPI_API_KEY` | Your weather API key | [weatherapi.com](https://www.weatherapi.com/) → free tier |
| `NTFY_TOPIC` | A name for your notification channel | Make one up, e.g. `smith-family-2024` |
| `WEATHER_CITY` | Your city name | e.g. `London`, `Berlin`, `New York` |

For the AI briefing you need **one** of the following (see Step 2b for details):

| Provider | Free? | Setting |
|---|---|---|
| Groq | ✅ Free | `AI_PROVIDER=groq` + `GROQ_API_KEY=…` |
| Google Gemini | ✅ Free | `AI_PROVIDER=google` + `GOOGLE_AI_API_KEY=…` |
| OpenAI | Pay-per-use | `AI_PROVIDER=openai` + `OPENAI_API_KEY=…` |
| GitHub Models | Requires Copilot subscription | `AI_PROVIDER=github` + `GITHUB_TOKEN=…` |

> 💡 **No AI key yet?** DayPilot still shows your calendar, tasks, and weather — the AI briefing text is simply skipped until a provider is configured.

### Recommended settings

| Setting | Description | Example |
|---|---|---|
| `APP_TIMEZONE` | Your local timezone | `Europe/London`, `America/New_York` |
| `DAILY_SUMMARY_TIME` | Time to send the morning briefing (HH:MM) | `07:00` |
| `WEATHER_UNITS` | Temperature unit | `metric` (°C) or `imperial` (°F) |
| `AI_MODEL` | AI model to use (overrides provider default) | `gpt-4o-mini` |
| `OPENAI_MODEL` | Legacy OpenAI model setting (overridden by `AI_MODEL`) | `gpt-4o-mini` |

> 📖 For a full list of every available setting, see the [Configuration Reference](configuration.md).

---

## Step 2b – Choose your AI provider

DayPilot supports four AI providers. Pick the one that suits you best — you only need to configure one.

---

### Option A — Groq (recommended for free users)

Groq offers a **completely free tier** with fast open-source models. No credit card required.

1. Sign up at [console.groq.com](https://console.groq.com)
2. Go to **API Keys** → **Create API key** → copy the key (starts with `gsk_`)
3. In your `.env`:

```env
AI_PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here
# Optional: pick a model (default is llama-3.3-70b-versatile)
AI_MODEL=llama-3.3-70b-versatile
```

**Free models available:**

| Model ID | Description |
|---|---|
| `llama-3.3-70b-versatile` | Best quality, great daily driver (default) |
| `llama-3.1-8b-instant` | Fastest, lowest latency |
| `gemma2-9b-it` | Google Gemma, compact and capable |
| `mixtral-8x7b-32768` | Large context window |

---

### Option B — Google Gemini (free tier)

Google AI Studio offers a **free tier** with Gemini models. No credit card required.

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) and sign in with your Google account
2. Click **Create API key** → copy the key (starts with `AIza`)
3. In your `.env`:

```env
AI_PROVIDER=google
GOOGLE_AI_API_KEY=AIza_your_key_here
# Optional: pick a model (default is gemini-2.0-flash)
AI_MODEL=gemini-2.0-flash
```

**Free models available:**

| Model ID | Description |
|---|---|
| `gemini-2.0-flash` | Fast, capable — great default (free) |
| `gemini-2.0-flash-lite` | Lightest and fastest (free) |
| `gemini-1.5-flash` | Previous generation, still excellent (free) |

---

### Option C — OpenAI

OpenAI is pay-per-use but extremely affordable for daily briefings (a few cents per month).

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys) and sign in
2. Click **Create new secret key** → copy it
3. In your `.env`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk_your_key_here
# Optional: pick a model (default is gpt-4o-mini)
AI_MODEL=gpt-4o-mini
```

---

### Option D — GitHub Models

If you have a **GitHub Copilot subscription** you can use GitHub's hosted models — no separate account needed.

> ⚠️ Requires an active Copilot Individual, Business, or Enterprise subscription. The `models:read` permission must be available in your account's token settings.

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token** → **Fine-grained token**
3. Under **Permissions** → **Models** → set to **Read-only**
4. Copy the token (starts with `github_pat_`)
5. In your `.env`:

```env
AI_PROVIDER=github
GITHUB_TOKEN=github_pat_your_token_here
# Optional: pick a model (default is gpt-4o-mini)
AI_MODEL=gpt-4o-mini
```

---

### Verify your AI configuration

After starting DayPilot, confirm the active provider:

```bash
curl http://localhost:8000/api/ai/config
```

Expected response:
```json
{"provider": "groq", "model": "llama-3.3-70b-versatile", "configured": true}
```

If `configured` is `false`, double-check that the correct API key is set in `.env`.

To list available models for your active provider:

```bash
curl http://localhost:8000/api/ai/models
```

---

## Step 3 – Connect Google Calendar

Google Calendar is the primary calendar source. This step also enables Google Tasks and birthday sync.

### 3a. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and sign in with your Google account
2. Click **"Select a project"** (top-left) → **"New Project"**
3. Name it something like `DayPilot` and click **"Create"**

### 3b. Enable the required APIs

In your new project:

1. Use the search bar to search for **"Google Calendar API"** → click **"Enable"**
2. Search for **"Tasks API"** → click **"Enable"**
3. Search for **"People API"** → click **"Enable"** (this enables birthday sync from your contacts)

### 3c. Create OAuth2 credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure the OAuth consent screen first:
   - Choose **"External"** as user type
   - Fill in a name (e.g. `DayPilot`) and your email
   - Click **"Save and Continue"** through the remaining screens
4. Back on the Credentials page, click **"Create Credentials"** → **"OAuth client ID"**
5. For **Application type**, choose **"Desktop app"**
6. Click **"Create"**
7. Click **"Download JSON"** — this is your `credentials.json` file

### 3d. Place the credentials file

Create a `data/` folder inside your DayPilot directory (if it doesn't exist yet), then copy your file:

```bash
mkdir -p data
cp ~/Downloads/client_secret_*.json data/credentials.json
```

Your directory should look like:

```
day-pilot/
└── data/
    └── credentials.json   ← the file you just downloaded
```

Verify your `.env` has this line:

```
GOOGLE_CREDENTIALS_JSON=/app/data/credentials.json
```

### 3e. Authorise Google access (first launch)

On the very first launch, DayPilot will print an authorisation URL in its logs. You'll need to:

1. Open the URL in your browser
2. Sign in with your Google account
3. Grant the requested permissions (calendar, tasks, contacts read access)

The authorisation token is then saved to `data/google_token.json` and reused automatically on every subsequent start.

> ✅ You only need to do this once. The token is saved and reused automatically.

---

## Step 4 – Connect Apple Calendar (optional)

If you use iCloud Calendar in addition to (or instead of) Google Calendar, follow these steps.

### 4a. Generate an App-Specific Password

Apple requires a special password for third-party apps — you cannot use your regular iCloud password.

1. Go to [appleid.apple.com](https://appleid.apple.com/) and sign in
2. Click **"Sign-In and Security"** → **"App-Specific Passwords"**
3. Click **"+"** and enter a label like `DayPilot`
4. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)

### 4b. Configure your `.env`

Add the following to your `.env` file:

```
CALDAV_URL=https://caldav.icloud.com
CALDAV_USERNAME=your@icloud.com
CALDAV_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

Replace `your@icloud.com` with your Apple ID and `xxxx-xxxx-xxxx-xxxx` with the app-specific password you just generated.

> 💡 Events from both Google and Apple calendars are merged and displayed together in the dashboard, sorted by time.

---

## Step 5 – Set up push notifications

DayPilot uses the free, open-source **ntfy** service to deliver morning briefings to your phone.

### 5a. Install the ntfy app

- **iPhone / iPad**: [Download from App Store](https://apps.apple.com/app/ntfy/id1625396347)
- **Android**: [Download from Play Store](https://play.google.com/store/apps/details?id=io.heckel.ntfy)

### 5b. Subscribe to your topic

1. Open the ntfy app
2. Tap **"+"** to add a subscription
3. Enter the topic name you chose in `NTFY_TOPIC` (e.g. `smith-family-2024`)
4. Tap **Subscribe**

Any family member can subscribe to the same topic on their device to receive the same morning briefings.

### 5c. (Optional) Use a private topic

By default, ntfy topics are public — anyone who knows the topic name can subscribe. To make your topic private:

1. Create an account at [ntfy.sh](https://ntfy.sh) (free)
2. Create a private topic and generate an access token
3. Set in your `.env`:
   ```
   NTFY_TOKEN=tk_your_access_token_here
   ```

Alternatively, you can [self-host ntfy](https://docs.ntfy.sh/install/) on your own server for complete privacy.

---

## Step 6 – Start DayPilot

In your terminal, from inside the `day-pilot` folder:

```bash
docker compose up -d --build
```

This builds and starts both the backend and frontend in the background. The first build may take 2–5 minutes as Docker downloads the required images.

### Verify it's running

```bash
docker compose ps
```

You should see both services with status `Up`:

```
NAME                    STATUS
day-pilot-backend       Up
day-pilot-frontend      Up
```

### Check the logs

```bash
docker compose logs -f
```

On first launch, look for the Google authorisation URL (if you haven't authorised yet). Press `Ctrl+C` to stop watching logs — DayPilot keeps running in the background.

---

## Step 7 – Open the dashboard

Open your web browser and navigate to:

```
http://localhost:3000
```

If you're accessing the dashboard from another device on your home network, replace `localhost` with your server's local IP address (e.g. `http://192.168.1.100:3000`).

> 🎉 **You're all set!** DayPilot will now run automatically every day and send your morning briefing at the time you configured.

---

## Keeping DayPilot up to date

To update DayPilot to the latest version:

```bash
git pull
docker compose down
docker compose up -d --build
```

---

## Auto-start on reboot

DayPilot is configured with `restart: unless-stopped` in Docker Compose, which means it will automatically restart if your server reboots. No additional configuration is needed.

To manually stop DayPilot:
```bash
docker compose down
```

To start it again:
```bash
docker compose up -d
```

---

## Next steps

- ⚙️ Review all configuration options → [Configuration Reference](configuration.md)
- 📱 Learn the dashboard → [Daily Usage Guide](daily-usage.md)
- 🗣 Set up voice control → [Voice Control Guide](voice-control.md)
- ☸️ Deploy on Kubernetes → [Kubernetes / Helm Guide](kubernetes.md)
- ❓ Having trouble? → [Troubleshooting Guide](troubleshooting.md)
