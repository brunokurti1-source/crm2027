# CRM 2027

Secure CRM MVP for administrators, managers (Menaxher), and agents (Agjent). Albanian UI labels; English code.

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
