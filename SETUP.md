# Setup

Local development setup for VertexAI.

## Table of Contents

- [Requirements](#requirements)
- [Install](#install)
- [Environment](#environment)
- [Database](#database)
- [Migrations](#migrations)
- [Seed data](#seed-data)
- [Authentication](#authentication)
- [Run the app](#run-the-app)
- [Scripts](#scripts)

## Requirements

- [Node.js](https://nodejs.org) 20 or newer
- [pnpm](https://pnpm.io) 11.15 or newer
- [Docker](https://docs.docker.com/get-docker/) with Docker Compose

## Install

```bash
pnpm install
```

## Environment

Copy the template and edit it:

```bash
cp .env.example .env
```

| Variable                                              | Purpose                                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Local database credentials                                              |
| `POSTGRES_PORT`                                       | Host port for the database (`5433` by default)                          |
| `DATABASE_URL`                                        | Connection string used by Drizzle and the Nuxt server                   |
| `BETTER_AUTH_SECRET`                                  | Secret used to sign sessions                                            |
| `BETTER_AUTH_URL`                                     | Base URL the app is served from                                         |
| `COURSE_MATERIALS_DIR`                                | Optional absolute path outside the repository for uploaded course files |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`           | Optional GitHub OAuth credentials                                       |

`POSTGRES_PORT` defaults to `5433` so it does not clash with a PostgreSQL already listening on `5432`.

Course PDFs, PowerPoint slides, and videos are stored on the server's local filesystem, not in the database or repository. Set `COURSE_MATERIALS_DIR` to an absolute path outside the repository to choose the directory; by default, files go to `~/.local/share/vertexai/course-materials`. Keep this directory persistent and backed up; changing its path without moving existing files makes those materials unavailable. Each upload is limited to 100 MiB. This storage is local to one app instance and is not suitable for multi-instance deployments without shared storage.

Generate the auth secret with:

```bash
openssl rand -base64 32
```

## Database

The database runs in Docker. Start it:

```bash
pnpm db:up # start PostgreSQL on localhost:5433
```

Once the container exists, `db:start`/`db:stop` resume or pause it without removing the container or its data:

```bash
pnpm db:start # start an existing (stopped) db container
pnpm db:stop  # stop the db container, keeping the volume
```

## Migrations

Tables are defined in `server/db/schema`, and `drizzle.config.ts` reads the same `DATABASE_URL` the Nuxt server uses:

```bash
pnpm db:generate # write a migration from server/db/schema
pnpm db:migrate  # apply pending migrations
pnpm db:check    # validate the migration history
pnpm db:studio   # browse the database
```

`GET /api/health` reports whether the database is reachable: `200` with `{ "status": "ok", "database": "up" }` when it is, `503` with `{ "status": "error", "database": "down" }` when the probe fails.

## Seed data

Create the demo accounts, plus a seeded approved course with a module and lecture:

```bash
pnpm db:seed
```

| Role       | Email                    |
| ---------- | ------------------------ |
| Admin      | `admin@example.com`      |
| Instructor | `instructor@example.com` |
| Student    | `student@example.com`    |

Every demo account uses the predefined password `password@1234`. Re-running the seed re-applies that password and signs the accounts out. The script only makes sense locally, so it refuses to run when `NODE_ENV=production`.

Running `pnpm setup` or `pnpm demo:setup` immediately deletes all data in the `vertexai` Docker Compose project, including its volumes, then recreates and seeds the database. Running either command is treated as approval for this destructive reset.

### Demo lecture assets

The seeded courses read their lectures from `public/videos/`:

```text
public/videos/<slug>/
  video.mp4
  transcript.txt
  about.md
```

The demo slugs are `typescript`, `react`, and `tailwind`. Add one MP4 video per folder; the seed prefers `video.mp4` and otherwise takes the first `.mp4` file. Video files are ignored by Git, so add them locally before seeding. `about.md` must start with `# Lecture title`; the remaining text becomes the plain-text course description. `transcript.txt` becomes the seeded lecture transcript. The seed validates every folder before changing database rows. See [`public/videos/README.md`](public/videos/README.md) for the format.

Everything under `public/videos/` is publicly served by the app. Use demo assets you are allowed to distribute; this is not private course delivery. The `pnpm setup` and `pnpm demo:setup` commands check these files before resetting the database.

## Authentication

[Better Auth](https://better-auth.com) handles sign-in, sessions and roles. The server instance lives in `server/utils/auth.ts` and is mounted on `/api/auth/**` by `server/api/auth/[...all].ts`.

Sign-in works with email and password out of the box. GitHub sign-in is optional: set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env` and the button appears on the login page. Register the OAuth app with the callback URL `http://localhost:5173/api/auth/callback/github`.

| Route                 | What it is                              |
| --------------------- | --------------------------------------- |
| `/auth/login`         | Sign in with email, password or GitHub  |
| `/auth/signup`        | Create an account                       |
| `/dashboard`          | A page that requires a session          |
| `/api/auth/**`        | The Better Auth API                     |
| `/api/auth-providers` | The sign-in methods this deployment has |

New accounts get the `student` role. Admins are created with the Better Auth CLI and can promote accounts to `instructor` or `admin`:

```bash
pnpm dlx auth@1.7.11 create-admin --config server/utils/auth.ts \
  --email you@example.com --name "Your Name" --role admin
```

The auth tables (`users`, `sessions`, `accounts`, `verifications`) are generated by the Better Auth CLI into `server/db/schema/auth.ts`. Regenerate them after changing the auth config or its plugins, then run the usual Drizzle workflow:

```bash
pnpm dlx auth@1.7.11 generate --config server/utils/auth.ts \
  --output server/db/schema/auth.ts -y
pnpm db:generate
pnpm db:migrate
```

## Run the app

```bash
pnpm dev
```

The app is served on [http://localhost:5173](http://localhost:5173).

## Scripts

| Script             | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `pnpm dev`         | Start the dev server on port 5173               |
| `pnpm build`       | Build for production                            |
| `pnpm preview`     | Serve the production build on port 4173         |
| `pnpm validate`    | Run format check, lint and typecheck            |
| `pnpm lint`        | Lint with ESLint                                |
| `pnpm format`      | Format with Prettier                            |
| `pnpm typecheck`   | Typecheck with `vue-tsc`                        |
| `pnpm deps:update` | Bump deps, validate, commit `chore: bump deps`  |
| `pnpm db:up`       | Start the database container                    |
| `pnpm db:down`     | Stop and remove the database container          |
| `pnpm db:start`    | Start an existing (stopped) database container  |
| `pnpm db:stop`     | Stop the database container, keeping the volume |
| `pnpm db:logs`     | Follow the database logs                        |
| `pnpm db:generate` | Write a migration from `server/db/schema`       |
| `pnpm db:migrate`  | Apply pending migrations                        |
| `pnpm db:check`    | Validate the migration history                  |
| `pnpm db:studio`   | Browse the database                             |
| `pnpm clean`       | Remove generated Nuxt output                    |
