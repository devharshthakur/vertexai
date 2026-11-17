# Features

VertexAI aims to cover the full teaching loop: authoring, publishing, learning, and the AI help layer. This page separates what the repository implements today from what the product requirements describe but the code does not do yet.

> [!NOTE]
> "Available now" reflects the code in this repository. "Planned" means the idea is in the product scope, with no implementation yet.

## Available now

| Area                | What works                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts and roles  | Email and password sign-up/sign-in, optional GitHub OAuth, student/instructor/admin roles, and an admin user directory with role changes, suspension, and account deletion |
| Course catalog      | Published courses with text search, category and difficulty filters, and pagination                                                                                        |
| Course authoring    | Course metadata, ordered modules and lectures, PDF/PowerPoint/video materials, submission for review                                                                       |
| Course approval     | Admin queue of pending courses, approve or reject with an optional comment                                                                                                 |
| Enrollment          | Enroll in approved courses; enrolled courses appear on the dashboard                                                                                                       |
| Lectures            | Video playback, resume position, completion tracking, course progress percentage                                                                                           |
| AI tutor            | Per-course, grounded streaming chat that cites the lecture transcripts it used and keeps a per-user thread                                                                 |
| Lecture summaries   | On-demand AI key points for a lecture, cached until the transcript changes; instructors and admins can regenerate                                                          |
| Quizzes             | Instructor-authored module quizzes (multiple-choice and multi-select), student attempts, instant auto-grading, and retakes                                                 |
| Notes and bookmarks | Timestamped notes and bookmarks attached to a lecture                                                                                                                      |
| Assignments         | Instructor rubrics and deadlines, enrolled-student file submissions, protected downloads, manual grading                                                                   |
| Learning streaks    | Current and longest daily streak per user                                                                                                                                  |
| Certificates        | On-demand PDF certificate once every lecture in a course is complete                                                                                                       |
| Achievement badges  | Milestones for finishing a course, scoring a perfect quiz, and a seven-day streak                                                                                          |
| Demo data           | Seeded accounts, three approved courses, and lecture assets                                                                                                                |
| Demo environment    | One-command container stack that applies the migrations and seeds the demo content, plus a setup command for a local checkout                                              |

## Planned

These come from the product requirements and are not implemented yet:

- **AI study aids**: flashcards, quiz drafts, study plans, and mastery scoring.
- **Adaptive explanations** at beginner, intermediate, and advanced levels.
- **Instructor analytics** showing where learners struggle.

The AI tutor and lecture summaries need an `AI_GATEWAY_API_KEY` for the Vercel AI Gateway. Without one they show an unavailable state; the rest of the app keeps working.

## See also

- [`README.md`](README.md) — what the project is and who it serves, plus the one-command quick start.
- [`docs/REVIEW.md`](docs/REVIEW.md) — a guided tour of the codebase.
- [`docs/PRD/PRD.docx`](docs/PRD/PRD.docx) — full product requirements; readable copies live in [`docs/PRD/PRD.md`](docs/PRD/PRD.md) and [`docs/PRD/PRD.html`](docs/PRD/PRD.html).
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the implemented system is built.
