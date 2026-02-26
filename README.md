# Akaunt — Accountability Platform

Stake coins. Meet deadlines. Get disciplined.

Production-ready MVP: spaces, daily/weekly staked tasks, strict deadlines, personal and group-vote forgiveness, ledger-based wallet.

## Stack

- **Next.js 15** (App Router), TypeScript, TailwindCSS
- **Clerk** for authentication
- **PostgreSQL** + **Prisma**
- **Vercel Cron** (or self-hosted cron) for deadline enforcement and weekly reset

## Setup

### 1. Environment

Copy `.env.example` to `.env.local` and set:

```bash
# Clerk — https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/akaunt?schema=public"

# Optional: secure cron endpoints (recommended in production)
CRON_SECRET=your-random-secret
```

### 2. Database

```bash
npm run db:generate
npm run db:migrate   # or db:push for dev
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, create a space, add tasks, stake coins.

## Cron (production)

- **Deadline check:** `POST /api/cron/deadline-check` — run every minute. Marks overdue PENDING tasks as MISSED and applies penalty. Secure with `Authorization: Bearer <CRON_SECRET>`.
- **Weekly reset:** `POST /api/cron/weekly-reset` — run Sunday 00:00 UTC. Archives weekly stats per space for leaderboards.

On Vercel, `vercel.json` configures these. For self-hosted, call the routes with a cron job (e.g. `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-app.com/api/cron/deadline-check`).

## Project structure

- `app/` — App Router: landing, sign-in/up, dashboard, spaces, space view, create task
- `app/actions/` — Server actions: spaces, tasks, forgiveness
- `app/api/cron/` — Cron endpoints: deadline-check, weekly-reset
- `lib/` — prisma, auth (Clerk sync), ledger (balance, stake, penalty, reversal)
- `prisma/` — schema and migrations

## Edge cases

- **Insufficient balance:** Adding a task fails with a clear message; balance shown in space header.
- **Double forgiveness:** Only one FORGIVENESS_REVERSAL per task instance.
- **User leaves space:** Future PENDING instances are refunded and removed; current period is still enforced by cron.
- **Voting ties:** Threshold not met → request stays REJECTED/EXPIRED.
- **Expired group requests:** Marked EXPIRED by the deadline-check cron.

## Out of scope (MVP)

Mobile app, push notifications, image proof, charity integrations, Redis queue, real-money or withdrawable coins.
