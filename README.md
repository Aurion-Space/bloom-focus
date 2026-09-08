# BloomFocus

BloomFocus is a focus-session garden app. Users create a private garden, start focus sessions, and grow a visual plant collection as they complete work.

## Demo

Live demo: https://bloom.aurarios.cloud

Use the live site to explore the deployed app without setting up a local environment.

## Features

- Pattern-lock garden access.
- QR recovery keys for a forgotten pattern — no email required.
- Focus sessions with completion tracking.
- Public garden links and QR sharing.
- Plant-based progress visualization.
- SQLite-backed API with signed garden tokens.

## Recovery keys

BloomFocus stores no email or phone, so a downloadable QR card is the way back into a garden whose
pattern has been forgotten. A key is issued once at signup, and again on demand from the dashboard
(**✿ Recovery key**) — which is how gardens created before this feature get one. Using a key resets
the pattern and rotates the key, so a used card stops working. The server stores only a hash; the
code itself is shown exactly once. See `SPEC.md` §6.5.

## Tech Stack

- React + Vite frontend
- TypeScript Express backend
- SQLite via `better-sqlite3`
- JWT signing for garden access
- Docker Compose deployment

## Local Development

Install and run the API:

```bash
cd server
npm install
npm run dev
```

Install and run the web app:

```bash
cd apps/web
npm install
npm run dev
```

## Environment

Use `.env.example` or `server/.env.example` as templates. Set a strong 64-character hex `JWT_SECRET` for any shared or deployed environment. Runtime databases, `.env` files, deployment proxy configs, and build output are ignored.

