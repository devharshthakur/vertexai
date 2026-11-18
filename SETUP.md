# Setup

Choose the Docker demo for the fastest start, or run the Nuxt development
server locally against a Docker database.

## Contents

- [Requirements](#requirements)
- [Docker demo](#docker-demo)
- [Manual development setup](#manual-development-setup)
- [Useful commands](#useful-commands)
- [Configuration](#configuration)

## Requirements

| Tool                                                       | Version        |
| ---------------------------------------------------------- | -------------- |
| [Docker](https://docs.docker.com/get-docker/) with Compose | Current        |
| [Node.js](https://nodejs.org/)                             | 20 or newer    |
| [pnpm](https://pnpm.io/)                                   | 11.15 or newer |

Node.js and pnpm are only needed for manual setup and the `pnpm setup` helper.
PostgreSQL runs in Docker.

## Docker demo

From the project root:

```bash
pnpm install
pnpm setup
docker compose up --build
```

`pnpm setup` creates `.env` from `.env.example` and generates the required
`BETTER_AUTH_SECRET`. It keeps an existing `.env`. Docker builds the application
and starts PostgreSQL, applies migrations, and seeds demo data.

Open [http://localhost:3000](http://localhost:3000). The first build may take a
few minutes; give Docker at least 4 GB of memory.

| Role       | Email                    | Password        |
| ---------- | ------------------------ | --------------- |
| Student    | `student@example.com`    | `password@1234` |
| Instructor | `instructor@example.com` | `password@1234` |
| Admin      | `admin@example.com`      | `password@1234` |

An `AI_GATEWAY_API_KEY` is optional. Without it, AI features are unavailable;
the rest of the application works.

Stop the stack with `docker compose down`. This keeps database and uploaded
material data. To reset the demo database and volumes, run
`docker compose down -v`—this deletes their contents.

## Manual development setup

### 1. Install and configure

```bash
pnpm install
pnpm setup
```

The setup command creates `.env` and generates an authentication secret. It
does not overwrite an existing `.env`.

### 2. Start PostgreSQL

```bash
pnpm db:up
```

Compose publishes PostgreSQL on `localhost:5433` by default. The `.env` template
sets `DATABASE_URL` to match.

### 3. Prepare the database

To use the demo data:

```bash
pnpm demo:setup
```

> [!WARNING]
> `pnpm demo:setup` deletes the `vertexai` Compose project's containers and
> volumes, including existing database data, before it seeds the demo.

To use an empty database instead:

```bash
pnpm db:migrate
```

With an empty database, create an account at `/auth/signup`.

### 4. Run the app

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). Check the database
connection at [http://localhost:5173/api/health](http://localhost:5173/api/health).

## Useful commands

| Command            | Purpose                                         |
| ------------------ | ----------------------------------------------- |
| `pnpm db:up`       | Start PostgreSQL                                |
| `pnpm db:stop`     | Stop PostgreSQL and keep its data               |
| `pnpm db:logs`     | Follow PostgreSQL logs                          |
| `pnpm db:migrate`  | Apply pending migrations                        |
| `pnpm db:seed`     | Add or refresh demo data in a migrated database |
| `pnpm demo:assets` | Download optional demo lecture videos           |
| `pnpm validate`    | Run formatting, lint, and type checks           |

> [!WARNING]
> `pnpm db:push` changes a database without creating migration files. Use it
> only with disposable development databases.

## Configuration

`.env.example` documents the available variables. Key settings:

| Variable                                   | Required     | Purpose                                                           |
| ------------------------------------------ | ------------ | ----------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                       | Yes          | Signs authentication sessions; `pnpm setup` generates it          |
| `DATABASE_URL`                             | Manual setup | PostgreSQL connection used by the app and Drizzle                 |
| `POSTGRES_PORT`                            | No           | Host database port; defaults to `5433`                            |
| `AI_GATEWAY_API_KEY`                       | No           | Enables AI tutor and generation features                          |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | No           | Enables GitHub sign-in                                            |
| `COURSE_MATERIALS_DIR`                     | No           | Absolute path for uploaded files; defaults outside the repository |

Keep `DATABASE_URL`'s port consistent with `POSTGRES_PORT`. The development
server uses port `5173`; the Docker app uses port `3000`.

### Demo videos and uploads

Demo lecture videos are optional and excluded from the repository. Run
`pnpm demo:assets` to download them. The transcripts and course descriptions are
enough to seed lectures without playable video.

Uploaded course materials are stored on disk, not in PostgreSQL. The configured
directory must be an absolute path outside the repository. Back it up
separately from the database.
