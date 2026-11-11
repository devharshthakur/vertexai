# VertexAI

An AI-augmented learning management system with a tutor that knows your course.

> **Under active development.** The project is early — nothing here is production-ready, and there are no releases yet.

## Table of Contents

- [What is VertexAI](#what-is-vertexai)
- [Who it's for](#who-its-for)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project documentation](#project-documentation)
- [Author](#author)
- [License](#license)

## What is VertexAI

VertexAI is a learning management system built around one idea: the AI tutor should answer from _your_ course material, not from a generic chatbot.

The goal is the familiar LMS loop — courses, lectures, assessments, certificates — together with a tutor that reads the course before it replies and shows you where its answer came from. The LMS foundations work today; the tutor and assessment features are planned. See [FEATURES.md](./FEATURES.md) for the breakdown.

## Who it's for

- **Students** who want an LMS that actually answers their questions, grounded in the material they were given.
- **Instructors** who author courses and need visibility into where learners struggle.
- **Admins** who approve courses, moderate content, and manage the platform.

## Features

The app currently covers course authoring, a searchable catalog, enrollment, lecture progress, notes, bookmarks, learning streaks, and admin course approvals. AI tutoring, assessments, certificates, badges, and analytics are planned.

[FEATURES.md](./FEATURES.md) lists what works today and what is still to come.

## Tech stack

| Layer       | Choice                                                |
| ----------- | ----------------------------------------------------- |
| Framework   | Nuxt 4, Vue 3, TypeScript                             |
| UI          | Tailwind CSS 4, shadcn-vue, Lucide icons, Video.js 10 |
| Data        | PostgreSQL 17 (Docker Compose), Drizzle ORM           |
| Auth        | Better Auth (email + password, optional GitHub)       |
| Validation  | Zod, with schemas shared by client and server         |
| Client data | Nuxt `useFetch`, TanStack Vue Query                   |
| Tooling     | ESLint, Prettier, Husky, nano-staged                  |

## Getting started

Follow [SETUP.md](./SETUP.md) to run the app locally, then read [ARCHITECTURE.md](./ARCHITECTURE.md) to see how the code is organized.

## Project documentation

- [SETUP.md](./SETUP.md) — local development setup
- [ARCHITECTURE.md](./ARCHITECTURE.md) — how the application is built
- [FEATURES.md](./FEATURES.md) — what works today and what is planned
- [docs/PRD/PRD.docx](./docs/PRD/PRD.docx) — the product requirements this is built from (readable copy in [PRD.html](./docs/PRD/PRD.html))

## Author

**Harsh Thakur** — [GitHub](https://github.com/devharshthakur/) · [harshprojects2002@outlook.com](mailto:harshprojects2002@outlook.com)

## License

MIT License — Copyright (c) 2026 Harsh Thakur. Full text in [LICENSE](./LICENSE).
