# Deploying Akaunt on Dokploy

This guide covers running Akaunt as a Docker Compose service on [Dokploy](https://dokploy.com/) with Traefik, and configuring the required cron jobs via Dokploy Schedules.

## Prerequisites

- A Dokploy instance with Traefik (or another reverse proxy) and the `dokploy-network` external network.
- A PostgreSQL database (hosted elsewhere or in Dokploy) that the app can reach.
- Docker image available at `ghcr.io/denogeek/akaunt:akaunt-latest` (see main [README.md](./README.md) and CI for building/pushing).

## 1. Environment variables

Set these in Dokploy for the Compose stack (or in a `.env` file used by the compose file):

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:password@host:5432/akaunt?schema=public` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | From [Clerk Dashboard](https://dashboard.clerk.com) |
| `CLERK_SECRET_KEY` | Yes | From Clerk Dashboard |
| `CRON_SECRET` | Recommended | Random secret to protect cron endpoints (e.g. `openssl rand -hex 32`) |
| `NODE_ENV` | Optional | e.g. `production` |

Ensure the database exists and migrations have been applied (run them once against this `DATABASE_URL` from a dev machine or a one-off container).

## 2. Deploy the Compose stack

1. In Dokploy, create a new **Docker Compose** project/service.
2. Use the compose file from this repo: `docker-compose-dokploy.yml`.
3. Set the environment variables above in the stack/service configuration.
4. Deploy. The app will listen on port 3000 inside the container.

## 3. Traefik / domain

The sample compose file exposes the app with Traefik:

- **Host:** `akaunt.neverest.co.ke` (edit the label `traefik.http.routers.app.rule` to use your domain).
- **Port:** Traefik forwards to the container port 3000.

Example for a different domain:

```yaml
- "traefik.http.routers.app.rule=Host(`your-domain.com`)"
```

Ensure DNS for your domain points to the server and that Traefik is configured for HTTPS if needed.

## 4. Cron jobs (Dokploy Schedules)

The app does not run cron internally. Two HTTP endpoints must be called on a schedule. Use **Dokploy → Schedules** and create the following.

### Schedule 1: Deadline check (every minute)

Marks overdue tasks as MISSED and applies penalties.

| Field | Value |
|-------|--------|
| **Task Name** | `Akaunt deadline check` |
| **Schedule** | `* * * * *` (every minute) |
| **Timezone** | `UTC` (or your preference) |
| **Script** | See below |

**Script** (replace `YOUR_APP_URL` and ensure `CRON_SECRET` is available to the runner):

```bash
curl -sS -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "https://YOUR_APP_URL/api/cron/deadline-check"
```

Example with a fixed secret (use env var in production if possible):

```bash
curl -sS -X POST \
  -H "Authorization: Bearer your-cron-secret-here" \
  "https://akaunt.neverest.co.ke/api/cron/deadline-check"
```

### Schedule 2: Weekly reset (Sunday 00:00 UTC)

Archives last week’s stats for leaderboards.

| Field | Value |
|-------|--------|
| **Task Name** | `Akaunt weekly reset` |
| **Schedule** | `0 0 * * 0` |
| **Timezone** | `UTC` |
| **Script** | See below |

**Script:**

```bash
curl -sS -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "https://YOUR_APP_URL/api/cron/weekly-reset"
```

If Dokploy runs scripts in a context where `CRON_SECRET` is not set, substitute the same value you set in the app environment.

## 5. Verify

- Open `https://your-domain` and sign in (Clerk).
- Create a space and add a task to confirm DB and app work.
- Trigger the deadline-check endpoint manually (e.g. with `curl`) and check logs; after the schedules run, verify in Dokploy that they executed successfully.

## Reference

- Main app docs and local setup: [README.md](./README.md)
- Cron endpoint behaviour: `app/api/cron/deadline-check`, `app/api/cron/weekly-reset`
