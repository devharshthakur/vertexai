# VertexAI

An AI-augmented learning management system with a tutor that knows your course.

> **Under active development.** The project is early — nothing here is production-ready, and there are no releases yet.

## What is VertexAI?

VertexAI is a learning management system built around one idea: the AI tutor should answer from _your_ course material, not from a generic chatbot. It is designed to bring the familiar LMS loop — courses, lectures, assignments, quizzes, certificates — together with a tutor that reads the course before it replies and shows you where its answer came from.

Planned capabilities:

- Course authoring, a searchable catalog, and enrollment
- Lectures with progress tracking, notes, and bookmarks
- Assignments, auto-graded quizzes, certificates, streaks, and badges
- An AI tutor grounded in course material, with source citations
- AI-generated lecture summaries, flashcards, and quiz drafts
- Explanations that adapt to a beginner, intermediate, or advanced level
- Instructor analytics, plus an admin layer for approvals and moderation

## Stack

What the repository contains today:

| Layer     | Choice                                   |
| --------- | ---------------------------------------- |
| Framework | Nuxt 4, Vue 3, TypeScript                |
| UI        | Tailwind CSS 4, shadcn-vue, Lucide icons |
| Tooling   | ESLint, Prettier, Husky                  |

What is being built next:

- **Better Auth** for sessions and roles, instead of hand-rolled auth
- **PostgreSQL with pgvector** for LMS data and course-level semantic search
- **Redis** for caching and background jobs
- A **RAG pipeline** that grounds the AI tutor in each course's own material

## Status

VertexAI is being built in the open from the LMS-AI product requirements document, kept in [`docs/PRD.md`](docs/PRD.md). The design is still moving, so expect frequent changes and breaking changes to the structure. Follow the repository to see how it progresses.

## Author

**Harsh Thakur** — [GitHub](https://github.com/devharshthakur/) · [harshprojects2002@outlook.com](mailto:harshprojects2002@outlook.com)

## License

[MIT](./LICENSE)
