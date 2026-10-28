# TODO — Week 1, Days 6–7

## Day 6 — Real student dashboard

1. [x] Add the shadcn-vue `Progress` component.
2. [x] Wire `useMyEnrollments()` into `app/pages/dashboard.vue`.
3. [x] Expose enrollment data, pending state, error, and refresh.
4. [x] Extract `EnrolledCourseCard.vue`.
5. [x] Show course title, category, difficulty, progress, and a link to the course.
6. [x] Render loading skeletons, an error state with retry, an empty state, and enrolled-course cards.
7. [x] Keep the dashboard limited to real data; do not fake streaks or a learning route.
8. [x] Run `pnpm validate`.

## Day 7 — Smoke-test buffer

1. [x] Start the local database and development server.
2. [x] Smoke test a new registration and confirm the default student session.
3. [x] Smoke test login and guest redirect from `/dashboard`.
4. [x] Browse the catalog and open a published course.
5. [x] Enroll in a course and confirm it appears on the dashboard.
6. [x] Attempt a duplicate enrollment and confirm no duplicate dashboard card appears.
7. [x] Confirm the dashboard progress value matches `/api/enrollments/me`.
8. [x] Verify loading, error, empty, and populated dashboard states.
9. [x] Fix any issues found during smoke testing.
10. [x] Re-run the relevant smoke tests and `pnpm validate`.

## Definition of done

1. [x] The dashboard shows actual persisted enrollments and progress.
2. [x] The full Week 1 flow works manually: register → login → browse → enroll → dashboard.
3. [x] No placeholder, fake streak, or unfinished learning-route behavior is visible.
