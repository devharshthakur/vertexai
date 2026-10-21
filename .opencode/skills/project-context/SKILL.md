---
name: project-context
description: VertexAI project context — what to build comes from docs/PRD, but the tech stack is deliberately substituted. Load for scope, requirements, data model, API, architecture, or stack questions, and before acting on any technology the PRD names.
---

# Project context

VertexAI is an AI-augmented LMS — course authoring, enrollment, progress tracking, quizzes, certificates — with a course-grounded RAG AI tutor (chat, summaries, auto-quizzes, adaptive difficulty). Three roles: student, instructor, admin. Single-developer, 4-week build.

## Source-of-truth split

- **Product**: `docs/PRD.docx` is canonical; `docs/PRD.md` is the readable mirror — read the `.md`. The PRD governs scope, data model, API surface, roles, and the delivery plan.
- **Stack**: the repo itself (`package.json`, `nuxt.config.ts`, `components.json`). PRD §13 "Suggested Technology Stack" is **not followed** — the developer substitutes a stack they are comfortable in, which the project explicitly allows.

## Stack substitution (deliberate — never "correct" the repo toward the PRD)

| PRD §13 suggests                          | This project uses                                                  |
| ----------------------------------------- | ------------------------------------------------------------------ |
| React 18 + Vite SPA                       | Nuxt 4 / Vue 3 / TypeScript, full-stack SSR                        |
| TanStack Query                            | Nuxt `useFetch` / `useAsyncData`                                   |
| Node + Express/NestJS API                 | Nuxt/Nitro server routes under `server/`                           |
| Hand-rolled JWT auth                      | better-auth + Drizzle adapter                                      |
| (React UI unspecified)                    | shadcn-vue + reka-ui + Tailwind v4                                 |
| PostgreSQL + pgvector                     | PostgreSQL via Drizzle ORM (unchanged)                             |
| Python/FastAPI AI service, Redis + BullMQ | Not yet established — open decision; ask before introducing either |

When the PRD names a technology, map it to the substituted equivalent: "React component" → Vue SFC, "Express middleware" → Nitro middleware, "REST endpoint" → Nitro server route. The requirement-in-spirit carries; the named technology does not.

## PRD navigation

- §3 product scope (in/out for the 4-week build), §5 functional requirements
- §7 database schema, §8 API surface
- §13 suggested stack — superseded; see the table above
- §15 future enhancements — out of scope for this build
