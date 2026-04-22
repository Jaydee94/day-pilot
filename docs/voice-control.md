# 🗣 Voice Control Guide

<p align="center">
  <img src="../frontend/public/logo.svg" alt="DayPilot Logo" width="300" />
</p>

Add calendar events hands-free using Siri (iPhone/iPad) or Google Assistant (Android). Once set up, you can say something like *"Hey Siri, add dentist appointment Tuesday 3pm"* and it will appear in your calendar immediately.

---

## How it works

DayPilot exposes a secure webhook endpoint:

```
POST http://<your-server>:8000/api/voice/command
```

Your voice assistant sends an HTTP request to this endpoint with the event details. DayPilot validates the request, then adds the event to your Google Calendar (or Apple Calendar as a fallback).

**Security:** All requests must include a `secret` field that matches the `VOICE_WEBHOOK_SECRET` in your `.env` file. This prevents unauthorized events from being added to your calendar.

---

## Prerequisites

Before setting up voice control:

1. DayPilot must be running and accessible (see [Getting Started](getting-started.md))
2. At least one calendar must be connected (Google Calendar recommended)
3. Your server must be accessible from your phone — either on the same home network, or exposed via a tunnel (see [Accessing from outside your home network](#accessing-from-outside-your-home-network))

---

## Step 1 – Set a secure webhook secret

Open your `.env` file and set a strong, unique secret:

```
VOICE_WEBHOOK_SECRET=xK9m2pQ7rL4nW8vY3cF6hJ0bT5sA1dE
```

Generate a random secret:

```bash
openssl rand -hex 32
```

> ⚠️ **Do not use the default `change-me-in-production`.** Anyone who knows your server's address could add events to your calendar if the default is left in place.

Restart the backend to apply the change:

```bash
docker compose restart backend
```

---

## Step 2 – Test the webhook manually

Before setting up the voice assistant, verify the webhook works:

```bash
curl -X POST http://localhost:8000/api/voice/command \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your-webhook-secret",
    "command": "add_event",
    "title": "Test event from voice webhook",
    "start": "2024-06-01T14:00:00+02:00",
    "end": "2024-06-01T15:00:00+02:00"
  }'
```

You should see a response like:

```json
{
  "status": "created",
  "source": "google",
  "event": { ... }
}
```

If you get a `401` error, your `secret` doesn't match `VOICE_WEBHOOK_SECRET` in `.env`.

---

## Siri Shortcuts (iPhone & iPad)

Siri Shortcuts is Apple's automation app. You'll create a shortcut that asks Siri for event details, then sends them to DayPilot.

### Basic shortcut (fixed event details)

This approach creates a shortcut for a specific recurring use case (e.g. "Add a 30-minute meeting at 2 PM today").

1. Open the **Shortcuts** app on your iPhone
2. Tap **"+"** to create a new shortcut
3. Tap **"Add Action"**
4. Search for **"Get Contents of URL"** and select it
5. Configure the action:
   - **URL:** `http://192.168.1.100:8000/api/voice/command` *(replace with your server's IP)*
   - **Method:** `POST`
   - Tap **"Show More"**
   - **Headers:** Add `Content-Type` → `application/json`
   - **Request Body:** Select `JSON`, then add the following key-value pairs:
     - `secret` → `your-webhook-secret`
     - `command` → `add_event`
     - `title` → `Meeting`
     - `start` → `2024-06-01T14:00:00+02:00`
     - `end` → `2024-06-01T15:00:00+02:00`
6. Tap the shortcut name at the top to rename it (e.g. "Add DayPilot Event")
7. Tap **"Done"**

### Dynamic shortcut (Siri fills in the details)

This is the more useful approach — Siri asks you for the event title and time each time you run the shortcut.

1. Open the **Shortcuts** app
2. Tap **"+"** to create a new shortcut
3. Add an **"Ask for Input"** action:
   - **Input Type:** Text
   - **Prompt:** `Event title?`
   - Tap the result variable and name it `EventTitle`
4. Add another **"Ask for Input"** action:
   - **Input Type:** Date
   - **Prompt:** `Start time?`
   - Tap the result variable and name it `StartTime`
5. Add a **"Format Date"** action (to convert the date to ISO 8601):
   - **Date:** `StartTime`
   - **Format:** Custom
   - **Custom Format:** `yyyy-MM-dd'T'HH:mm:ssXXXXX`
   - Name the result `StartTimeFormatted`
6. Add a **"Get Contents of URL"** action:
   - **URL:** `http://192.168.1.100:8000/api/voice/command`
   - **Method:** `POST`
   - **Headers:** `Content-Type: application/json`
   - **Request Body:** JSON with:
     - `secret` → `your-webhook-secret`
     - `command` → `add_event`
     - `title` → select `EventTitle` variable
     - `start` → select `StartTimeFormatted` variable
7. Optionally add a **"Show Result"** or **"Show Notification"** action to confirm success
8. Name the shortcut something memorable like `Add to DayPilot`
9. Tap **"Done"**

### Running the shortcut with Siri

After saving the shortcut, you can run it by saying:

- *"Hey Siri, Add to DayPilot"*

Siri will ask for the event title and start time, then send them to DayPilot.

You can also run it from the Shortcuts app or from the Shortcuts widget on your home screen.

### Adding the shortcut to your home screen

1. Long-press on the shortcut in the Shortcuts app
2. Tap **"Share"** → **"Add to Home Screen"**
3. Give it a name and icon

---

## Google Assistant (via IFTTT)

Google Assistant doesn't natively support custom HTTP webhooks, but you can bridge it using **IFTTT** (If This Then That), a free automation service.

### Prerequisites

- A free [IFTTT](https://ifttt.com) account
- The **Google Assistant** service connected in IFTTT
- Your DayPilot server accessible from the internet (see [Accessing from outside your home network](#accessing-from-outside-your-home-network))

### Creating the IFTTT applet

1. Log in to [ifttt.com](https://ifttt.com) and click **"Create"**
2. Click **"If This"** → search for **"Google Assistant"**
3. Choose the trigger: **"Say a phrase with a text ingredient"**
4. Set the phrase, e.g.:
   - `Add $ to my calendar`
   - *Where `$` is what Google Assistant will capture as the event title*
5. Click **"Then That"** → search for **"Webhooks"**
6. Choose **"Make a web request"**
7. Configure:
   - **URL:** `https://your-server.example.com:8000/api/voice/command`
   - **Method:** `POST`
   - **Content Type:** `application/json`
   - **Body:**
     ```json
     {
       "secret": "your-webhook-secret",
       "command": "add_event",
       "title": "{{TextField}}",
       "start": "{{OccurredAt}}"
     }
     ```
     *(Replace `{{TextField}}` and `{{OccurredAt}}` with the IFTTT ingredient variables)*
8. Click **"Create action"** → **"Finish"**

### Using the trigger

Say: *"Hey Google, add dentist appointment to my calendar"*

Google Assistant captures "dentist appointment" as the text ingredient and IFTTT sends it to DayPilot.

> ⚠️ **Limitation:** IFTTT's free tier has limitations on the number of applets. The time sent will be the current time (when you said the phrase), not a specific event time. For scheduling future events at a specific time, Siri Shortcuts is more flexible.

---

## Webhook payload reference

The voice endpoint accepts this JSON payload:

```json
{
  "secret": "your-webhook-secret",
  "command": "add_event",
  "title": "Meeting with Alice",
  "start": "2024-06-01T14:00:00+02:00",
  "end": "2024-06-01T15:00:00+02:00",
  "location": "Office"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `secret` | string | **Yes** | Must match `VOICE_WEBHOOK_SECRET` in `.env` |
| `command` | string | **Yes** | Action to perform — only `add_event` is supported |
| `title` | string | **Yes** | Event title |
| `start` | datetime | **Yes** | Start time in ISO 8601 format with timezone offset |
| `end` | datetime | No | End time — defaults to 1 hour after `start` |
| `location` | string | No | Event location |

### Date/time format

Always include the timezone offset in the `start` and `end` fields:

```
2024-06-01T14:00:00+02:00   ✅ correct (UTC+2)
2024-06-01T14:00:00Z         ✅ correct (UTC)
2024-06-01T14:00:00          ❌ missing timezone
```

---

## Accessing from outside your home network

If you want to use voice control when you're away from home, your server needs to be accessible from the internet. There are several ways to do this:

### Option 1 – Cloudflare Tunnel (recommended, free)

[Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) exposes your local server securely without opening firewall ports.

```bash
# Install cloudflared
# Then run:
cloudflared tunnel --url http://localhost:8000
```

This gives you a public HTTPS URL like `https://abc123.trycloudflare.com` that you can use in your Siri Shortcut or IFTTT webhook.

### Option 2 – ngrok (free tier available)

[ngrok](https://ngrok.com/) creates a temporary public tunnel to your local server:

```bash
ngrok http 8000
```

Note: Free tier tunnels change URL on restart. For a stable URL, use the paid tier or Cloudflare Tunnel.

### Option 3 – Port forwarding

If you have a static home IP address and control over your router:

1. Forward port `8000` on your router to your server's local IP
2. Use your public IP address in the webhook URL

> ⚠️ Exposing your server directly to the internet carries security risks. Make sure you've set a strong `VOICE_WEBHOOK_SECRET` and consider using HTTPS.

---

## Troubleshooting voice control

### "401 Unauthorized" error

The `secret` in your request doesn't match `VOICE_WEBHOOK_SECRET` in `.env`. Double-check both values match exactly (case-sensitive).

### "503 Service Unavailable" error

DayPilot couldn't add the event to any calendar. Check the backend logs:

```bash
docker compose logs backend | tail -20
```

Make sure at least one calendar (Google or Apple) is properly connected.

### Siri says "I couldn't run that shortcut"

- Check that your server is reachable from your phone: try opening `http://192.168.1.100:8000/docs` in your phone's browser
- If you're outside your home network, make sure you're using a public URL (not `192.168.x.x`)

### Event is created at the wrong time

Make sure the `start` datetime includes the correct timezone offset. For example, if you're in London (BST, UTC+1 in summer):

```
2024-06-01T14:00:00+01:00
```

---

## Next steps

- 🔌 Explore the full API → [API Reference](api-reference.md)
- ⚙️ Adjust configuration → [Configuration Reference](configuration.md)
- ❓ Something not working? → [Troubleshooting Guide](troubleshooting.md)
