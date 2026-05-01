# BloomFocus — Technical Specification

> **Grow with every focused moment.** 🌱
> A gentle focus-timer web app where every completed session blooms a chosen plant in your personal garden. Pattern-lock auth, shareable QR cards, zero email.

This spec is the handoff package for building and deploying BloomFocus as a real product (React + Vite frontend, Express + SQLite backend). The interactive prototype this spec is derived from lives in the same project — treat it as the source of truth for visual design, copy, motion, and interaction details.

---

## 1. Product overview

BloomFocus turns quiet focused time into a little garden. A user:

1. Creates a **garden** (alphanumeric `garden_id` + 9-dot pattern lock, no email)
2. Picks a **session duration** (30 / 45 / 60 / 90 / 120 min)
3. Writes **one intention** (≤120 chars)
4. Chooses **one of 12 plants** they want to grow
5. Focuses with a calm circular timer
6. Completes → plant **blooms**, generates a shareable link + QR code + downloadable PNG "picture card"
7. Revisits **garden gallery** anytime; re-downloads or re-shares any past bloom
8. Anyone with the share link sees a **public bloom viewer** (no auth)

### 1.1 Non-goals
- No email / social login
- No comments, likes, follows — it's a private garden with optional public share links
- No real-time collaboration
- No recurring sessions / streaks beyond a simple day-streak readout

### 1.2 Success criteria
- Cold-start to first bloom ≤ 3 clicks after garden creation
- Share link PNG card downloads at 1200×1680 looking print-ready
- Pattern lock feels indistinguishable from Android's

---

## 2. Tech stack

| Layer     | Choice                         | Notes |
|-----------|--------------------------------|-------|
| Frontend  | React 18 + Vite + Tailwind CSS | SPA, hash-routed |
| Backend   | Node 20 + Express 4            | JSON API |
| Database  | SQLite via `better-sqlite3`    | Single file `data/bloomfocus.db` |
| Auth      | Pattern hash (bcrypt)          | No sessions, short-lived signed tokens |
| QR codes  | `qrcode` npm                   | Server-rendered PNG + client-side inline |
| Images    | `html2canvas` OR `satori` + `resvg-js` | See §7 |

---

## 3. Repository layout

```
bloomfocus/
├─ apps/
│  ├─ web/                        # Vite + React frontend
│  │  ├─ src/
│  │  │  ├─ main.tsx
│  │  │  ├─ App.tsx
│  │  │  ├─ api.ts                # typed fetch wrapper
│  │  │  ├─ store.ts              # zustand or context
│  │  │  ├─ plants/
│  │  │  │  ├─ index.ts           # PLANTS registry
│  │  │  │  └─ Rose.tsx .. Lotus.tsx   # 12 SVG components
│  │  │  ├─ components/
│  │  │  │  ├─ PatternLock.tsx
│  │  │  │  ├─ PlantSVG.tsx
│  │  │  │  ├─ Ambient.tsx
│  │  │  │  ├─ TimerRing.tsx
│  │  │  │  └─ PictureCard.tsx    # canvas renderer
│  │  │  ├─ screens/
│  │  │  │  ├─ Welcome.tsx
│  │  │  │  ├─ CreateGarden.tsx
│  │  │  │  ├─ Unlock.tsx
│  │  │  │  ├─ Dashboard.tsx
│  │  │  │  ├─ NewSession.tsx
│  │  │  │  ├─ Timer.tsx
│  │  │  │  ├─ Complete.tsx
│  │  │  │  ├─ Garden.tsx
│  │  │  │  ├─ SessionDetail.tsx
│  │  │  │  └─ PublicBloom.tsx
│  │  │  └─ styles/
│  │  │     └─ tokens.css         # design tokens
│  │  ├─ index.html
│  │  ├─ tailwind.config.js
│  │  ├─ vite.config.ts
│  │  └─ package.json
│  └─ api/                         # Express backend
│     ├─ src/
│     │  ├─ index.ts               # express app entry
│     │  ├─ db.ts                  # better-sqlite3 setup + migrations
│     │  ├─ routes/
│     │  │  ├─ gardens.ts
│     │  │  ├─ sessions.ts
│     │  │  └─ public.ts
│     │  ├─ middleware/
│     │  │  └─ auth.ts             # garden-token verification
│     │  └─ lib/
│     │     ├─ hash.ts             # bcrypt pattern hashing
│     │     └─ slug.ts             # unique_slug generator
│     ├─ migrations/
│     │  └─ 001_init.sql
│     ├─ data/                      # sqlite file (gitignored)
│     └─ package.json
├─ package.json                    # pnpm workspaces
├─ pnpm-workspace.yaml
├─ docker-compose.yml              # optional
├─ Dockerfile                      # multi-stage
├─ README.md
└─ .env.example
```

---

## 4. Data model (SQLite)

```sql
-- migrations/001_init.sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE gardens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  garden_id    TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pattern_hash TEXT NOT NULL,        -- bcrypt hash of pattern string "0,1,2,5,4"
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  garden_id        TEXT NOT NULL REFERENCES gardens(garden_id) ON DELETE CASCADE,
  intention        TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (30,45,60,90,120)),
  plant_type       TEXT NOT NULL,    -- one of the 12 ids, see §5
  unique_slug      TEXT NOT NULL UNIQUE,
  completed_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_garden  ON sessions(garden_id, completed_at DESC);
CREATE INDEX idx_sessions_slug    ON sessions(unique_slug);
```

**Constraints & rules**
- `garden_id` regex: `/^[a-z0-9]{3,20}$/` (lowercased on write)
- `pattern_hash`: bcrypt of the raw pattern string (`"0,1,2,5,4"`) at cost 10
- `intention`: trimmed, 1–120 chars
- `plant_type`: must be one of the 12 registry ids
- `unique_slug` format: `bloom-{adj}-{noun}-{4charRand}` — see §4.1

### 4.1 Slug generator
```ts
const adj  = ['soft','warm','quiet','still','bright','gentle','wild','slow','honey','calm'];
const noun = ['petal','moss','fern','dawn','dusk','meadow','sprout','garden','willow','clover'];
function slug() {
  const a = adj[Math.floor(Math.random()*adj.length)];
  const n = noun[Math.floor(Math.random()*noun.length)];
  const r = Math.random().toString(36).slice(2, 6);
  return `bloom-${a}-${n}-${r}`;
}
// Retry on UNIQUE constraint (vanishingly rare at ~10k slug space per (a,n))
```

---

## 5. Plant registry (12 plants)

Each plant has: `id`, `name`, `color` (hex accent), `whisper` (a short poetic caption), and an SVG component drawn on a **200×240 viewBox** with the plant anchored bottom-center.

| id          | name             | color    | whisper                |
|-------------|------------------|----------|------------------------|
| `rose`      | Rose             | #E89AAE  | For bold focus         |
| `sunflower` | Sunflower        | #F4CF6B  | For sunny work         |
| `tulip`     | Tulip            | #E89AAE  | For tender starts      |
| `lavender`  | Lavender         | #B39FD6  | For calm hours         |
| `cherry`    | Cherry Blossom   | #F5B7C7  | For fleeting moments   |
| `daisy`     | Daisy            | #F4CF6B  | For simple joys        |
| `cactus`    | Cactus           | #9FC48A  | For stubborn tasks     |
| `orchid`    | Orchid           | #C47FD4  | For delicate work      |
| `peony`     | Peony            | #F5B0C4  | For abundance          |
| `succulent` | Succulent        | #A8D4A0  | For steady days        |
| `fern`      | Fern             | #9FC48A  | For quiet thinking     |
| `lotus`     | Lotus            | #F9C9D8  | For reflection         |

**The prototype's `src/plants.jsx` contains the full SVG for every plant. Copy those `<g>`-based definitions verbatim into `apps/web/src/plants/`.** Do not regenerate them — the hand-tuned curves, palette, and stacking are part of the design.

### 5.1 Shared plant visual rules
- Pot = clay terracotta `#D9A57E` with rim `#E8B895` (only shown when `pot` prop is true; the timer, welcome, gallery all use *without* pot; complete screen and downloadable PNGs also use *without* pot)
- Stems: stroke `#6FA373`, width 3, round caps
- Leaves: fill `#95C49B`, stroke `#6FA377`
- Bloom center accent: butter yellow `#F4CF6B`

### 5.2 Animations (CSS)
Three named animations on plant internals:
- `stem-grow` — `transform-origin: 50% 100%; scaleY 0→1` over 1s
- `leaf-unfurl` — `scale 0→1 + opacity 0→1` over 0.6s
- `bloom-in` — **opacity-only** 0→1 over 1.2s (**critical**: do NOT animate `transform` on this — in SVG, CSS `transform` overrides the `transform="..."` attribute and teleports the element to origin. Use opacity only, or apply scale on an inner wrapper.)

Use `transform-box: fill-box; transform-origin: center;` on any SVG element you *do* CSS-transform.

---

## 6. API

Base URL: `/api`. All JSON. All write endpoints require `Authorization: Bearer <gardenToken>` except `POST /gardens` and the public endpoints.

### 6.1 Auth model
- Pattern submitted as string like `"0,1,2,5,4"` (dot indices 0–8, row-major)
- Server bcrypt-compares against stored `pattern_hash`
- On success, server returns a short-lived signed JWT (`HS256`, 24h) containing `{ garden_id }` — use a random 32-byte `JWT_SECRET` env var
- Middleware `requireGarden` decodes token and attaches `req.gardenId`
- Rate-limit unlock attempts: 5 per 15min per IP+garden_id → HTTP 429

### 6.2 Endpoints

#### `POST /api/gardens` — create garden
```
Body: { garden_id: string, pattern: string }
  - garden_id must match /^[a-z0-9]{3,20}$/
  - pattern must have ≥ 4 unique dots, ≤ 9
201 → { token: string, garden: { garden_id, created_at } }
409 → { error: "taken" }      // garden_id exists
400 → { error: "invalid_id" | "invalid_pattern" }
```

#### `POST /api/gardens/unlock` — sign in
```
Body: { garden_id: string, pattern: string }
200 → { token, garden: { garden_id, created_at } }
404 → { error: "not_found" }
401 → { error: "wrong_pattern" }
429 → { error: "too_many_attempts" }
```

#### `GET /api/sessions` — list authed garden's sessions
```
Headers: Authorization
Query:   ?limit=50&before=<iso>
200 → { sessions: Session[] }
```

#### `POST /api/sessions` — create completed session
```
Headers: Authorization
Body: { intention: string, duration_minutes: 30|45|60|90|120, plant_type: string }
201 → { session: Session }
```

Server assigns `unique_slug`, `completed_at`. No in-progress sessions are persisted — only completed ones.

#### `GET /api/sessions/:slug` — **public** read
```
200 → {
  session: { plant_type, intention, duration_minutes, completed_at, unique_slug, garden_id }
}
404 → { error: "not_found" }
```
This powers the public bloom viewer. No auth. No sensitive fields.

#### `GET /api/qr/:slug.png` — **public** QR PNG
Server-rendered QR code that encodes `https://bloomfocus.app/#/b/:slug`. 512×512, dark `#3B2E2A`, transparent background. Content-Type `image/png`, cached 7d.

### 6.3 `Session` type
```ts
type Session = {
  id: number;
  garden_id: string;
  intention: string;
  duration_minutes: 30 | 45 | 60 | 90 | 120;
  plant_type: PlantId;
  unique_slug: string;
  completed_at: string; // ISO
};
```

### 6.4 Error shape
All errors: `{ error: string, detail?: string }` with appropriate HTTP codes.

---

## 7. Downloadable artifacts

Two downloads are offered at completion (and again from Garden → session detail):

### 7.1 Plant picture (PNG, 1600×1600)
- Cream `#FFF9F0` square background
- Plant SVG centered with 200px padding
- Exported **client-side**: serialize `<PlantSVG>`, `Image()`-load as data URL, drawImage into canvas, `toBlob('image/png')`, save via `a[download]`

### 7.2 QR picture card (PNG, 1200×1680 — 5:7 portrait)
A gift-like card. Client-side canvas composition:

Layout (top → bottom, centered):
1. Outer gradient bg: linear `#FFF9F0` → `#FDE8D9`
2. Rounded white card (radius 56, padding 70) with `#EADBC8` 3px border
3. Inner accent border (plant color at 40% alpha)
4. Header label: _"— a bloom of focus —"_ in Caveat 42px italic
5. Plant SVG 520×520 centered
6. Plant name in DM Serif Display 68px
7. Intention wrapped to card width, DM Serif italic 36px
8. Metadata: `{duration} minutes · {long date}` in Nunito 600 26px grey
9. QR code 260×260 centered
10. `grown with focus by @{garden_id}` in Nunito 600 24px
11. Footer: `✿  BloomFocus  ✿` in petal-pink

QR encodes the full share URL including origin. Use `qrcode` library.

**Implementation option**: the prototype uses manual canvas draw (see `renderPictureCard` in `src/screens-complete.jsx`). Production could instead use `satori` + `@resvg/resvg-js` on the server for higher typographic fidelity — but client-side is fine if fonts are preloaded via `document.fonts.ready`.

---

## 8. Design system

### 8.1 Color tokens
```css
:root {
  --bg: #FFF9F0;            /* warm cream canvas */
  --bg-tint: #FEF3E4;
  --surface: #FFFFFF;
  --ink: #3B2E2A;
  --ink-soft: #6B5D54;
  --ink-faint: #A89A8E;
  --line: #EADBC8;
  --line-soft: #F3E7D4;

  --petal: #F5B7C7;   --petal-deep: #E89AAE;   /* primary accent */
  --sage:  #B8D4BC;   --sage-deep:  #8FBF96;
  --lavender: #D4C5E8; --lavender-deep: #B39FD6;
  --peach: #FFD4B8;   --butter: #FDE6A8;
  --terracotta: #E08D6A;  --stem: #6FA373;
}
```

### 8.2 Themes
Toggleable via `data-theme` on `<html>`:
- `pastel` (default, spec above)
- `earth` — muted warm ochres, terracotta, olive (see prototype CSS for full overrides)
- `moonlight` — deep navy canvas with the same accents, slightly saturated

### 8.3 Typography
- Display: **DM Serif Display** (headings, plant names, timer numerals)
- Body: **Nunito** (400/500/600/700/800)
- Hand accent: **Caveat** (600/700) — used sparingly for whispers like "it bloomed" and section captions. Never use for body or buttons.

### 8.4 Radii & shadow
```
--radius-sm: 10px; --radius: 18px; --radius-lg: 28px; --radius-xl: 40px;
--shadow-md: 0 4px 12px rgba(95,70,50,0.08), 0 2px 4px rgba(95,70,50,0.04);
--shadow-lg: 0 18px 40px rgba(95,70,50,0.12), 0 6px 14px rgba(95,70,50,0.06);
```

### 8.5 Canvas atmosphere
- Fixed full-screen gradient backdrop (petal + sage + lavender radial blooms) at 75% opacity
- Subtle SVG turbulence noise at 3.5% opacity, multiply blend
- Optional ambient layer of floating petals/leaves/fireflies (user toggleable)

### 8.6 Motion
- Screen transitions: `fadeUp 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)`
- Hover lift: `translateY(-1px)` + shadow bump, 150ms
- Sway (garden gallery plants): `rotate(-2deg) ↔ rotate(2deg)` over 5–7s
- Pattern lock dots pulse outward on activation

---

## 9. Screens

### 9.1 Welcome (`/`)
- Logo mark (stylized flower in pink circle) + sparkle
- `BloomFocus` serif wordmark, "Focus" in petal-deep
- Tagline hand-written: _"Grow with every focused moment"_
- Subcopy, two buttons: **Plant a new garden** (primary) / **I already have a garden** (ghost)
- Bottom row: 4 swaying plant illustrations (rose, lavender, sunflower, lotus)

### 9.2 Create Garden (`/new-garden`)
Three steps in a single card:
1. **Name your garden** — text input (3–20 alphanum, lowercased). Suggestion chips: `sakura2026`, `quietmoss`, `studybloom`, `rosegarden`. Validate server-side for uniqueness.
2. **Draw your secret** — pattern lock (see §10), requires ≥4 dots
3. **Once more, to remember** — redraw. On mismatch: show "Shapes don't match — let's try again", return to step 2. On match: `POST /api/gardens` → token stored, redirect to dashboard.

### 9.3 Unlock (`/unlock`)
1. **Which garden?** — text input, autosuggest from recently used (localStorage) showing chips
2. **Hello, @{garden_id}. Draw your secret shape.** — pattern lock. Wrong pattern: error + clear. 5 wrong in 15min → locked by rate limiter.

### 9.4 Dashboard (`/home`)
- Top bar: logo + `@{garden_id}` + 🔒 Lock garden button
- Greeting (time-of-day aware): _"Good morning, gardener"_
- Hero: `Your garden has {N} blooms.` + subcopy _"What shall we grow today?"_
- Stat row: Total blooms · Minutes focused · Current streak
- Big tinted card: **Start a new session** with swaying plant + primary CTA
- Recent blooms grid (last 4), each card: plant, name, duration + date; "See all →" link

### 9.5 New Session (`/session/new`)
Multi-step progress dots `●●●`. Back button returns to prior step.

**Step 1 — Duration.** 5 cards in a responsive grid:
- 30 min / "a short tend"
- 45 min / "a pomodoro pair"
- 60 min / "one deep hour"
- 90 min / "a creative stretch"
- 120 min / "full immersion"

**Step 2 — Intention.** Textarea, DM Serif 22px, 120-char counter, 5 example chips to one-click fill. Continue disabled until non-empty.

**Step 3 — Plant.** 12 plant cards in a responsive grid (min 160px). Each card: plant SVG, name, whisper caption. Selection highlight + sway animation on selected. Footer row: summary line _`{Plant} · {N} min · "intention"`_ and **🌱 Begin focus**.

### 9.6 Timer (`/session/active`)
- Header: hand-script _"growing"_, plant name in plant's accent color
- Intention in italic serif
- Center: circular progress ring (340×340), two-color gradient (plant color → lavender), 12 tick marks; inside the ring, the plant SVG scales from 0.3 to 1.0 and fades from 0.4 → 1.0 opacity as progress advances
- Timer digits mm:ss in DM Serif 56px tabular-nums
- Status line `focusing` / `resting`
- Breathing guide: small sage dot that pulses on a 4-in / 4-hold / 4-out rhythm (8s cycle) — only when not paused
- Controls: Pause/Resume, Rain on/off, Leave (confirms? — no, just exits to dashboard)
- **Dev/demo affordance**: "Skip to end" link + toggle "1 sec = 1 min demo speed"

Timer uses wall-clock math (`Date.now()` diff) not tick accumulation, so tab-throttling doesn't drift. On pause, adjust `startedAt` by pause duration on resume.

### 9.7 Complete (`/session/complete`)
- Celebratory floating petals for ~4s
- Hand-script "it bloomed"
- H1: _"Your {plant} opened."_
- Copy: _"You stayed with it for {N} quiet minutes. That matters."_
- Hero: 420×420 stage with decorative dashed + solid rings behind; plant SVG 260×312 centered, swaying; Replay button bottom-right
- **Share card** (2-column row on desktop):
  - Left: section title, intention quote, share URL in dashed-border field + Copy button, two action buttons: ↓ Plant picture (sage) / ✿ Download card (primary)
  - Right: QR code image 160×160 + SCAN TO VISIT label
- **Picture card preview** (360×504 rendered inline, downloads at 1200×1680)
- Footer buttons: Back to garden / See all blooms

### 9.8 Garden (`/garden`)
- Header: `@{id}'s Garden` + bloom count + minutes tended
- "The garden bed": sage-tinted rounded panel showing up to 20 most recent plants in a horizontal row, each swaying with staggered delay, hoverable to lift, clickable to open detail
- Plant-type filter pills
- Grid of all blooms (min 220px cards). Each card: plant on tinted gradient bg, name, intention quote (italic), duration + date

### 9.9 Session detail (`/garden/:slug-ish`)
Re-view of a past bloom. Plant + date heading + plant name + intention + metadata. Three buttons: Plant picture, Download card, Copy link. Back to garden.

### 9.10 Public bloom viewer (`/#/b/:slug`)
No auth. Pulls from `GET /api/sessions/:slug`.
- Ambient petals
- Hand-script "— a shared bloom —"
- Plant SVG 340 swaying with bloom-in
- H1 plant name
- Intention in italic serif
- Metadata line
- Chip: _grown with focus by_ **@garden_id**
- Divider + CTA: _"grow your own"_ → button "🌱 Plant my first bloom" links to `/`

---

## 10. Pattern Lock component

**Spec:**
- 3×3 grid, dot radius `size * 0.065`, hit radius `size * 0.085`
- Padding `size * 0.14`
- Pointer + touch support; touch uses `touchAction: 'none'` to prevent scroll
- As the pointer enters a dot's hit area, if that dot isn't already in the path, add it
- **Auto-include skipped middle dots** (Android behavior): if the segment from the last dot to the new dot passes through a third dot on the grid that isn't yet in the path, insert it first
- Render:
  - Rounded square backdrop `--surface` with `--line` border
  - Completed segments: line between dots, stroke accent 3.5px, opacity 0.6
  - Trailing segment: from last dot to current pointer, accent 3.5px opacity 0.3
  - Dots: outer ring (`line`), inner circle (`line` default → `accent` when active), pulsing ring on active
- On `onMouseUp` / `onTouchEnd`: if `path.length >= minDots`, fire `onComplete(pattern)` with pattern string `"0,1,2,5,4"`
- Expose a `resetKey` prop — change it to force internal clear (used for create-confirm and unlock retry flows)

**Accessibility fallback**: offer a numeric-pad mode behind a `?fallback=1` query param — user taps dots in sequence instead of dragging. Ship in v1.1.

---

## 11. Environment variables

`apps/api/.env`
```
PORT=4000
DATABASE_PATH=./data/bloomfocus.db
JWT_SECRET=<32-byte random hex>
FRONTEND_ORIGIN=http://localhost:5173   # for CORS
PUBLIC_BASE_URL=http://localhost:5173   # used in QR code share URLs
BCRYPT_COST=10
```

`apps/web/.env`
```
VITE_API_URL=http://localhost:4000/api
```

---

## 12. Local development

Requires Node 20+, pnpm 9+.

```bash
# Install
pnpm install

# First run
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm --filter api migrate    # runs 001_init.sql

# Dev (two terminals, or use turbo/concurrently)
pnpm --filter api dev        # http://localhost:4000
pnpm --filter web dev        # http://localhost:5173

# Tests
pnpm --filter api test       # vitest + supertest for routes
pnpm --filter web test       # vitest + @testing-library/react

# Lint & format
pnpm lint
pnpm format
```

---

## 13. Deployment

Single-container or two-container, operator's choice.

### 13.1 Single-container (simplest)
Multi-stage Dockerfile: build frontend with Vite, copy `dist/` into Express as static assets, Express serves API under `/api/*` and SPA fallback for everything else. Persistent volume on `/app/data`.

```dockerfile
FROM node:20-alpine AS web-build
WORKDIR /build
COPY apps/web ./web
COPY package.json pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile && pnpm --filter web build

FROM node:20-alpine AS api-build
WORKDIR /build
COPY apps/api ./api
COPY package.json pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile && pnpm --filter api build

FROM node:20-alpine
WORKDIR /app
COPY --from=api-build /build/apps/api/dist ./dist
COPY --from=api-build /build/apps/api/node_modules ./node_modules
COPY --from=web-build /build/apps/web/dist ./public
ENV NODE_ENV=production
EXPOSE 4000
VOLUME ["/app/data"]
CMD ["node", "dist/index.js"]
```

Run: `docker run -p 4000:4000 -v bloomfocus-data:/app/data -e JWT_SECRET=... bloomfocus`

### 13.2 Railway / Fly.io / Render
- Deploy the container
- Attach a persistent volume at `/app/data`
- Set env vars
- Set custom domain; ensure `PUBLIC_BASE_URL` matches so QR codes encode the right URL

### 13.3 Backups
`data/bloomfocus.db` + `data/bloomfocus.db-wal` + `-shm`. Use `sqlite3 .backup` or `litestream` for continuous replication to S3.

---

## 14. Security & privacy

- **Patterns are stored bcrypt-hashed.** Raw pattern never touches disk.
- JWT secret must be ≥32 bytes of randomness; rotate on leak (invalidates all tokens, users redraw pattern to re-auth).
- Rate-limit unlock: 5 attempts / 15min / IP+garden. Log failures to stderr.
- CORS: allowlist `FRONTEND_ORIGIN` only.
- Public session endpoint leaks `garden_id` by design (it's the signature). Document this in a privacy notice on garden creation.
- Do not log intentions — they may be personal.
- No analytics by default. If added later, self-host Plausible, no cookies.

---

## 15. Accessibility checklist

- All buttons have accessible labels
- Pattern lock has keyboard fallback (planned v1.1) — tab through dots, Space to add, Enter to submit
- Color contrast: all text ≥ 4.5:1 against its surface in all three themes (audit with axe)
- Focus rings are visible (accent outline, 2px, 4px offset)
- Motion: respect `prefers-reduced-motion` — disable ambient petals, sway, and bloom-in transforms
- Timer screen announces time remaining every 5 minutes via `aria-live="polite"` region

---

## 16. Test matrix

Backend (vitest + supertest):
- `POST /gardens` happy path → 201, valid token round-trips
- `POST /gardens` duplicate id → 409
- Pattern < 4 dots → 400
- Unlock with wrong pattern → 401; 6th attempt → 429
- `POST /sessions` without token → 401; with → 201; returns populated `unique_slug`
- `GET /sessions/:slug` public, no auth needed
- `GET /sessions/:slug` for nonexistent slug → 404

Frontend (vitest + RTL):
- Pattern lock fires `onComplete` with joined indices after ≥4 dots
- Pattern lock auto-includes middle dot when skipping (e.g. 0→2 becomes `0,1,2`)
- Create-garden confirm step: mismatch returns to draw, match calls API
- Timer: wall-clock accuracy under fake timers; pause/resume preserves remaining
- Complete screen: clicking "Copy" puts share URL in clipboard; "Download card" produces a PNG blob

---

## 17. Open questions (decide before shipping)

1. Should sharing be **opt-in per session**? Currently every session has a public slug. Alternative: session-private by default, user toggles "make shareable" to mint the slug.
2. Garden export (ZIP of all PNGs)?
3. Hard delete vs soft delete for sessions / gardens? Right now: no delete UI.
4. Multi-device: a user with one garden on two browsers needs to redraw pattern on each. Acceptable v1.

---

## 18. Source of truth

The prototype files are the ground truth for visuals, copy, motion, and interaction timing. Port, don't re-imagine.

- `index.html` — global CSS tokens, themes, ambient layer, animations
- `src/plants.jsx` — all 12 plant SVGs (copy verbatim into `apps/web/src/plants/`)
- `src/pattern-lock.jsx` — PatternLock + PatternPreview + (prototype) hashPattern
- `src/ambient.jsx` — floating-particles background
- `src/screens-auth.jsx` — Welcome / Create / Unlock + LogoMark
- `src/screens-session.jsx` — Dashboard / NewSession / Timer + DURATIONS const
- `src/screens-complete.jsx` — Complete + PictureCard canvas renderer + QR helpers
- `src/screens-garden.jsx` — Garden / SessionDetail / PublicBloom
- `src/app.jsx` — routing, state, tweaks panel, default seeded demo

---

_Build gently. Ship something that feels like a small gift._ ✿
