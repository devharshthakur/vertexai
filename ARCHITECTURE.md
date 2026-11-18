# Architecture

VertexAI is a Nuxt application with a Vue client, Nitro API, PostgreSQL
database, and optional AI services.

## Contents

- [System overview](#system-overview)
- [Code layout](#code-layout)
- [Request flow](#request-flow)
- [Data and file storage](#data-and-file-storage)
- [Authentication and authorization](#authentication-and-authorization)
- [AI tutor](#ai-tutor)
- [Development checks](#development-checks)

## System overview

| Layer                     | Responsibility                                        |
| ------------------------- | ----------------------------------------------------- |
| Nuxt and Vue              | Server-rendered pages, client navigation, and UI      |
| Nitro routes              | HTTP endpoints, authentication guards, and validation |
| Services                  | Business rules and database operations                |
| Drizzle ORM               | PostgreSQL queries and migrations                     |
| Better Auth               | Sign-in, sessions, and account roles                  |
| Vercel AI SDK and Gateway | Optional tutor, summaries, and quiz drafts            |

In Docker Compose, the application and PostgreSQL run as separate services.
The app applies migrations and seeds the demo during startup. AI configuration
is optional.

## Code layout

| Path               | Contents                                                 |
| ------------------ | -------------------------------------------------------- |
| `app/pages/`       | File-based application pages                             |
| `app/components/`  | Shared and feature-specific UI                           |
| `app/composables/` | Reusable client-side state and behavior                  |
| `server/api/`      | Nitro API route handlers                                 |
| `server/services/` | Business logic, access rules, and queries                |
| `server/db/`       | Drizzle connection, schema, and migrations               |
| `server/utils/`    | Authentication, validation, and error handling           |
| `shared/`          | Zod schemas, types, and values used by client and server |
| `demo/`            | Demo fixtures, asset preparation, and seeding            |

Use `@/` for `app/`, `#server/` for `server/`, and `#shared/` for `shared/`.
App components and composables are imported explicitly; Nuxt composables remain
auto-imported.

## Request flow

1. A page requests data from a Nitro endpoint under `/api/`.
2. The route applies an explicit session or role guard where needed.
3. The route validates input against shared Zod schemas.
4. A service applies business rules and reads or writes data through Drizzle.
5. The route maps known service errors to HTTP responses.

Routes stay thin; business logic belongs in services. Every protected API route
must enforce access itself. Client-side route middleware improves navigation but
does not protect APIs. There is no global API auth middleware because Better
Auth owns `/api/auth/**`, and some endpoints are public.

## Data and file storage

PostgreSQL stores account data, courses, enrollments, progress, assessments,
achievements, and indexed lecture passages. Drizzle schemas live in
`server/db/schema/`; export new schema modules from `index.ts`.

Uploaded course materials and assignment submissions are stored on disk, with
metadata in PostgreSQL. `COURSE_MATERIALS_DIR` defaults to
`~/.local/share/vertexai/course-materials` and must be outside the repository.
This storage is local to one app instance.

Files in `public/` are served directly. Demo transcripts and descriptions are
committed; large video files are optional. Only use public materials you may
redistribute.

## Authentication and authorization

Better Auth handles email/password sessions and optional GitHub OAuth. New
accounts default to the `student` role; `instructor` and `admin` access is
checked by server-side guards and services.

Protected routes call `requireSession` or `requireRole`. Public routes that
change behavior for signed-in users can use `optionalSession`. Authorization is
enforced on the server, not by client middleware.

## AI tutor

The AI features use the Vercel AI SDK through the Vercel AI Gateway. The tutor
retrieves relevant chunks from course lecture transcripts and streams answers
with citations. Lecture summaries are generated on demand and cached; quiz
drafts are suggestions for instructors and are not saved automatically.

Transcript chunks and their vectors are stored in PostgreSQL with pgvector.
Indexing happens when a course is first used. Without `AI_GATEWAY_API_KEY`, AI
features report unavailable while other app features continue to work.

## Development checks

Run `pnpm validate` for formatting, lint, and Nuxt type checks. The project has
no configured test runner. Docker needs at least 4 GB of memory to build the
application image.
