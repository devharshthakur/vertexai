# Setup

Run VertexAI on your machine: install the dependencies, start a Docker-hosted PostgreSQL database, apply the schema, and open the Nuxt dev server.

> [!TIP]
> The steps below are in the order you need them. Each one assumes the previous step is complete.

## Contents

- [Requirements](#requirements)
- [Install](#install)
- [Environment](#environment)
- [Database](#database)
- [Schema and demo data](#schema-and-demo-data)
  - [Option A: demo data](#option-a-demo-data)
  - [Option B: empty database](#option-b-empty-database)
- [Run the app](#run-the-app)
- [Authentication](#authentication)
- [Database commands](#database-commands)

## Requirements

| Tool                                          | Version         | Used for                            |
| --------------------------------------------- | --------------- | ----------------------------------- |
| [Node.js](https://nodejs.org)                 | 20 or newer     | Nuxt 4 and the project scripts      |
| [pnpm](https://pnpm.io)                       | 11.15 or newer  | Dependencies and every command here |
| [Docker](https://docs.docker.com/get-docker/) | Current release | The local PostgreSQL container      |

You do not need a PostgreSQL install on your machine; the database runs in Docker.

## Install

```bash
pnpm install
```

This also installs the Git hooks (Husky) and generates Nuxt's TypeScript types.

## Environment

Create your local environment file from the template:

```bash
cp .env.example .env
```

### Required variables

| Variable                                              | Purpose                                               | Default in `.env.example`                                |
| ----------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credentials for the Docker database                   | `vertexai`                                               |
| `POSTGRES_PORT`                                       | Host port the database is published on                | `5433`                                                   |
| `DATABASE_URL`                                        | Connection string used by Drizzle and the Nuxt server | `postgresql://vertexai:vertexai@localhost:5433/vertexai` |
| `BETTER_AUTH_SECRET`                                  | Secret Better Auth uses to sign sessions              | A placeholder; generate your own                         |
| `BETTER_AUTH_URL`                                     | Base URL the app is served from                       | `http://localhost:5173`                                  |

> [!TIP]
> Generate the auth secret with `openssl rand -base64 32` and paste the result into `BETTER_AUTH_SECRET`.

> [!NOTE]
> `POSTGRES_PORT` defaults to `5433` so the container does not clash with a PostgreSQL server that may already be listening on `5432`.

> [!IMPORTANT]
> Keep these values consistent. The port in `DATABASE_URL` must match `POSTGRES_PORT`, and `BETTER_AUTH_URL` must use the port the dev server runs on.

### Optional variables

| Variable                                    | Purpose                                                    | Default                                    |
| ------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| `COURSE_MATERIALS_DIR`                      | Absolute path where uploaded course files are stored       | `~/.local/share/vertexai/course-materials` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub sign-in; the button stays hidden until both are set | Unset                                      |

Course materials — PDFs, slides, and uploaded videos — live on the filesystem, not in the database or the repository:

- The directory must be an absolute path outside this repository. The app rejects a configured path inside the checkout.
- Files survive database resets, so keep the directory backed up. Moving it without moving the files makes existing materials unavailable.
- Each upload is limited to 100 MiB.
- This storage belongs to one app instance. Multi-instance deployments need shared storage instead.

## Database

Start PostgreSQL in Docker:

```bash
pnpm db:up
```

The container publishes the database on `localhost:5433` by default and keeps its data in a Docker volume managed by the `vertexai` Compose project.

| Command         | Effect                                                           |
| --------------- | ---------------------------------------------------------------- |
| `pnpm db:start` | Start an existing, stopped container; data kept                  |
| `pnpm db:stop`  | Stop the container; data kept                                    |
| `pnpm db:down`  | Remove the container and network; the named volume and data stay |
| `pnpm db:logs`  | Follow the database logs                                         |

> [!NOTE]
> `db:up` creates the container if it does not exist; `db:start` only restarts one that already exists. Use `db:up` on a fresh checkout.

## Schema and demo data

Tables are defined in `server/db/schema`, and migrations are committed in `server/db/migrations`. Choose one of the two paths below.

### Option A: demo data

The demo dataset is the fastest way to see a populated app. Add the lecture videos described below first, then run:

```bash
pnpm demo:setup
```

> [!WARNING]
> This deletes the `vertexai` Docker Compose project's containers and volumes, including all existing database data. Running the command is your approval for that reset.

The command validates the demo assets first, then removes the Compose project and its volumes, starts a fresh database, applies migrations, and seeds the demo. It refuses to run when `NODE_ENV=production`.

Demo accounts, all using the password `password@1234`:

| Role       | Email                    |
| ---------- | ------------------------ |
| Admin      | `admin@example.com`      |
| Instructor | `instructor@example.com` |
| Student    | `student@example.com`    |

The seed creates three approved courses and enrolls the demo student. Running `pnpm db:seed` re-applies the demo password, signs those accounts out, and rebuilds the demo courses and enrollment without touching the container or its volume.

> [!NOTE]
> `demo:setup` builds its connection from `POSTGRES_*` and `POSTGRES_PORT`, not from `DATABASE_URL`. Keep them consistent.

#### Demo lecture assets

The seeded courses read their lectures from `public/videos/`:

```text
public/videos/<slug>/
  video.mp4
  transcript.txt
  about.md
```

The demo slugs are `typescript`, `react`, and `tailwind`. For each folder:

- Add exactly one MP4 video. The seed prefers `video.mp4` and otherwise uses the first `.mp4` file. Video files are ignored by Git, so add them locally before seeding.
- Keep `about.md` starting with `# Lecture title`; the remaining text becomes the plain-text course description.
- Keep `transcript.txt` beside the video; it becomes the seeded lecture transcript.

The seed validates every folder before it changes any database row. See [`public/videos/README.md`](public/videos/README.md) for the source videos, the download archive, and the encoding guidance.

> [!IMPORTANT]
> Everything under `public/videos/` is served publicly by the app. Use demo material you are allowed to distribute.

### Option B: empty database

If you do not need demo content, apply the committed migrations instead:

```bash
pnpm db:migrate
```

This uses the database configured by `DATABASE_URL`. Once the app is running, create an account at `/auth/signup`.

You can add the demo content later without resetting the database: add the lecture assets described in Option A, then run `pnpm db:seed`.

## Run the app

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

Check that the app can reach the database:

```bash
curl http://localhost:5173/api/health
```

A healthy setup returns `200` with:

```json
{ "status": "ok", "database": "up" }
```

When the probe fails, the endpoint returns `503` with `{ "status": "error", "database": "down" }`. Check the container with `pnpm db:logs`.

## Authentication

[Better Auth](https://better-auth.com) handles sign-in, sessions, and roles. The server instance lives in `server/utils/auth.ts` and is mounted on `/api/auth/**` by `server/api/auth/[...all].ts`.

- Email and password sign-in works without extra configuration.
- GitHub sign-in is optional: set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, then register the OAuth app with the callback URL `http://localhost:5173/api/auth/callback/github`. The button appears only when both values are set.
- New accounts receive the `student` role.

Create the first admin from the command line. The database must be running and migrated:

```bash
pnpm dlx auth@1.7.18 create-admin --config server/utils/auth.ts \
  --email you@example.com --name "Your Name" --role admin
```

> [!NOTE]
> Keep the `auth` CLI version in these commands aligned with the installed `better-auth` version (`1.7.18` in `package.json`).

## Database commands

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `pnpm db:migrate`  | Apply pending migrations                      |
| `pnpm db:generate` | Write a new migration from `server/db/schema` |
| `pnpm db:check`    | Validate the migration history                |
| `pnpm db:studio`   | Browse the database in Drizzle Studio         |

Migrations are read from `server/db/migrations` and applied to the database in `DATABASE_URL`.
