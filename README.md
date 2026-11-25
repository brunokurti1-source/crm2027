# CRM 2027

Secure CRM MVP for administrators, managers, and agents. English UI.

## Tech choice (greenfield)

**Next.js 15 (App Router) + TypeScript + Prisma + SQLite + Tailwind + iron-session + bcryptjs.**

- Fast local setup with SQLite; Prisma keeps a clear path to Postgres later.
- App Router server actions + API routes keep permission checks on the server.
- Session cookies (iron-session) for interactive auth; hashed API keys for external systems.
- Expandable modules: clients, team, agenda, import, audit.

## Requirements

- Node.js 20+
- npm

## Install & run (local)

```bash
cp .env.example .env
# edit SESSION_SECRET and DEMO_API_KEY if you like

npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo data (skipped when `NODE_ENV=production`) |
| `npm run db:reset` | Reset DB + seed |

## Demo accounts (local only)

Password for all: `Demo123!`

| Role | Email |
|------|-------|
| Administrator | `admin@crm.local` |
| Menaxher | `menaxher@crm.local` |
| Agjent | `agjent1@crm.local` |
| Agjent | `agjent2@crm.local` |

Demo API key (from seed / `.env`): value of `DEMO_API_KEY`  
Default in `.env.example`: `crm_demo_local_api_key_change_me`

**Do not use these credentials or keys in production. Seed runs only outside production.**

## Features

- Roles & permission flags (server-enforced): clients, credits, comments, import/delete, assignments, impersonation
- Client CRUD + archive, credits, filters/search, comments, activity history
- Manager/agent groups, assignments, workload on Team page
- Agenda: meetings + private reminders
- Excel/CSV import with per-row errors and duplicate checks
- External REST API with `X-API-Key`
- Impersonation with banner + audit log
- Admin audit log

## External API

Base URL: `http://localhost:3000/api/v1`

Authenticate with header:

```http
X-API-Key: <your-demo-api-key>
```

### List clients

```bash
curl -s -H "X-API-Key: $DEMO_API_KEY" \
  "http://localhost:3000/api/v1/clients?q=Besnik"
```

### Create or upsert by `clientIdNumber`

```bash
curl -s -X POST "http://localhost:3000/api/v1/clients" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $DEMO_API_KEY" \
  -d '{
    "clientIdNumber": "CL-9001",
    "firstName": "Nora",
    "lastName": "Meta",
    "phone": "+355691009001",
    "email": "nora@example.com",
    "country": "Albania",
    "status": "NEW",
    "creditBalance": 100,
    "agentEmail": "agjent1@crm.local"
  }'
```

New clients appear in the CRM immediately; if an agent is set, a follow-up reminder is created on their agenda.

### Get / patch by id or clientIdNumber

```bash
curl -s -H "X-API-Key: $DEMO_API_KEY" \
  "http://localhost:3000/api/v1/clients/CL-9001"

curl -s -X PATCH "http://localhost:3000/api/v1/clients/CL-9001" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $DEMO_API_KEY" \
  -d '{"status":"CONTACTED","creditBalance":250}'
```

Duplicate phone/email/`clientIdNumber` returns **409**.

### Managed integrations (admin)

Admin UI: **Integrimet** (`/settings/integrations`) — per-manager API connections with field mapping, encrypted credentials, inbound webhooks, outbound push, conflict policy, and pending-assignment queue.

```bash
# Inbound webhook (use the one-time X-Integration-Key shown on create)
curl -s -X POST "http://localhost:3000/api/integrations/<id>/inbound" \
  -H "Content-Type: application/json" \
  -H "X-Integration-Key: int_…" \
  -d '{"id":"ext-1","firstName":"Ana","lastName":"K","email":"ana@example.com","status":"NEW"}'

# Interval sync / auto-retry tick (cron)
curl -s -X POST "http://localhost:3000/api/integrations/tick" \
  -H "X-Cron-Secret: $INTEGRATION_CRON_SECRET"
```

Full steps: in-app docs at `/settings/integrations/docs`.

### Excel import columns

`clientIdNumber`, `firstName`, `lastName`, plus optional `phone`, `email`, `company`, `country`, `status`, `creditBalance` (Albanian header aliases accepted).

## Security notes

- Passwords hashed with bcrypt; never stored in plaintext.
- API keys stored as SHA-256 hashes.
- `.env` is gitignored; commit only `.env.example`.
- Permission checks run in server actions / API handlers, not only in the UI.

## Project layout

```
prisma/          schema, migrations, seed
src/app/(app)/   authenticated pages
src/app/api/v1/  external API
src/app/actions/ server actions
src/lib/         auth, permissions, db, audit
```

## Languages

The UI is English only.

## Backup & restore (admin)

1. Sign in as administrator → **Kopje rezervë**.
2. Download the JSON backup (passwords are never included).
3. Store the file offline / encrypted — not in a public folder.
4. To restore locally for disaster recovery, stop the app, replace or migrate data using a controlled script against a private copy of the backup, then restart. Do not expose restore endpoints publicly.

## Soft delete

Deleted clients/comments move to **Të fshira** (admin). Restore or permanently purge from there.

## New permissions

- `creditHistoryView` — view credit ledger (agents need this granted)
- `dataExport` — export clients CSV/Excel
- `manageStatuses` — manage client status list
