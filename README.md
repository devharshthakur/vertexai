# VertexAI

An AI-augmented learning management system with a tutor grounded in course
material.

> **Internship project:** under active development; not production-ready.

## Contents

- [What it does](#what-it-does)
- [Technology](#technology)
- [Try the demo](#try-the-demo)
- [Documentation](#documentation)
- [Author and license](#author-and-license)

## What it does

VertexAI brings course authoring and online learning together with an AI tutor
that answers from lecture transcripts and cites its sources.

Students can enroll in courses, track lecture progress, take quizzes, submit
assignments, save notes, and earn certificates. Instructors create courses and
review learner analytics. Administrators review courses and manage accounts.

## Technology

| Area           | Stack                                    |
| -------------- | ---------------------------------------- |
| Application    | Nuxt 4, Vue 3, TypeScript                |
| UI             | Tailwind CSS 4, shadcn-vue               |
| Database       | PostgreSQL 17 with pgvector, Drizzle ORM |
| Authentication | Better Auth                              |
| AI             | Vercel AI SDK and AI Gateway             |

## Try the demo

Requirements: Docker with Compose, Node.js 20+, and pnpm 11.15+.

```bash
pnpm install
pnpm setup
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). `pnpm setup` creates
`.env` and generates the required authentication secret. Docker needs at least
4 GB of memory to build the application.

| Role       | Email                    | Password        |
| ---------- | ------------------------ | --------------- |
| Student    | `student@example.com`    | `password@1234` |
| Instructor | `instructor@example.com` | `password@1234` |
| Admin      | `admin@example.com`      | `password@1234` |

The AI tutor needs an optional `AI_GATEWAY_API_KEY`. Demo lectures work without
video files; see [SETUP.md](./SETUP.md) to add them or run the app locally.

## Documentation

- [SETUP.md](./SETUP.md) — Docker demo and local development
- [ARCHITECTURE.md](./ARCHITECTURE.md) — application structure and request flow
- [FEATURES.md](./FEATURES.md) — implemented features and plans
- [Codebase review](./docs/REVIEW.md) — guided tour
- [Product requirements](./docs/PRD/PRD.md) — project requirements

## Author and license

**Harsh Thakur** · [GitHub](https://github.com/devharshthakur/)

MIT License. See [LICENSE](./LICENSE).
