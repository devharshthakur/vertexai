# Architecture

VertexAI is a Nuxt 4 application: Vue 3 pages rendered on the server, a Nitro API layer, PostgreSQL, and Better Auth. This guide explains how the code is arranged, how a request moves through it, and which rules keep the layers separate.

> [!NOTE]
> This describes the repository as it exists today. Product scope that has not been built yet is listed at the end.

## At a glance

| Concern     | Choice                                                             |
| ----------- | ------------------------------------------------------------------ |
| Framework   | Nuxt 4 with Nitro, Vue 3, TypeScript                               |
| UI          | Tailwind CSS 4, shadcn-vue, Lucide icons, Video.js 10              |
| Data        | PostgreSQL 17 (`pgvector` image), Drizzle ORM                      |
| AI          | Vercel AI Gateway through the Vercel AI SDK 7 (optional)           |
| Auth        | Better Auth 1.7 with the admin plugin                              |
| Validation  | Zod schemas shared by client and server                            |
| Client data | Nuxt `useFetch` for page data, TanStack Vue Query for shared cache |
| Tooling     | ESLint, Prettier, Husky and nano-staged                            |

Nuxt configuration lives in `nuxt.config.ts`. Auto-import scanning for this project's components and composables is turned off (`components.dirs: []`, `imports.scan: false`), so those imports are written out explicitly; Nuxt's own composables such as `useFetch`, `useState`, and `definePageMeta` remain auto-imported.

## System shape

- **Browser to Nuxt.** Pages render on the server, hydrate in the browser, and call `/api/**`. The Better Auth session cookie identifies the user in both places.
- **API to data.** A Nitro route delegates to a service, the service uses Drizzle, and Drizzle talks to the PostgreSQL container from `docker-compose.yml`.
- **Authentication.** Better Auth owns `/api/auth/**` through one catch-all route; `/api/auth-providers` reports which sign-in methods are enabled. GitHub OAuth is registered only when its credentials exist.
- **Course materials.** PostgreSQL stores file metadata; the bytes live on the server's filesystem under `COURSE_MATERIALS_DIR` and are served through an authenticated route.
- **Assignment submissions.** PostgreSQL stores assignment/rubric and submission metadata; uploaded PDF, ZIP, and source-code files use the same private local storage directory and protected download policy as course materials.
- **AI tutor.** A signed-in student, the course owner, or an admin can chat with a tutor grounded in the course's lecture transcripts. Inference goes through the Vercel AI Gateway using the Vercel AI SDK; PostgreSQL stores one transcript embedding per lecture, the cached lecture summaries, and one implicit conversation thread per user and course.
- **Static files.** Everything in `public/`, including the demo lecture videos, is served directly by Nuxt.

## Request lifecycle

1. **Route handler.** A file under `server/api/`; the filename suffix (`.get.ts`, `.post.ts`, `.put.ts`, `.delete.ts`) is the HTTP method.
2. **Guard.** `requireSession` returns 401 without a session, `requireRole` adds a 403 role check, and `optionalSession` suits public routes that answer differently for signed-in users.
3. **Validation.** `parseBody`, `parseQuery`, and `parseParam` validate against a Zod schema from `shared/validation/`. A failure returns 400 with the field issues attached.
4. **Service.** A function in `server/services/` receives plain values plus an actor (`{ id, role }`) and owns the business rules.
5. **Domain error.** Services throw `ServiceError` instead of building HTTP responses.
6. **Translation.** `withServiceErrors` maps the service code to a status; unknown errors pass through and Nitro answers with a generic 500.

| Service code    | HTTP status | Typical meaning                       |
| --------------- | ----------- | ------------------------------------- |
| `not_found`     | 404         | Missing, or deliberately hidden       |
| `forbidden`     | 403         | Known user, but not allowed           |
| `conflict`      | 409         | Breaks a uniqueness or lifecycle rule |
| `invalid_input` | 400         | Failed service-level validation       |

> [!IMPORTANT]
> Authorization is per route and per service, never a global filter. A global Nitro guard would also run on `/api/auth/**`, breaking the Better Auth handler, and would make intentionally public endpoints private. Client middleware is not protection either: it never runs for API requests.

A typical route is `server/api/courses/[id].get.ts`: it parses the id, reads an optional session, then calls `getCourse`, which hides unapproved courses from everyone except the course's instructor and admins.

## Where code lives

```text
.
├── app/                     Vue application
│   ├── pages/               file-based routes; pages choose middleware and layouts
│   ├── components/          UI grouped by feature; ui/ holds shadcn-vue primitives
│   ├── composables/         session, enrollment, and lecture-content helpers
│   ├── middleware/          client route guards
│   ├── layouts/             page shells: marketing, auth, workspace, default
│   ├── plugins/             Vue Query cache transfer and Better Auth hydration
│   └── lib/                 framework-free helpers
├── server/                  Nitro server
│   ├── api/                 thin handlers: guard, validate, delegate
│   ├── services/            business logic, queries, presenters
│   ├── db/                  Drizzle client, schema modules, migrations
│   └── utils/               auth, guards, validation helpers, error mapping
├── shared/                  code used by both sides
│   ├── types/               response shapes shared by client and server
│   └── validation/          Zod schemas and allowed values
├── seed/                    demo data scripts
└── public/
    └── videos/              demo lecture assets served as static files
```

Both sides import through the aliases `#server/*` and `#shared/*`; the client uses `@/` for `app/`.

## Rendering and data on the client

Pages are server-rendered first. Data the first paint needs comes from Nuxt's `useFetch`, which runs during SSR and hydrates into the page. `middleware/session.global.ts` resolves the session before named middleware, layouts, and pages read it.

Named guards then decide access:

| Guard               | Behaviour                                                     |
| ------------------- | ------------------------------------------------------------- |
| `auth`              | No session leads to `/auth/login` with a `redirect` parameter |
| `admin`             | No session leads to login; non-admins go to `/dashboard`      |
| `instructor`        | No session leads to login; must be an instructor or admin     |
| `guest`             | Signed-in visitors are sent to `/dashboard`                   |
| `student-dashboard` | Signed-in non-students are sent to `/instructor`              |

Beyond the guards:

- TanStack Vue Query handles shared client data. The plugin creates one client per server request, dehydrates its cache after rendering, and hydrates it in the browser so SSR data is not fetched twice.
- Query keys include the user id where data is per-user, as in `useMyEnrollments`, and composables prefetch during SSR when a page's first render depends on the result.
- The session is seeded into Better Auth's client store during hydration, so the first browser render matches the server's.
- UI primitives are shadcn-vue components in `app/components/ui`; feature components compose them. Pages and components call `/api/**`, never the database.

## API surface and service layer

Routes are grouped by domain, and every route delegates to a service.

| Area         | Routes                                                                                                                                          | Access                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Catalog      | `GET /api/courses`, `/api/courses/categories`, `/api/courses/[id]`                                                                              | Public; unapproved courses only for owner and admins                                         |
| Authoring    | `/api/courses` (create, mine), `/[id]` (update, submit, review), modules, lectures, reorder                                                     | Instructor or admin                                                                          |
| Enrollment   | `POST /api/courses/[id]/enroll`, `GET /api/enrollments/me`                                                                                      | Signed in; the course must be approved                                                       |
| Learning     | `GET /api/courses/[id]/learn`, progress, notes, bookmarks                                                                                       | Signed-in enrolled student                                                                   |
| AI tutor     | `GET`/`POST /api/courses/[id]/ai/chat`, `GET`/`POST /api/courses/[id]/lectures/[lectureId]/summary`                                             | Signed-in student enrolled in the course, or the course owner/admin; own thread only         |
| Quizzes      | `/api/courses/[id]/quizzes`, `/api/quizzes/[id]`, `/api/quizzes/[id]/attempt`, `/api/attempts/[id]`, `/api/attempts/[id]/submit`                | Owner/admin create and inspect; enrolled students take, are auto-graded, and review attempts |
| Materials    | `/api/courses/[id]/materials` and `/[materialId]`                                                                                               | Owner or admin; enrolled students may read                                                   |
| Assignments  | `/api/courses/[id]/assignments`, `/api/assignments/[id]/submit`, `/api/assignments/[id]/submissions`, `/api/submissions/[id]/grade` and `/file` | Owner/admin create and grade; enrolled students submit and read their own results            |
| Account      | `GET /api/me`, `/api/me/streak`, `/api/me/badges`                                                                                               | Signed in                                                                                    |
| Achievements | `GET /api/certificates/[id]/file`                                                                                                               | Signed in; the certificate's recipient or an admin                                           |
| Admin        | `GET /api/admin/courses/pending`, `POST /api/admin/courses/[id]/decision`                                                                       | Admin                                                                                        |
| Auth         | `/api/auth/**`, `GET /api/auth-providers`                                                                                                       | Better Auth; the provider list is public                                                     |
| Health       | `GET /api/health`                                                                                                                               | Public                                                                                       |

Course logic is split by job under `server/services/courses/`: `queries` for reads, `commands` for writes and lifecycle transitions, `presenters` for turning database rows into shared response types, and `access` for ownership and visibility rules. The other services follow the same shape: `courses/enrollments`, `courses/progress`, `courses/learning-tools`, `courses/materials`, `quizzes`, and `achievements` (certificates and badges; `achievements/pdf` renders them). `server/services/ai/` holds the tutor: access checks, lazy transcript embedding, retrieval, chat, and summaries.

## Data model

| Group          | Tables                                                                                                                | Holds                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Identity       | `users`, `sessions`, `accounts`, `verifications`                                                                      | Better Auth accounts, sessions, and OAuth links                                                              |
| Course content | `courses`, `modules`, `lectures`                                                                                      | The authoring tree, ordered by index; each lecture also holds its transcript embedding and cached AI summary |
| Review         | `course_approvals`                                                                                                    | One row per review decision, with reviewer and comment                                                       |
| Enrollment     | `enrollments`, `lecture_progress`                                                                                     | Who is enrolled, cached percentage, watch position, completion                                               |
| Learning tools | `notes`, `bookmarks`, `streaks`                                                                                       | Timestamped notes and bookmarks, daily streak counters                                                       |
| Materials      | `course_materials`                                                                                                    | File metadata and the storage key for a file on disk                                                         |
| Assessment     | `assignments`, `assignment_submissions`, `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`, `quiz_answers` | Course rubrics/deadlines and uploads; objective quizzes, their answer keys, and graded student attempts      |
| Achievements   | `certificates`, `user_badges`                                                                                         | Issued certificate snapshots and the milestone slugs each user has earned                                    |
| AI tutor       | `ai_chat_messages`                                                                                                    | One stored AI SDK message per row; one implicit thread per user and course                                   |

Relationships:

| From                             | To                   | Rule                                                                      |
| -------------------------------- | -------------------- | ------------------------------------------------------------------------- |
| `courses`                        | `modules`            | One course has ordered modules; deleting the course removes them          |
| `modules`                        | `lectures`           | One module has ordered lectures; deleting the module removes them         |
| `courses`                        | `course_approvals`   | Every decision points at its course                                       |
| `users`                          | `enrollments`        | A user enrolls once per course (unique pair)                              |
| `enrollments`                    | `lecture_progress`   | One row per lecture and enrollment (unique pair)                          |
| `lectures`                       | `notes`, `bookmarks` | Per-user rows, removed with the lecture                                   |
| `users`                          | `streaks`            | One streak row per user                                                   |
| `modules`                        | `quizzes`            | A module owns its quizzes; deleting the module removes them               |
| `quizzes`                        | `quiz_questions`     | Each question belongs to one quiz and carries ordered options             |
| `quiz_questions`                 | `quiz_options`       | Options keep their order and the `is_correct` answer key                  |
| `quizzes`, `users`               | `quiz_attempts`      | One open attempt per student and quiz; submitted attempts remain          |
| `quiz_attempts`                  | `quiz_answers`       | One graded answer per question, stored on submission                      |
| `courses`, `modules`, `lectures` | `course_materials`   | A material attaches to a module and optionally a lecture                  |
| `users`, `courses`               | `certificates`       | One certificate per student and course; deleting either removes it        |
| `users`                          | `user_badges`        | One row per earned milestone slug                                         |
| `users`, `courses`               | `ai_chat_messages`   | One implicit tutor thread per user and course; deleting either removes it |

Design rules worth knowing:

- New tables use UUID primary keys. Foreign keys to `users` stay **text** because Better Auth creates `users.id` as text; mixing types there would break the generated auth schema.
- Allowed values such as course status, difficulty, category, and roles are defined in `shared/validation` and `shared/types`, not as PostgreSQL enums, so the browser and server validate from one source of truth.
- `enrollments.progress_percent` is a cache. The progress service recomputes it when a lecture is marked complete.
- A certificate snapshots the recipient name and course title it was issued with, so later renames never rewrite an issued document. Its PDF is rendered on demand rather than stored.
- `server/db/schema/index.ts` is the barrel that `drizzle.config.ts` loads; a new table module must be exported there.
- `lectures.embedding` holds one 1536-dimension vector per transcript, indexed with HNSW cosine distance. Embeddings and the cached summary are filled lazily and cleared when the transcript changes; no chunk table or backfill job exists.
- `ai_chat_messages` stores AI SDK UI messages as JSON. There is no session table: the pair `(user_id, course_id)` is the conversation, and every read is scoped to the signed-in user.
- `server/db/schema/auth.ts` is generated by the Better Auth CLI. Regenerate it after changing the auth configuration or its plugins, then create and apply a Drizzle migration.

## Authentication and roles

`server/utils/auth.ts` creates the Better Auth instance on the Drizzle adapter:

- Email and password sign-in is enabled, with a minimum password length of 8 and automatic sign-in after sign-up.
- The admin plugin gives new accounts the `student` role and treats `admin` as the administrative role.
- GitHub is registered only when both credentials are present, so a checkout without OAuth still boots.
- `server/api/auth/[...all].ts` mounts Better Auth on `/api/auth/**`; `app/lib/auth-client.ts` points the client at the same origin.

Server code reads sessions through `auth.api.getSession`, wrapped by the guards in `server/utils/require-session.ts`. Client route middleware only shapes the experience; every protected API route enforces access itself.

## Course materials storage

Material bytes are deliberately kept out of PostgreSQL and out of the repository:

- A `course_materials` row stores the original filename, content type, size, and a UUID storage key. The file is written under `COURSE_MATERIALS_DIR`, which defaults to `~/.local/share/vertexai/course-materials`.
- The directory must be absolute and outside the repository. The storage service resolves real paths and rejects a directory that would contain, or sit inside, the checkout. It creates the directory with `0700` and files with `0600`.
- Uploads are checked by extension (`.pdf`, `.ppt`, `.pptx`, `.mp4`, `.mov`, `.webm`), by magic-byte signature, and by size (100 MiB maximum).
- Downloads use an authenticated route that checks course access, streams the file with `no-store` and `nosniff`, and supports HTTP `Range` requests so video can seek; `range-parser` reads the range header and `content-disposition` builds the download filename.
- Storage belongs to one app instance; multiple instances need shared storage.

## AI tutor

The tutor is deliberately small: streaming, provider calls, embeddings, chat state, and completion state all come from the Vercel AI SDK (packages `ai` 7, `@ai-sdk/gateway` 4, and `@ai-sdk/vue` 4). The application owns access control, grounding data, persistence, and the UI.

- **Configuration.** `server/utils/ai.ts` builds the Vercel AI Gateway provider from Nuxt runtime config. `AI_GATEWAY_API_KEY` in `.env` is enough locally; `NUXT_AI_GATEWAY_API_KEY` overrides it at runtime. `AI_CHAT_MODEL` (default `openai/gpt-6-luna`) and `AI_EMBEDDING_MODEL` (default `openai/text-embedding-3-large`) are optional overrides and use the gateway `provider/model` format. Without a key, the AI routes answer `503` and the tutor renders an explicit unavailable state; the rest of the app is unaffected.
- **Indexing.** On first use of a course, `server/services/ai/indexing.ts` embeds each transcript that has no vector yet with `openai/text-embedding-3-large` (1536 dimensions). One lecture has one vector; there is no chunk table, queue, or backfill script. Concurrent chat requests for the same course share one indexing run, and a transcript edit clears both the embedding and the cached summary. Every embedding request asks for 1536 dimensions, which is the width of the `vector(1536)` column, so a model with a larger native width still fits.
- **Retrieval and grounding.** A single cosine-distance query over the course's lecture vectors selects the top three lectures, and their full transcripts become the model context. The instructions forbid outside knowledge and require the tutor to say when the course material does not cover the question.
- **Chat.** `GET` returns the signed-in user's stored thread; `POST` validates the AI SDK message list, indexes lazily, streams a grounded answer with `streamText`, and attaches citations (lecture id, title, and a quoted excerpt) through `messageMetadata`. `toUIMessageStream` persistence writes the thread when the stream ends, including a partial answer that the student stopped. The client uses `useChat` with `DefaultChatTransport`.
- **Summaries.** A lecture summary is generated on demand and cached in `lectures.summary`/`summary_generated_at`. Students receive the cached text; the course owner and admins may force regeneration. The client uses `useCompletion` with the plain-text stream protocol.
- **Limits.** `server/utils/rate-limit.ts` allows 20 AI generation requests per user per minute. The counter is in memory, so the limit is per process; a multi-instance deployment needs shared storage. Missing keys and provider failures never block the LMS. The embedding model accepts up to 8,192 input tokens, so a transcript longer than that cannot be embedded under the one-vector-per-lecture design and surfaces as an AI error. Vectors from different embedding models are not comparable, so changing `AI_EMBEDDING_MODEL` requires clearing the stored vectors before the course is indexed again.

This deviates from PRD §5.2/§9 by design: there is no Python/FastAPI service, Redis/BullMQ worker, LangChain/LlamaIndex, document-chunk table, or separate chat-session table. Study aids beyond lecture summaries (flashcards, quiz drafts, study plans, adaptive modes, mastery scoring) are not implemented.

## Certificate PDFs

Certificates are rows, not files: `server/services/achievements/pdf.ts` renders a one-page PDF with `pdfmake` when it is downloaded, using the recipient name and course title stored on the certificate row. Roboto is embedded because PDF's standard fonts only cover ANSI text; the two Apache-2.0 TTFs under `server/assets/certificate-fonts/` are registered as Nitro server assets so they ship with the build, and that directory's README records coverage and licensing.

## Static assets and demo content

`public/videos/` holds one folder per demo course slug, each with a video, `transcript.txt`, and `about.md`. Nuxt serves everything in `public/` directly, so those files are public: use material you are allowed to distribute. The demo seed reads and validates the folders before writing any rows, and refuses to run in production.

## Conventions to preserve

1. Routes stay thin: guard, validate, call a service, translate errors.
2. Business rules live in services, which raise `ServiceError` rather than building responses.
3. Requests are validated with the same Zod schema the client form uses.
4. Protected API routes call a guard explicitly; there is no global API middleware.
5. Components and composables are imported explicitly; nothing relies on auto-import scanning.
6. Data files stay outside the repository, with generated names and validated paths.

## Quality gates and current gaps

- `pnpm validate` runs the Prettier check, ESLint, and the Nuxt typecheck.
- A Husky pre-commit hook runs `nano-staged`: ESLint with `--fix` and Prettier for code, Prettier for Markdown, JSON, CSS, and YAML.
- No test runner is configured yet, so there are no automated tests to run.
- The AI tutor requires an `AI_GATEWAY_API_KEY`; without one its routes return 503 and the rest of the app still works. It sends full transcripts to the model provider behind the Vercel AI Gateway, so use material you are allowed to share with that provider.
- Not implemented in this codebase: instructor analytics, moderation beyond course approvals, and the AI study aids listed above. See [`FEATURES.md`](FEATURES.md) for the available and planned lists.

See [`SETUP.md`](SETUP.md) for running the app locally.
