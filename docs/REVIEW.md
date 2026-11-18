# Review guide

A tour of the codebase for a mentor or reviewer. It assumes you have the app running — start it with the [quick start](../README.md#quick-start) — and it points at the files that matter for each part of the product.

> [!TIP]
> Every path below is relative to the repository root.

## How to read the code

The whole application follows one request path, and almost every file sits on it:

```text
browser → app/pages/*.vue → server/api/**/*.ts → server/services/** → server/db/schema
```

1. **A page** (`app/pages/`) renders on the server and calls `/api/**`.
2. **A route** (`server/api/`) is thin: guard, validate, delegate, translate errors.
3. **A service** (`server/services/`) owns the business rules and talks to Drizzle.
4. **A schema** (`server/db/schema/`) defines the tables; migrations live in `server/db/migrations/`.

Start with any route file — it is short, and it names the service that does the work.

## The tour

### 1. The AI tutor (the part worth the most attention)

This is the product idea: the tutor answers from _your_ course material and shows where the answer came from.

| What to read                                   | Why                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `server/services/ai/chat.ts`                   | The turn: access check, retrieval, grounding instructions, streaming, citations |
| `server/services/ai/indexing.ts`               | Lazy passage indexing of lecture transcripts                                    |
| `server/services/ai/chunking.ts`               | How a long transcript is split into embeddable chunks                           |
| `server/services/ai/retrieval.ts`              | The cosine-distance query, grounding rules, and depth instructions              |
| `server/services/ai/chat-thread.ts`            | How one conversation per user and course is kept consistent                     |
| `server/services/ai/quiz-draft.ts`             | Structured quiz drafts from a transcript, normalized to the quiz form's rules   |
| `server/api/courses/[id]/ai/chat.post.ts`      | The route that streams the answer                                               |
| `app/components/learning/AiTutorPanel.vue`     | The client: `useChat`, the citation chips, the retry path                       |
| `docs/adr/0001-chunked-transcript-indexing.md` | Why the transcript is indexed as passages                                       |

The interesting decisions are recorded in the ADR; the code shows how they are implemented.

### 2. Course authoring and approval

| What to read                                                          | Why                                                              |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `app/pages/instructor/courses/[id]/index.vue`                         | The authoring surface: modules, lectures, quizzes, materials     |
| `server/services/courses/commands.ts`                                 | Creating and editing the course tree                             |
| `server/services/courses/access.ts`                                   | Who may read and change a course — the rule every route leans on |
| `server/api/admin/courses/pending.get.ts` and `[id]/decision.post.ts` | The admin approval queue                                         |
| `app/pages/admin/approvals.vue`                                       | The queue's UI                                                   |

### 3. Learning and assessment

| What to read                                          | Why                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `app/pages/learn/[courseId]/lectures/[lectureId].vue` | The player, notes, bookmarks, and the tutor panel together |
| `server/services/courses/progress.ts`                 | Progress percentage, watch position, completion            |
| `server/services/quizzes/index.ts`                    | Quiz authoring, attempts, and auto-grading                 |
| `server/services/assignments/index.ts`                | Rubrics, submissions, and manual grading                   |

### 4. Authentication and roles

| What to read                       | Why                                                               |
| ---------------------------------- | ----------------------------------------------------------------- |
| `server/utils/auth.ts`             | The Better Auth instance and the admin plugin                     |
| `server/utils/require-session.ts`  | The `requireSession`, `requireRole`, and `optionalSession` guards |
| `shared/types/auth.ts`             | The roles                                                         |
| `app/middleware/session.global.ts` | The client-side route guards                                      |

> [!IMPORTANT]
> Client middleware is not protection. Every protected API route guards itself, because a global API middleware would also intercept `/api/auth/**`.

### 5. The demo environment

| What to read                          | Why                                                                  |
| ------------------------------------- | -------------------------------------------------------------------- |
| `demo/`                               | The demo courses, the asset loader, the seed, and the setup command  |
| `server/plugins/bootstrap.ts`         | How the container applies the migrations and seeds itself at startup |
| `Dockerfile` and `docker-compose.yml` | The image and the two-service stack                                  |
| `.github/workflows/ci.yml`            | The checks that run on every push                                    |

### 6. Data model

`server/db/schema/` holds one module per group of tables; `server/db/schema/index.ts` is the barrel that Drizzle loads. `ARCHITECTURE.md` has the full table list and the relationships.

## Things to try

With the stack running and `pnpm demo:assets` done:

1. Sign in as `student@example.com` / `password@1234`.
2. Open **Learning Tailwind CSS** and start a lecture. The player, the notes, and the bookmarks all work.
3. Ask the AI tutor a question about the course. The answer cites the lecture it used — that citation is the point of the feature. Switch **Explanation depth** to Beginner or Advanced and ask again: the answer changes how much background it assumes.
4. Sign in as `instructor@example.com` and open the authoring view for the same course. In the Quizzes card, choose a lecture under **Draft questions from a lecture** and press **Draft with AI** — the form fills with questions to review before creating the quiz.
5. As the student, finish a lecture and submit its quiz. Sign in as the instructor again and open **Analytics** from the course editor or the course card — the lecture row shows the drop-off and watch time, and the quiz row shows the score.
6. Sign in as `admin@example.com`, open the approvals queue, then **User accounts**. Change a role, suspend and restore the account, and open — but do not confirm — the delete dialog.
7. Check the wiring: `curl http://localhost:3000/api/health` returns `{"status":"ok","database":"up"}`.

## Known gaps

These are not implemented; the product scope is in `docs/PRD/`:

- The AI study aids: flashcards, study plans, mastery scoring.

`FEATURES.md` keeps the full split between what works and what is planned.

## Questions worth asking

A reviewer with a few hours will get more out of these than from a full read:

- Does the tutor ever answer from outside the course material? The grounding instructions forbid it, and the retrieval query is scoped to one course.
- Can a student read another student's thread? Every query is scoped to the signed-in user's id.
- What happens when the AI provider is down? The AI routes answer `503` and the rest of the app keeps working.
- What happens when two tabs send a message at once? The per-thread queue serialises the turns, and a stale regeneration is rejected with a conflict.
- What happens to a course when the transcript changes? Its passages and its cached summary are dropped, and the next question re-indexes it.
