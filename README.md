# VertexAI

An AI-augmented learning management system with a tutor that knows your course.

> **Under active development.** The project is early — nothing here is production-ready, and there are no releases yet.

## Table of Contents

- [What is VertexAI](#what-is-vertexai)
- [Who it's for](#who-its-for)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Local development](#local-development)
- [Project documentation](#project-documentation)
- [Author](#author)
- [License](#license)

## What is VertexAI

VertexAI is a learning management system built around one idea: the AI tutor should answer from _your_ course material, not from a generic chatbot.

The goal is the familiar LMS loop — courses, lectures, assessments, certificates — together with a tutor that reads the course before it replies and shows you where its answer came from. The LMS foundations and the course-grounded AI tutor work today; adaptive study aids and instructor analytics are planned. See [FEATURES.md](./FEATURES.md) for the breakdown.

## Who it's for

- **Students** who want an LMS that actually answers their questions, grounded in the material they were given.
- **Instructors** who author courses and need visibility into where learners struggle.
- **Admins** who approve courses, moderate content, and manage the platform.

## Features

The app currently covers course authoring, a searchable catalog, enrollment, lecture progress, quizzes, assignments, notes, bookmarks, learning streaks, certificates, badges, admin course approvals, a course-grounded AI tutor, and cached lecture summaries. Adaptive study aids and instructor analytics are planned.

[FEATURES.md](./FEATURES.md) lists what works today and what is still to come.

## Tech stack

| Layer       | Choice                                                |
| ----------- | ----------------------------------------------------- |
| Framework   | Nuxt 4, Vue 3, TypeScript                             |
| UI          | Tailwind CSS 4, shadcn-vue, Lucide icons, Video.js 10 |
| Data        | PostgreSQL 17 (Docker Compose, pgvector), Drizzle ORM |
| AI          | Vercel AI Gateway through the Vercel AI SDK 7         |
| Auth        | Better Auth (email + password, optional GitHub)       |
| Validation  | Zod, with schemas shared by client and server         |
| Client data | Nuxt `useFetch`, TanStack Vue Query                   |
| Tooling     | ESLint, Prettier, Husky, nano-staged                  |

## Quick start

```bash
pnpm install
pnpm setup
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

`pnpm setup` creates `.env` from the template and fills in a generated auth secret. To do it by hand instead, copy `.env.example` to `.env` and put a `BETTER_AUTH_SECRET` value in it.

The stack comes up ready to use: the database migrations are applied and the demo content is seeded, so there is nothing left to install or run.

> [!IMPORTANT]
> The image build compiles the app inside the container, so Docker needs at least 4 GB of memory. Lower the Docker Desktop memory limit and the build is killed with `cannot allocate memory`.

Demo accounts, all using the password `password@1234`:

| Role       | Email                    | What it shows                                   |
| ---------- | ------------------------ | ----------------------------------------------- |
| Student    | `student@example.com`    | Learning, quizzes, notes, and the AI tutor      |
| Instructor | `instructor@example.com` | Authoring courses, lectures, quizzes, materials |
| Admin      | `admin@example.com`      | The course approval queue                       |

The lecture videos are not in the repository — they are about 630 MB. Add them with:

```bash
pnpm demo:assets
```

Without them the demo still works: the lectures are seeded from their transcripts and the player shows its "no video" state.

Stop the stack with `docker compose down`, or reset it to a clean demo database with `docker compose down -v`.

## Local development

Follow [SETUP.md](./SETUP.md) to run the app against a local Docker-hosted PostgreSQL with the Nuxt dev server, then read [ARCHITECTURE.md](./ARCHITECTURE.md) to see how the code is organized.

For a guided tour of the codebase, see [docs/REVIEW.md](./docs/REVIEW.md).

## Project documentation

- [SETUP.md](./SETUP.md) — local development setup and the container stack
- [ARCHITECTURE.md](./ARCHITECTURE.md) — how the application is built
- [FEATURES.md](./FEATURES.md) — what works today and what is planned
- [docs/REVIEW.md](./docs/REVIEW.md) — a guided tour of the codebase
- [docs/PRD/PRD.docx](./docs/PRD/PRD.docx) — the product requirements this is built from (readable copies in [PRD.md](./docs/PRD/PRD.md) and [PRD.html](./docs/PRD/PRD.html))

## Author

**Harsh Thakur** — [GitHub](https://github.com/devharshthakur/) · [harshprojects2002@outlook.com](mailto:harshprojects2002@outlook.com)

## License

MIT License — Copyright (c) 2026 Harsh Thakur. Full text in [LICENSE](./LICENSE).
