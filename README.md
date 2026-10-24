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

It brings the familiar LMS loop — courses, lectures, assignments, quizzes, certificates — together with a tutor that reads the course before it replies and shows you where its answer came from.

## Who it's for

- **Students** who want an LMS that actually answers their questions, grounded in the material they were given.
- **Instructors** who author courses and need visibility into where learners struggle.
- **Admins** who approve courses, moderate content, and manage the platform.

## Features

- Course authoring, a searchable catalog, and enrollment
- Lectures with progress tracking, notes, and bookmarks
- Assignments, auto-graded quizzes, certificates, streaks, and badges
- An AI tutor grounded in course material, with source citations
- AI-generated lecture summaries, flashcards, and quiz drafts
- Explanations that adapt to a beginner, intermediate, or advanced level
- Instructor analytics, plus an admin layer for approvals and moderation

## Tech stack

| Layer     | Choice                                   |
| --------- | ---------------------------------------- |
| Framework | Nuxt 4, Vue 3, TypeScript                |
| UI        | Tailwind CSS 4, shadcn-vue, Lucide icons |
| Data      | PostgreSQL (Docker Compose), Drizzle ORM |
| Auth      | Better Auth (email + password, GitHub)   |
| Forms     | TanStack Form, Zod                       |
| Tooling   | ESLint, Prettier, Husky                  |

## Getting started

Follow **[SETUP.md](./SETUP.md)** to run the app locally: database, environment, migrations, and auth.

## Project documentation

- [SETUP.md](./SETUP.md) — local development setup
- [docs/PRD.md](./docs/PRD.md) — the product requirements document this is built from

## Author

**Harsh Thakur** — [GitHub](https://github.com/devharshthakur/) · [harshprojects2002@outlook.com](mailto:harshprojects2002@outlook.com)

## License

MIT License — Copyright (c) 2026 Harsh Thakur. Full text in [LICENSE](./LICENSE).
