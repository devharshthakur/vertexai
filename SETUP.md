# Setup

Two ways to run VertexAI: the container stack, which brings up the app and its database with one command, and the local development setup, which runs the Nuxt dev server against a Docker-hosted PostgreSQL.

> [!TIP]
> The steps below are in the order you need them. Each one assumes the previous step is complete.

## Contents

- [Requirements](#requirements)
- [The container stack](#the-container-stack)
- [Local development](#local-development)
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

| Tool                                          | Version         | Used for                             |
| --------------------------------------------- | --------------- | ------------------------------------ |
| [Node.js](https://nodejs.org)                 | 20 or newer     | Nuxt 4 and the project scripts       |
| [pnpm](https://pnpm.io)                       | 11.15 or newer  | Dependencies and every command here  |
| [Docker](https://docs.docker.com/get-docker/) | Current release | The database and the container stack |

You do not need a PostgreSQL install on your machine; the database runs in Docker.

## The container stack

`docker-compose.yml` defines two services: `db` (PostgreSQL with pgvector, published on `5433`) and `app` (the production build, published on `3000`). The app applies the migrations and seeds the demo content itself on the first start, so the stack is usable as soon as it is up.

```bash
pnpm install
pnpm setup
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The demo accounts are listed under [Option A: demo data](#option-a-demo-data).

`pnpm setup` creates `.env` from the template and fills in a generated auth secret. To do it by hand instead, copy `.env.example` to `.env` and put a `BETTER_AUTH_SECRET` value in it.

> [!NOTE]
> The stack itself does not need the dependencies on your machine — the image installs them. The install is only needed for `pnpm setup` and `pnpm demo:assets`.

> [!IMPORTANT]
> The image build compiles the application inside the container. Give Docker at least 4 GB of memory — with the default 2 GB limit the build is killed with `cannot allocate memory`. Docker Desktop: **Settings → Resources → Memory**.

> [!NOTE]
> `BETTER_AUTH_SECRET` is required. Without it the app refuses to start and says so in its log. `AI_GATEWAY_API_KEY` is optional: without it the AI tutor shows its unavailable state and every other feature keeps working.

### What the stack reads from `.env`

| Variable                              | Default                         | Effect                                         |
| ------------------------------------- | ------------------------------- | ---------------------------------------------- |
| `BETTER_AUTH_SECRET`                  | —                               | Required. The app exits without it             |
| `AI_GATEWAY_API_KEY`                  | empty                           | Enables the AI tutor and the lecture summaries |
| `APP_PORT`                            | `3000`                          | Host port the app is published on              |
| `APP_URL`                             | `http://localhost:3000`         | Base URL Better Auth builds its links from     |
| `POSTGRES_USER` / `_PASSWORD` / `_DB` | `vertexai`                      | Credentials for the database                   |
| `POSTGRES_PORT`                       | `5433`                          | Host port the database is published on         |
| `AI_CHAT_MODEL`                       | `openai/gpt-6-luna`             | Chat model for the tutor and the summaries     |
| `AI_EMBEDDING_MODEL`                  | `openai/text-embedding-3-large` | Model that indexes the transcripts             |

### The demo lecture videos

The videos are about 630 MB and are not in the repository. The stack mounts `public/videos/` into the container and copies the videos into the volume it serves them from, so they are never baked into the image.

Add them with:

```bash
pnpm demo:assets
docker compose up --build
```

Without them the demo still works: the lectures are seeded from their transcripts, and the player shows its "no video" state.

> [!WARNING]
> Docker Desktop only mounts directories it has been given access to. If `public/videos/` lives on a volume Docker Desktop does not share — an external drive, for example — the container sees an empty folder and the videos are missing. Move the checkout into a shared directory, or add the drive under **Settings → Resources → File sharing**.

### Working with the stack

| Command                      | Effect                                                       |
| ---------------------------- | ------------------------------------------------------------ |
| `docker compose up --build`  | Build the image and start both services                      |
| `docker compose up -d`       | Start the stack in the background                            |
| `docker compose logs -f app` | Follow the application log                                   |
| `docker compose ps`          | Show the services and their health                           |
| `docker compose down`        | Stop the stack; the database and the demo data stay          |
| `docker compose down -v`     | Stop the stack and delete the volumes: a clean demo database |

The application has a health check, so `docker compose ps` reports `healthy` once the stack is usable:

```bash
curl http://localhost:3000/api/health
```

```json
{ "status": "ok", "database": "up" }
```

A restart keeps the demo data: the seed only runs when the demo courses are missing, so the progress you made in them survives `docker compose restart`. Use `docker compose down -v` for a clean slate.

### How the stack starts

`server/plugins/bootstrap.ts` runs as a Nitro plugin, before the first request is served:

1. It checks that `DATABASE_URL` and `BETTER_AUTH_SECRET` are set and stops with a clear message if not.
2. It waits for the database to accept queries.
3. With `DB_AUTO_MIGRATE=true` it applies the committed migrations from `server/db/migrations`.
4. With `DEMO_SEED=true` it prepares the demo assets and seeds the demo content, unless the demo courses are already there.

Both steps are opt-in through environment variables, so the same image runs against an existing database without touching it.

## Local development

The steps below run the Nuxt dev server on your machine against a Docker-hosted PostgreSQL.

### Install

```bash
pnpm install
```

This also installs the Git hooks (Husky) and generates Nuxt's TypeScript types.

### Environment

Create your local environment file from the template:

```bash
cp .env.example .env
```

`pnpm setup` does the same and generates the auth secret for you:

```bash
pnpm setup
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

| Variable                                    | Purpose                                                      | Default                                    |
| ------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `COURSE_MATERIALS_DIR`                      | Absolute path where uploaded course files are stored         | `~/.local/share/vertexai/course-materials` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub sign-in; the button stays hidden until both are set   | Unset                                      |
| `AI_GATEWAY_API_KEY`                        | Vercel AI Gateway key for the AI tutor and lecture summaries | Unset                                      |
| `AI_CHAT_MODEL`                             | Optional chat model override                                 | `openai/gpt-6-luna`                        |
| `AI_EMBEDDING_MODEL`                        | Optional transcript embedding model override                 | `openai/text-embedding-3-large`            |
| `AI_EMBEDDING_MAX_INPUT_TOKENS`             | Input window of the embedding model, in tokens               | `8192`                                     |
| `AI_EMBEDDING_CHUNK_TOKENS`                 | Size of one indexed transcript chunk, in tokens              | `1500`                                     |

Without `AI_GATEWAY_API_KEY`, the tutor and summary cards show an unavailable state and every other feature keeps working. Restart the dev server after changing it, because the value is read when the Nuxt config loads. Model overrides use the gateway `provider/model` format, for example `anthropic/claude-sonnet-5.5`. The AI features send lecture transcripts to the model provider behind the gateway, so use material you are allowed to share with that provider. The AI migration enables the `vector` extension and needs the `pgvector` image already used by Compose.

A transcript can be longer than the embedding model accepts in one request, so the tutor splits it into chunks of `AI_EMBEDDING_CHUNK_TOKENS` tokens and embeds them one by one. Every chunk must fit the model's input window, so `AI_EMBEDDING_CHUNK_TOKENS` has to stay below `AI_EMBEDDING_MAX_INPUT_TOKENS`; the app refuses to start otherwise. Lower the chunk size for a finer-grained index, raise it for fewer embedding requests per lecture.

Lecture vectors are stored with 1536 dimensions, so every embedding request asks the model for that width. Vectors from different embedding models are not comparable: if you change `AI_EMBEDDING_MODEL`, clear the stored vectors with `DELETE FROM lecture_chunks;` so the tutor re-indexes the course with the new model.

Course materials — PDFs, slides, and uploaded videos — live on the filesystem, not in the database or the repository:

- The directory must be an absolute path outside this repository. The app rejects a configured path inside the checkout.
- Files survive database resets, so keep the directory backed up. Moving it without moving the files makes existing materials unavailable.
- Each upload is limited to 100 MiB.
- This storage belongs to one app instance. Multi-instance deployments need shared storage instead.

### Database

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

### Schema and demo data

Tables are defined in `server/db/schema`, and migrations are committed in `server/db/migrations`. Choose one of the two paths below.

#### Option A: demo data

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

All of the demo content lives in `demo/`: the course fixtures in `demo/courses.ts`, the asset loader in `demo/assets.ts`, the seed in `demo/seed.ts`, and the setup command in `demo/setup.ts`. The container seeds itself with that same code, so the demo behaves the same in both setups.

> [!NOTE]
> `demo:setup` builds its connection from `POSTGRES_*` and `POSTGRES_PORT`, not from `DATABASE_URL`. Keep them consistent.

##### Demo lecture assets

The seeded courses read their lectures from `public/videos/`:

```text
public/videos/<slug>/
  video.mp4
  transcript.txt
  about.md
```

The demo slugs are `typescript`, `react`, and `tailwind`. For each folder:

- Keep `transcript.txt` beside the video; it becomes the seeded lecture transcript.
- Keep `about.md` starting with `# Lecture title`; the remaining text becomes the plain-text course description.
- Add an MP4 video if you want the lecture to play. Video files are ignored by Git, so they are not in a fresh checkout, and the seed creates the lecture without a video when the file is missing. `pnpm demo:assets` downloads them.

The seed validates every folder before it changes any database row. See [`public/videos/README.md`](public/videos/README.md) for the source videos, the download archive, and the encoding guidance.

> [!IMPORTANT]
> Everything under `public/videos/` is served publicly by the app. Use demo material you are allowed to distribute.

#### Option B: empty database

If you do not need demo content, apply the committed migrations instead:

```bash
pnpm db:migrate
```

This uses the database configured by `DATABASE_URL`. Once the app is running, create an account at `/auth/signup`.

You can add the demo content later without resetting the database: add the lecture assets described in Option A, then run `pnpm db:seed`.

### Run the app

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

### Authentication

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

### Database commands

| Command            | What it does                                        |
| ------------------ | --------------------------------------------------- |
| `pnpm db:migrate`  | Apply pending migrations                            |
| `pnpm db:generate` | Write a new migration from `server/db/schema`       |
| `pnpm db:push`     | Push the schema straight to the database (dev only) |
| `pnpm db:check`    | Validate the migration history                      |
| `pnpm db:studio`   | Browse the database in Drizzle Studio               |

Migrations are read from `server/db/migrations` and applied to the database in `DATABASE_URL`.

> [!WARNING]
> `pnpm db:push` syncs `server/db/schema` directly and writes no migration files, so Drizzle's history no longer reflects the database. Use it only for throwaway local databases; use `db:generate` followed by `db:migrate` for anything you keep.
