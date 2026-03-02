# Akaunt — Accountability Platform

Stake coins. Meet deadlines. Get disciplined.

Production-ready MVP: spaces, daily/weekly staked tasks, strict deadlines, personal and group-vote forgiveness, ledger-based wallet. Optional **space ledger** for fines (track fines instead of deducting coins), **staged space settings** (changes require unanimous member approval), **timezone and currency** per space, and **notifications** for action-required and activity.

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

On Vercel, `vercel.json` configures these. For self-hosted, call the routes with a cron job (e.g. `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-app.com/api/cron/deadline-check`). **Dokploy:** see [README-DOKPLOY.md](./README-DOKPLOY.md) for deploy steps and Schedules setup.

## Project structure

- `app/` — App Router: landing, sign-in/up, dashboard, spaces, space view, settings, notifications, create task
- `app/actions/` — Server actions: spaces, tasks, forgiveness, ledger (settlements), notifications
- `app/api/cron/` — Cron endpoints: deadline-check (timezone-aware, stake vs ledger penalties), weekly-reset
- `lib/` — prisma, auth (Clerk sync), ledger (balance, fine balance, stake, penalty, fine, reversal), notifications
- `prisma/` — schema and migrations

## Features (post-MVP)

- **Space ledger for fines:** Per space you can enable “use ledger for fines”. Missed tasks then add a FINE entry (tracked per space) instead of deducting from the main wallet. Settlements (payments) are proposed and must be confirmed by all members before a FINE_SETTLEMENT entry is written.
- **Staged space settings:** Editing space rules (min stake, deadline, forgiveness, timezone, currency, ledger) is applied immediately if you’re the only member. With multiple members, changes are staged; all other members must approve before the new settings take effect. A new proposal supersedes any pending one.
- **Timezone and currency:** Each space has a timezone (default Africa/Nairobi) and currency symbol (default $). The server runs in UTC; deadline checks use the space timezone. The space ledger and fines UI show amounts with the space’s currency symbol.
- **Notifications:** Stored notifications for: vote on forgiveness, confirm settlement, vote on settings, task completed by another member, task fined/points lost. Notifications screen lists action-required and activity; mark as read and optional “mark all as read”.

## Edge cases

- **Insufficient balance:** Adding a task fails with a clear message; balance shown in space header. In ledger-for-fines mode, no stake is locked so balance is not checked when adding tasks.
- **Double forgiveness:** Only one FORGIVENESS_REVERSAL per task instance.
- **User leaves space:** Future PENDING instances are refunded (only if stake was locked) and removed; current period is still enforced by cron.
- **Voting ties:** Threshold not met → request stays REJECTED/EXPIRED.
- **Expired group requests:** Marked EXPIRED by the deadline-check cron.
- **Stake vs ledger:** Penalty routing uses space rules and optional task-template override (ledger mode). Deadline-check uses space timezone for “past deadline” and applies either stake penalty or FINE entry accordingly.
- **Settings proposals:** Unanimous approval from all other members required; any reject cancels the proposal. New proposal supersedes pending one.
- **Settlement proposals:** All members must confirm; any reject rejects the proposal. On full confirmation, a FINE_SETTLEMENT ledger entry is created for the target user.

## Out of scope (MVP)

Mobile app, push notifications, image proof, charity integrations, Redis queue, real-money or withdrawable coins.
