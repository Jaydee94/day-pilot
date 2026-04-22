# ⚙️ Configuration Reference

<p align="center">
  <img src="../frontend/public/logo.svg" alt="DayPilot Logo" width="300" />
</p>

Complete reference for every configuration option available in DayPilot. All settings are defined in your `.env` file (copied from `.env.example`).

---

## How configuration works

DayPilot reads all configuration from a `.env` file in the project root. On startup:

1. The backend reads `.env` via [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
2. Environment variables always take precedence over values in `.env`
3. Defaults are applied for any setting not explicitly set

To apply changes to `.env`, restart the backend container:

```bash
docker compose restart backend
```

---

## General settings

### `APP_NAME`

| Property | Value |
|---|---|
| Default | `Day Pilot` |
| Required | No |

The display name for the application. Currently used in log messages.

```
APP_NAME=Day Pilot
```

---

### `APP_TIMEZONE`

| Property | Value |
|---|---|
| Default | `Europe/Berlin` |
| Required | **Recommended** |

The timezone DayPilot uses for all date/time operations — scheduling the daily pipeline, displaying events, and parsing the `DAILY_SUMMARY_TIME` setting.

Use a standard [IANA timezone name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones):

```
APP_TIMEZONE=Europe/London
APP_TIMEZONE=America/New_York
APP_TIMEZONE=America/Los_Angeles
APP_TIMEZONE=Asia/Tokyo
APP_TIMEZONE=Australia/Sydney
```

> ⚠️ Setting the wrong timezone will cause your morning briefing to arrive at the wrong time.

---

### `DAILY_SUMMARY_TIME`

| Property | Value |
|---|---|
| Default | `07:00` |
| Format | `HH:MM` (24-hour clock) |
| Required | No |

The time each day when DayPilot automatically runs the full pipeline (fetch data → generate AI briefing → send push notification). The time is interpreted in `APP_TIMEZONE`.

```
DAILY_SUMMARY_TIME=07:00   # 7:00 AM
DAILY_SUMMARY_TIME=06:30   # 6:30 AM
DAILY_SUMMARY_TIME=08:00   # 8:00 AM
```

The scheduler starts automatically when DayPilot boots and runs the pipeline once per day at this time.

---

## OpenAI (AI Briefing)

### `OPENAI_API_KEY`

| Property | Value |
|---|---|
| Default | *(empty)* |
| Required | No — AI briefing is disabled if not set |

Your OpenAI API key, used to generate the daily AI briefing and top priorities. Get a key at [platform.openai.com](https://platform.openai.com) → API Keys.

```
OPENAI_API_KEY=sk-proj-...
```

> 💡 If this key is not set, DayPilot still works — it shows events, tasks, and weather without the AI-generated text.

---

### `OPENAI_MODEL`

| Property | Value |
|---|---|
| Default | `gpt-4o-mini` |
| Required | No |

The OpenAI model to use for generating the daily briefing. The default `gpt-4o-mini` is fast, very affordable, and produces high-quality briefings.

```
OPENAI_MODEL=gpt-4o-mini     # default — best balance of cost and quality
OPENAI_MODEL=gpt-4o          # higher quality, higher cost
OPENAI_MODEL=gpt-3.5-turbo   # lowest cost option
```

The briefing is generated with `temperature=0.7` and a `max_tokens` limit of `512`. These are currently fixed in the code but can be adjusted in `backend/app/services/ai_summary.py`.

---

## Weather (WeatherAPI)

### `WEATHERAPI_API_KEY`

| Property | Value |
|---|---|
| Default | *(empty)* |
| Required | No — weather is disabled if not set |

Your WeatherAPI key. Get a free key at [weatherapi.com](https://www.weatherapi.com/) — the free tier provides more than enough requests for DayPilot's usage.

```
WEATHERAPI_API_KEY=abc123def456...
```

---

### `WEATHER_CITY`

| Property | Value |
|---|---|
| Default | `Berlin` |
| Required | **If weather is enabled** |

The city for which to fetch weather. Use a standard city name (optionally with a country code).

```
WEATHER_CITY=London
WEATHER_CITY=New York
WEATHER_CITY=Berlin
WEATHER_CITY=Paris, FR
WEATHER_CITY=Sydney, AU
WEATHER_CITY=São Paulo
```

---

### `WEATHER_UNITS`

| Property | Value |
|---|---|
| Default | `metric` |
| Options | `metric`, `imperial` |
| Required | No |

Controls the unit system for temperature and wind speed.

| Setting | Temperature | Wind Speed |
|---|---|---|
| `metric` | °C (Celsius) | m/s |
| `imperial` | °F (Fahrenheit) | mph |

```
WEATHER_UNITS=metric    # Europe, most of the world
WEATHER_UNITS=imperial  # United States
```

---

## Google Calendar

### `GOOGLE_CREDENTIALS_JSON`

| Property | Value |
|---|---|
| Default | `/app/data/credentials.json` |
| Required | **Yes, if using Google Calendar** |

The path (inside the Docker container) to your Google OAuth2 `credentials.json` file. In the default Docker setup, the `./data/` directory on your host is mounted to `/app/data/` in the container.

Place your `credentials.json` in `./data/credentials.json` and use:

```
GOOGLE_CREDENTIALS_JSON=/app/data/credentials.json
```

See [Getting Started → Step 3](getting-started.md#step-3--connect-google-calendar) for instructions on creating and downloading this file.

---

### `GOOGLE_TOKEN_JSON`

| Property | Value |
|---|---|
| Default | `/app/data/google_token.json` |
| Required | No |

The path where DayPilot saves the OAuth2 access/refresh token after first authorisation. This file is created automatically — you don't need to create it yourself.

```
GOOGLE_TOKEN_JSON=/app/data/google_token.json
```

If this file is deleted, DayPilot will require re-authorisation on next startup.

---

## Apple Calendar (CalDAV / iCloud)

### `CALDAV_URL`

| Property | Value |
|---|---|
| Default | *(empty)* |
| Required | **Yes, if using Apple Calendar** |

The CalDAV server URL. For iCloud, always use:

```
CALDAV_URL=https://caldav.icloud.com
```

---

### `CALDAV_USERNAME`

| Property | Value |
|---|---|
| Default | *(empty)* |
| Required | **Yes, if using Apple Calendar** |

Your iCloud / Apple ID email address.

```
CALDAV_USERNAME=your@icloud.com
```

---

### `CALDAV_PASSWORD`

| Property | Value |
|---|---|
| Default | *(empty)* |
| Required | **Yes, if using Apple Calendar** |

An **App-Specific Password** for your Apple account. You cannot use your regular iCloud password here.

To generate one:
1. Go to [appleid.apple.com](https://appleid.apple.com/) → Sign-In and Security → App-Specific Passwords
2. Click **+** and label it `DayPilot`
3. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)

```
CALDAV_PASSWORD=abcd-efgh-ijkl-mnop
```

---

## Push Notifications (ntfy)

### `NTFY_SERVER`

| Property | Value |
|---|---|
| Default | `https://ntfy.sh` |
| Required | No |

The ntfy server to use for sending push notifications. The default uses the free public ntfy.sh cloud service.

To use a self-hosted ntfy instance:

```
NTFY_SERVER=https://ntfy.yourdomain.com
NTFY_SERVER=http://192.168.1.50:8080
```

See the [ntfy self-hosting documentation](https://docs.ntfy.sh/install/) for setup instructions.

---

### `NTFY_TOPIC`

| Property | Value |
|---|---|
| Default | *(empty)* |
| Required | **Yes, for push notifications** |

The ntfy topic name to publish notifications to. Choose any name — it serves as the "channel" that subscribed devices listen on.

```
NTFY_TOPIC=smith-family-2024
NTFY_TOPIC=my-daypilot
```

> ⚠️ On the public ntfy.sh service, topic names are visible to anyone who knows them. Use a unique, hard-to-guess name, or use a private topic with `NTFY_TOKEN`.

---

### `NTFY_TOKEN`

| Property | Value |
|---|---|
| Default | *(empty)* |
| Required | No — only needed for private topics |

An access token for authenticating with a private ntfy topic. If your topic is public (no access control), leave this empty.

```
NTFY_TOKEN=tk_AgQdq7mVBoFD37zQVN29RhuMzNIz2
```

To subscribe to a private topic in the ntfy app, you also need to configure the token in the app settings.

---

## Voice Control

### `VOICE_WEBHOOK_SECRET`

| Property | Value |
|---|---|
| Default | `change-me-in-production` |
| Required | **Yes, if using voice control** |

A secret string used to authenticate incoming voice webhook requests. All requests to `POST /api/voice/command` must include this exact secret in the `secret` field of the JSON body.

> ⚠️ **Change this from the default before using voice control.** If left as `change-me-in-production`, anyone who knows your server's address could add events to your calendar.

Use a long, random string:

```
VOICE_WEBHOOK_SECRET=xK9m2pQ7rL4nW8vY3cF6hJ0bT5sA1dE
```

Generate a random secret:
```bash
openssl rand -hex 32
```

See the [Voice Control Guide](voice-control.md) for complete setup instructions.

---

## Complete `.env` example

Here is a fully filled-in example `.env` file:

```dotenv
# General
APP_NAME=Day Pilot
APP_TIMEZONE=Europe/London
DAILY_SUMMARY_TIME=07:00

# OpenAI
OPENAI_API_KEY=sk-proj-your-openai-key
OPENAI_MODEL=gpt-4o-mini

# Weather
WEATHERAPI_API_KEY=your-weatherapi-key
WEATHER_CITY=London
WEATHER_UNITS=metric

# Google Calendar
GOOGLE_CREDENTIALS_JSON=/app/data/credentials.json
GOOGLE_TOKEN_JSON=/app/data/google_token.json

# Apple Calendar (optional)
CALDAV_URL=https://caldav.icloud.com
CALDAV_USERNAME=your@icloud.com
CALDAV_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Push Notifications
NTFY_SERVER=https://ntfy.sh
NTFY_TOPIC=smith-family-2024
NTFY_TOKEN=

# Voice Control
VOICE_WEBHOOK_SECRET=change-this-to-a-random-string
```

---

## Next steps

- 🚀 First time setup? → [Getting Started Guide](getting-started.md)
- 🗣 Configure voice control → [Voice Control Guide](voice-control.md)
- 🔌 Explore the API → [API Reference](api-reference.md)
- ❓ Something not working? → [Troubleshooting Guide](troubleshooting.md)
