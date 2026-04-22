# AGENTS.md — DayPilot Single Source of Truth

> This document is the **authoritative rulebook** for all AI agents, contributors, and automated tools working on the DayPilot repository.
> Every decision — architectural, design, or behavioral — must align with this document.
> When in doubt, consult this file first.

---

## 1. PROJECT VISION

DayPilot is a **modular, containerised AI-powered daily planner** designed to run on a home server.

It is not a passive dashboard. DayPilot is a **daily co-pilot** — a calm, intelligent assistant that actively helps families understand their day, reduce decision fatigue, and stay in control of what matters.

DayPilot:
- Syncs **Google Calendar** and **Apple Calendar** (via CalDAV)
- Fetches **live weather data** to inform planning
- Includes **birthdays** and **tasks** as first-class citizens
- Uses an **LLM** to generate a personalised "DayPilot Briefing" each morning
- Sends **contextual notifications** via ntfy
- Displays everything in a **React PWA dashboard**

### Core Intent

- **Calm guidance** — never alarm, never overwhelm
- **Decision support** — help families decide *what to do*, not just *what is scheduled*
- **Family-friendly UX** — designed for non-technical users of all ages

---

## 2. CORE PRINCIPLES

These principles are non-negotiable. All agents must uphold them in every decision.

1. **Simplicity over complexity** — if there are two ways to solve a problem, choose the simpler one.
2. **Mobile-first always** — every UI element must work perfectly on a phone before being considered for desktop.
3. **Non-technical usability is mandatory** — assume the end user has zero technical knowledge. No jargon, no raw data, no unexplained states.
4. **AI must assist decisions, not just summarise** — the AI engine must provide actionable guidance, not just a recap of data.
5. **Avoid overengineering** — do not introduce abstractions, frameworks, or patterns unless they solve a real, current problem.
6. **Build MVP first, then iterate** — features must reach a working, usable state before being extended.
7. **No dead code** — remove unused code immediately. Do not leave commented-out blocks or placeholder functions.
8. **Prefer clarity over cleverness** — readable code is more valuable than clever code.

---

## 3. SYSTEM ARCHITECTURE

DayPilot is composed of isolated, independently deployable services. All services communicate over a shared Docker network.

### Services

#### `frontend`
- React PWA served via a static web server
- Communicates exclusively with the `backend` REST API
- No direct database or queue access
- Responsible for: UI rendering, user interaction, offline support

#### `backend`
- NestJS REST API
- Acts as the orchestration layer for all other services
- Responsible for: routing, authentication, data access, LLM orchestration, calendar sync coordination
- Exposes OpenAPI documentation

#### `ai-engine`
- Wraps the OpenAI API (pluggable — must support swapping to other LLMs)
- Consumes structured data from the backend
- Responsible for: generating the DayPilot Briefing, producing planning suggestions, formatting AI output
- Must never be called directly from the frontend

#### `calendar-sync`
- Dedicated sync service for Google Calendar and Apple CalDAV
- Runs on a schedule (cron-based)
- Writes normalised event data to PostgreSQL
- Responsible for: authentication with calendar providers, fetching, normalising, and persisting event data

#### `notifications`
- Sends notifications via the ntfy service
- Triggered by the backend based on rules and LLM output
- Responsible for: contextual alert delivery, notification templating, deduplication

#### `database` (PostgreSQL)
- Primary persistent data store
- Stores: users, events, tasks, briefings, settings, weather cache
- Schema changes must be managed via migrations (never manual alterations)

#### `queue` (Redis)
- Message queue and caching layer
- Used for: job queues (calendar sync, briefing generation), short-lived caches, session data

---

## 4. TECH STACK (MANDATORY)

The following stack is fixed. Do **not** introduce alternatives without an explicit architectural decision and justification in a PR.

### Frontend
- **React** (latest stable) + **Vite** + **TypeScript**
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- No other component libraries (e.g., MUI, Ant Design, Chakra) are permitted

### Backend
- **Node.js** with **NestJS** (preferred framework)
- **TypeScript** strictly enforced
- **TypeORM** for database access
- **class-validator** + **class-transformer** for DTOs and validation

### Infrastructure
- **Docker** + **Docker Compose** — all services must be containerised
- **PostgreSQL** — primary database
- **Redis** — queue and cache

### AI
- **OpenAI API** (default provider)
- Integration must be **pluggable** — the AI provider must be swappable via configuration without code changes

### Documentation
- **OpenAPI** (Swagger) — auto-generated from NestJS decorators
- Human-readable docs in `/docs`

---

## 5. CORE FEATURES (REQUIRED)

All features below are required. None may be removed, stubbed permanently, or replaced with non-equivalent implementations.

---

### 5.1 DayPilot Briefing

**Purpose:** Provide a personalised AI-generated morning summary that helps users understand and prepare for their day.

**Behavior:**
- Generated once per day (configurable time, default: 07:00 local time)
- Combines: today's events, tasks, weather, birthdays, and family context
- Output is a short, structured natural-language briefing
- Displayed as the primary card on the `/today` screen
- Delivered via ntfy notification at generation time

**Constraints:**
- Must be concise — no more than 150–200 words
- Must include at least one actionable suggestion
- Must be regeneratable on demand
- Must never expose raw API responses to the user

---

### 5.2 Smart Day Planning

**Purpose:** Help users decide *how* to use their available time, not just *what* is scheduled.

**Behavior:**
- Analyses gaps between scheduled events
- Suggests task slots based on available time and task priority
- Factors in weather (e.g., outdoor tasks only on good weather days)
- Presented as a secondary section on `/today`

**Constraints:**
- Suggestions must be optional — users are never forced to follow them
- Must degrade gracefully if AI is unavailable (show raw schedule without suggestions)
- Must never reschedule existing events

---

### 5.3 Contextual Notifications

**Purpose:** Alert users to relevant, time-sensitive information — not generic reminders.

**Behavior:**
- Sent via ntfy
- Triggered by: upcoming events (configurable lead time), weather changes that affect plans, AI-identified priorities
- Include context (e.g., "Rain expected at 14:00 — your outdoor event may be affected")

**Constraints:**
- Must not send more than 5 notifications per day by default (configurable)
- Must never send duplicate notifications
- Must be dismissable and configurable per user

---

### 5.4 Quick Capture System

**Purpose:** Allow users to add tasks or notes with minimal friction, from any screen.

**Behavior:**
- Floating action button (FAB) visible on all screens
- Opens a minimal input form (title + optional due date)
- Saves instantly to the task list
- Optionally triggerable via ntfy (reply-to-capture)

**Constraints:**
- Must complete in ≤ 2 taps/clicks from any screen
- Must work offline (queue for sync)
- Must never require navigation away from the current screen

---

### 5.5 Weather Intelligence

**Purpose:** Provide weather context that actively informs planning decisions.

**Behavior:**
- Fetches current and 24-hour forecast data
- Displayed on `/today` as the `WeatherInsightsCard`
- Feeds into Briefing and Smart Day Planning
- Flags weather that conflicts with scheduled outdoor activities

**Constraints:**
- Weather data must be cached (max 30-minute staleness)
- Must degrade gracefully if weather API is unavailable
- Must never show raw API data — always humanised output

---

### 5.6 Family Context Awareness

**Purpose:** Support multi-user households by understanding who is involved in each event or task.

**Behavior:**
- Events and tasks can be assigned to family members
- Briefing and planning suggestions reflect the whole household
- Birthdays are tracked and surfaced proactively

**Constraints:**
- No complex role or permission system in MVP — all family members share one household view
- Birthday reminders must appear in the Briefing at least 2 days in advance
- Must support ≥ 2 calendar sources per household

---

## 6. UX & DESIGN RULES

These rules govern every screen, component, and interaction in DayPilot. They are not negotiable.

### Layout

- **Card-based layout** — all content is contained in cards
- **Maximum 5 visible elements per screen** — above the fold at any viewport size
- **Large spacing** — minimum 16px between elements; 24px preferred
- **Rounded corners** — 12–16px border radius on all cards and interactive elements
- **Mobile-first always** — design for 375px width first; scale up from there

### Tone

- **Calm** — never use urgent language unless genuinely time-sensitive
- **Guiding** — speak in plain, friendly language; use "you" and "your"
- **Not noisy** — no unnecessary animations, badges, or alerts
- **Supportive** — the UI should feel like a helpful assistant, not a task manager

### Color Scheme

| Role       | Value     |
|------------|-----------|
| Primary    | `#4F8EF7` |
| Secondary  | `#A6C8FF` |
| Accent     | `#7ED957` |
| Background | `#F7F9FC` |
| Surface    | `#FFFFFF` |
| Text       | `#1F2937` |

- Do **not** introduce additional brand colors without updating this table
- Semantic colors (error, warning, success) may use Tailwind defaults but must remain consistent

### Typography

- Use system font stack or a single clean sans-serif (e.g., Inter)
- No decorative or display fonts
- Body text: minimum 16px
- Labels: minimum 14px

---

## 7. FRONTEND STRUCTURE

### Required Routes

| Route       | Purpose                                      |
|-------------|----------------------------------------------|
| `/today`    | Primary screen — Briefing, timeline, weather |
| `/calendar` | Full calendar view                           |
| `/tasks`    | Task list and quick capture                  |
| `/settings` | App configuration, calendar connections      |

- All routes must be accessible from a bottom navigation bar on mobile
- No route may require more than 2 taps to reach from any other route

### Required Components

| Component                | Purpose                                                  |
|--------------------------|----------------------------------------------------------|
| `DayPilotBriefingCard`   | Displays the AI-generated daily briefing                 |
| `EventTimeline`          | Chronological list of today's events                     |
| `TaskList`               | Displays and manages tasks                               |
| `WeatherInsightsCard`    | Weather summary with planning context                    |
| `QuickCaptureButton`     | Floating action button for rapid task/note entry         |

- Each component must be self-contained and independently reusable
- Each component must handle its own loading and error states
- No component may directly call an external API — all data must flow via the backend

### Component Rules

- Use **shadcn/ui** primitives as the base for all components
- Style exclusively with **Tailwind CSS** utility classes
- No inline styles unless absolutely necessary (and must be documented)
- All interactive elements must have accessible labels (`aria-label`, `aria-describedby`)

---

## 8. BACKEND & API RULES

### API Design

- **REST only** — no GraphQL, no WebSockets in MVP
- All endpoints must be documented via **OpenAPI (Swagger)**
- Versioning: all routes prefixed with `/api/v1/`
- Consistent response shape:
  ```json
  {
    "data": {},
    "meta": {},
    "error": null
  }
  ```

### Code Structure

- **Clean separation of concerns**: controllers handle routing only; services handle business logic; repositories handle data access
- **DTOs** (Data Transfer Objects) required for all request and response bodies
- **Validation** using `class-validator` on all incoming DTOs
- **No raw SQL** — use TypeORM query builder or repository methods

### Error Handling

- All errors must return structured JSON with `statusCode`, `message`, and `error` fields
- Never expose internal stack traces to clients
- Use NestJS exception filters for consistent error formatting

### Security

- All endpoints (except health check) must require authentication
- Use JWT-based auth
- Secrets and API keys must be loaded from environment variables only — never hardcoded

---

## 9. DOCKER & DEPLOYMENT

### Rules

- **Every service must run via `docker-compose`** — no exceptions
- **No manual setup steps** — `docker compose up` must be the only command needed to start the full stack
- Each service must be **isolated** in its own container with a dedicated Dockerfile
- Services must communicate over a named Docker network (`daypilot-net`)
- Persistent data (PostgreSQL, Redis) must use named Docker volumes

### Environment Configuration

- All configuration must be provided via environment variables
- An `.env.example` file must be kept up to date with all required variables
- No default secrets in `.env.example` — use placeholder values (e.g., `YOUR_OPENAI_API_KEY`)

### Health Checks

- Every service must expose a `/health` endpoint or equivalent
- `docker-compose.yml` must define `healthcheck` for database-dependent services

---

## 10. DOCUMENTATION RULES

### Required `/docs` Structure

```
/docs
  getting-started.md
  daily-usage.md
  features/
    briefing.md
    planning.md
    notifications.md
    quick-capture.md
    weather.md
  troubleshooting.md
```

### Writing Rules

- Written for **non-technical users** — assume no developer knowledge
- Use **simple, plain language** — no acronyms without explanation
- Use **step-by-step instructions** with numbered lists
- Include screenshots or diagrams where helpful
- Every feature must have a corresponding doc entry before it is considered complete

---

## 11. CODING STANDARDS

### Language

- **TypeScript everywhere** — no plain JavaScript files in the codebase
- `strict` mode enabled in all `tsconfig.json` files
- No use of `any` type — use `unknown` and narrow where necessary

### Naming Conventions

| Context          | Convention                  | Example                    |
|------------------|-----------------------------|----------------------------|
| Variables        | camelCase                   | `userEvents`               |
| Functions        | camelCase                   | `generateBriefing()`       |
| Classes          | PascalCase                  | `BriefingService`          |
| Interfaces       | PascalCase with `I` prefix  | `ICalendarEvent`           |
| Types            | PascalCase                  | `BriefingResponse`         |
| Files            | kebab-case                  | `briefing.service.ts`      |
| Constants        | UPPER_SNAKE_CASE            | `MAX_NOTIFICATIONS_PER_DAY`|
| React components | PascalCase                  | `DayPilotBriefingCard`     |

### Code Quality

- No dead code — remove unused imports, variables, and functions immediately
- No commented-out code blocks — use version control instead
- Every exported function and class must have a JSDoc comment
- Unit tests required for all service-layer logic
- Integration tests required for all API endpoints

---

## 12. AI BEHAVIOR RULES

These rules govern how the AI engine generates content. All prompts must be engineered to enforce these constraints.

### The AI Must

- Be **helpful** — every response must provide tangible value to the user's day
- Be **concise** — briefings are capped at 150–200 words; suggestions at 1–2 sentences each
- **Reduce stress** — frame information positively; highlight opportunities, not problems
- **Prioritise important information** — lead with the most time-sensitive or impactful item

### The AI Must NOT

- **Overload the user** — no lists longer than 5 items in any user-facing output
- **Generate unnecessary text** — no filler phrases like "Great question!" or "Certainly!"
- **Be vague** — every suggestion must be specific and actionable
- **Hallucinate data** — if data is unavailable, say so clearly and concisely
- **Use technical language** — all output must be suitable for a non-technical family audience

### Prompt Engineering Rules

- System prompts must define: role, constraints, output format, and tone
- User context (events, tasks, weather) must be injected as structured data
- Output format must be specified explicitly in the prompt (e.g., JSON schema or structured sections)
- Prompts must be versioned and stored in the codebase (not hardcoded inline)

---

## 13. IMPLEMENTATION STRATEGY

DayPilot is built in three phases. Each phase must be fully stable before the next begins.

### Phase 1 — MVP (Mock Data, Core UI)

- Scaffold all services with Docker Compose
- Build frontend with static/mock data for all routes
- Implement all required components with placeholder content
- Establish design system (colors, typography, spacing)
- Deploy locally with `docker compose up`

**Exit criteria:** A non-technical user can open the app on their phone and navigate all screens without confusion.

---

### Phase 2 — Real Integrations

- Connect Google Calendar and Apple CalDAV
- Integrate live weather API
- Implement PostgreSQL schema and migrations
- Replace all mock data with real API calls
- Implement authentication

**Exit criteria:** A real user's calendar events and weather appear correctly on `/today`.

---

### Phase 3 — Smart Features

- Integrate OpenAI for DayPilot Briefing generation
- Implement Smart Day Planning suggestions
- Implement ntfy notifications
- Implement Quick Capture with offline support
- Implement Family Context Awareness

**Exit criteria:** The full DayPilot Briefing is generated and delivered to a user each morning without manual intervention.

---

## 14. CONTRIBUTION RULES FOR AI AGENTS

These rules apply to **every AI agent** (including GitHub Copilot, Cursor, and any automated tool) working in this repository.

### You Must

- **Always follow AGENTS.md** — this file takes precedence over all other conventions
- **Read the relevant section of AGENTS.md** before making changes in any area of the codebase
- **Follow the tech stack exactly** — do not suggest or introduce alternatives
- **Follow the naming conventions** defined in Section 11
- **Respect the UX rules** defined in Section 6 — do not alter colors, spacing, or layout patterns
- **Write tests** for any service-layer or API logic you add or modify
- **Update `/docs`** if you add or change a user-facing feature
- **Keep `.env.example` current** when adding new environment variables

### You Must NOT

- **Introduce new frameworks** without an explicit justification in a PR description
- **Break UX principles** — no new colors, no additional navigation levels, no density increases
- **Overcomplicate solutions** — if a feature can be built simply, build it simply
- **Remove or stub required features** — all features in Section 5 are required
- **Hardcode secrets or API keys** — use environment variables
- **Leave dead code** — clean up after yourself
- **Skip validation** — all API inputs must be validated via DTOs
- **Bypass the REST API from the frontend** — all data must flow through the backend

### Pull Request Requirements

Every PR must include:
1. A clear description of what was changed and why
2. Reference to the relevant section(s) of AGENTS.md
3. Evidence that existing tests pass
4. New tests for any added logic
5. Updated documentation if a user-facing feature was changed

---

*This document is maintained as the single source of truth for DayPilot. All changes to this document must be reviewed and approved before merging.*
