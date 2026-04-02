# Pipeline

A full-stack job application tracker built with Vue 3, NestJS, PostgreSQL, and TypeORM.

## Project Structure

```
pipeline/
├── client/       # Vue 3 frontend (Vite + TypeScript + Pinia)
├── server/       # NestJS backend (TypeORM + PostgreSQL + JWT)
└── shared/       # Shared TypeScript types
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

## Getting Started

### 1. Set up the database

Create a PostgreSQL database named `pipeline`:

```sql
CREATE DATABASE pipeline;
```

### 2. Set up the server

```bash
cd server
cp .env.example .env
# Edit .env with your database credentials and a strong JWT secret
npm install
npm run start:dev
```

The server runs on [http://localhost:3000](http://localhost:3000).

### 3. Set up the client

```bash
cd client
npm install
npm run dev
```

The client runs on [http://localhost:5173](http://localhost:5173).
API requests are proxied to the server automatically via Vite's dev proxy.

---

## Admin Dashboard

Pipeline includes a full admin dashboard accessible at `/admin`. It is restricted to users with the `admin` role and is not visible to regular users.

### Features

**Overview** — Platform-wide stats: total users (with verified/suspended/admin breakdowns), total jobs, and per-status job counts (applied, interviewing, offered, rejected).

**User Management** — Paginated, searchable list of all users. Each user has a detail page with the following actions:
- Promote to admin / demote to user
- Suspend / unsuspend (blocks login)
- Force-verify email
- Resend verification email
- Trigger password reset email
- Delete account (permanently removes user and all their jobs)

**Job Management** — Paginated, searchable list of all jobs across all users. Supports single-job delete and bulk delete via checkbox selection.

**Audit Log** — Immutable, paginated log of every admin action. Each entry records the acting admin, the action type, the target resource, relevant metadata (e.g. target email, job title), and a timestamp. Actions are colour-coded by severity (danger / warn / neutral).

### Audit log actions

| Action | Severity |
|---|---|
| `DELETE_USER` | Danger |
| `SUSPEND_USER` | Danger |
| `DELETE_JOB` | Danger |
| `BULK_DELETE_JOBS` | Danger |
| `SET_ROLE` | Warn |
| `TRIGGER_PASSWORD_RESET` | Warn |
| `FORCE_VERIFY` | Neutral |
| `UNSUSPEND_USER` | Neutral |
| `RESEND_VERIFICATION` | Neutral |

### Creating an admin account

**Option 1 — Seed script (recommended for development)**

Add the following to `server/.env`:

```env
ADMIN_SEED_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=yourpassword
```

Then run:

```bash
cd server
npm run seed:admin
```

The script is idempotent — if the email already exists the account is promoted to admin and force-verified. If it does not exist a new verified admin account is created.

**Option 2 — CLI tool (promote an existing account)**

```bash
cd server
npm run make-admin -- admin@example.com
```

This promotes an existing registered account to the `admin` role.

---

## API Reference

### Auth

| Method | Endpoint         | Description              |
|--------|-----------------|--------------------------|
| POST   | /auth/register  | Register a new user      |
| POST   | /auth/login     | Login, returns JWT token |

### Jobs

All job endpoints require `Authorization: Bearer <token>` header.

| Method | Endpoint     | Description                          |
|--------|-------------|--------------------------------------|
| GET    | /jobs        | List all jobs for authenticated user |
| POST   | /jobs        | Create a new job application         |
| GET    | /jobs/:id    | Get a single job application         |
| PATCH  | /jobs/:id    | Update a job application             |
| DELETE | /jobs/:id    | Delete a job application             |

### Admin

All admin endpoints require `Authorization: Bearer <token>` header and an `admin` role. Actions that modify data are recorded in the audit log.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/stats | Platform-wide stats |
| GET | /admin/users | List users (paginated, searchable) |
| GET | /admin/users/:id | Get a single user with job stats |
| PATCH | /admin/users/:id/role | Update user role |
| PATCH | /admin/users/:id/suspend | Suspend a user |
| PATCH | /admin/users/:id/unsuspend | Unsuspend a user |
| POST | /admin/users/:id/verify | Force-verify a user's email |
| POST | /admin/users/:id/resend-verification | Resend verification email |
| POST | /admin/users/:id/reset-password | Trigger password reset email |
| DELETE | /admin/users/:id | Delete a user and all their data |
| GET | /admin/jobs | List all jobs (paginated, searchable) |
| GET | /admin/jobs/:id | Get a single job |
| PATCH | /admin/jobs/:id | Update a job |
| DELETE | /admin/jobs/:id | Delete a single job |
| DELETE | /admin/jobs | Bulk delete jobs (body: `{ ids: string[] }`) |
| GET | /admin/audit-log | List audit log entries (paginated) |

---

## Job Application Fields

| Field       | Type                                          | Required |
|-------------|-----------------------------------------------|----------|
| company     | string                                        | Yes      |
| title       | string                                        | Yes      |
| dateApplied | string (ISO date)                             | Yes      |
| status      | `applied` \| `interviewing` \| `offered` \| `rejected` | Yes |
| notes       | string                                        | No       |
| link        | string (URL)                                  | No       |

---

## Environment Variables

See `server/.env.example` for all required server environment variables.

| Variable | Description |
|---|---|
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASS` / `DB_NAME` | PostgreSQL connection details |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `MAIL_*` | SMTP credentials for transactional email |
| `ADMIN_SEED_EMAIL` | Email for the seed admin account |
| `ADMIN_SEED_PASSWORD` | Password for the seed admin account |

## Scripts

### Server

| Command | Description |
|---|---|
| `npm run start:dev` | Start with hot reload |
| `npm run build` | Build for production |
| `npm run start:prod` | Start production build |
| `npm run seed:admin` | Create or promote an admin account (requires env vars) |
| `npm run make-admin -- <email>` | Promote an existing account to admin |

### Client

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
