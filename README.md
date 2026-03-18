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

## Scripts

### Server

| Command             | Description                  |
|---------------------|------------------------------|
| `npm run start:dev` | Start with hot reload         |
| `npm run build`     | Build for production          |
| `npm run start:prod`| Start production build        |

### Client

| Command         | Description              |
|-----------------|--------------------------|
| `npm run dev`   | Start dev server          |
| `npm run build` | Build for production      |
| `npm run preview` | Preview production build |
