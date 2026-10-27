# Project context

VertexAI is an internship project implemented by a single developer: an AI-augmented LMS with course authoring, enrollment, progress tracking, quizzes, certificates, and a course-grounded RAG AI tutor (chat, summaries, auto-quizzes, adaptive difficulty). Three roles: student, instructor, admin. The initial build is planned for four weeks.

## Source-of-truth split

- **Product**: `docs/PRD/PRD.docx` is canonical; `docs/PRD/PRD.md` is the readable mirror — read the `.md`. The PRD governs scope, data model, API surface, roles, and the delivery plan.
- **Stack**: the repo itself (`package.json`, `nuxt.config.ts`, `components.json`). PRD §13 "Suggested Technology Stack" is **not followed** — the developer substitutes a stack they are comfortable with, which the project explicitly allows.

## Stack substitution and porting

The stack substitution is deliberate — never "correct" the repo toward the PRD.

| PRD §13 suggests                          | This project uses                                                  |
| ----------------------------------------- | ------------------------------------------------------------------ |
| React 18 + Vite SPA                       | Nuxt 4 / Vue 3 / TypeScript, full-stack SSR                        |
| TanStack Query                            | Nuxt `useFetch` / `useAsyncData`                                   |
| Node + Express/NestJS API                 | Nuxt/Nitro server routes under `server/`                           |
| Hand-rolled JWT auth                      | better-auth + Drizzle adapter                                      |
| (React UI unspecified)                    | shadcn-vue + reka-ui + Tailwind v4                                 |
| PostgreSQL + pgvector                     | PostgreSQL via Drizzle ORM (unchanged)                             |
| Python/FastAPI AI service, Redis + BullMQ | Not yet established — open decision; ask before introducing either |

When porting PRD requirements, preserve the product behavior while mapping named technologies to their substituted equivalents: "React component" → Vue SFC, "Express middleware" → Nitro middleware, "REST endpoint" → Nitro server route. The requirement-in-spirit carries; the named technology does not.

## PRD navigation

- §3 product scope (in/out for the 4-week build), §5 functional requirements
- §7 database schema, §8 API surface
- §13 suggested stack — superseded; see the table above
- §15 future enhancements — out of scope for this build
