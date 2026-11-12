# Features

VertexAI aims to cover the full teaching loop: authoring, publishing, learning, and the AI help layer. This page separates what the repository implements today from what the product requirements describe but the code does not do yet.

> [!NOTE]
> "Available now" reflects the code in this repository. "Planned" means the idea is in the product scope, with no implementation yet.

## Available now

| Area                | What works                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| Accounts and roles  | Email and password sign-up/sign-in, optional GitHub OAuth, student/instructor/admin roles                |
| Course catalog      | Published courses with text search, category and difficulty filters, and pagination                      |
| Course authoring    | Course metadata, ordered modules and lectures, PDF/PowerPoint/video materials, submission for review     |
| Course approval     | Admin queue of pending courses, approve or reject with an optional comment                               |
| Enrollment          | Enroll in approved courses; enrolled courses appear on the dashboard                                     |
| Lectures            | Video playback, resume position, completion tracking, course progress percentage                         |
| Notes and bookmarks | Timestamped notes and bookmarks attached to a lecture                                                    |
| Assignments         | Instructor rubrics and deadlines, enrolled-student file submissions, protected downloads, manual grading |
| Learning streaks    | Current and longest daily streak per user                                                                |
| Demo data           | Seeded accounts, three approved courses, and lecture assets                                              |

## Planned

These come from the product requirements and are not implemented yet:

- **AI tutor** grounded in course material, with citations back to the lecture.
- **AI study aids**: lecture summaries, flashcards, and quiz drafts.
- **Adaptive explanations** at beginner, intermediate, and advanced levels.
- **Auto-graded quizzes**.
- **Certificates** on course completion.
- **Achievement badges.**
- **Instructor analytics** showing where learners struggle.
- **Admin moderation tools** beyond course approvals.

There is no AI provider integration in the codebase yet.

## See also

- [`README.md`](README.md) — what the project is and who it serves.
- [`docs/PRD/PRD.docx`](docs/PRD/PRD.docx) — full product requirements; an HTML copy lives in `docs/PRD/PRD.html`.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the implemented system is built.
