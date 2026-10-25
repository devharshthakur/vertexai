# TODO — Week 1, Days 6–7

## Day 6 — Real student dashboard

1. [ ] Add the shadcn-vue `Progress` component.
2. [ ] Wire `useMyEnrollments()` into `app/pages/dashboard.vue`.
3. [ ] Expose enrollment data, pending state, error, and refresh.
4. [ ] Extract `EnrolledCourseCard.vue`.
5. [ ] Show course title, category, difficulty, progress, and a link to the course.
6. [ ] Render loading skeletons, an error state with retry, an empty state, and enrolled-course cards.
7. [ ] Keep the dashboard limited to real data; do not fake streaks or a learning route.
8. [ ] Run `pnpm validate`.

## Day 7 — Smoke-test buffer

1. [ ] Start the local database and development server.
2. [ ] Smoke test a new registration and confirm the default student session.
3. [ ] Smoke test login and guest redirect from `/dashboard`.
4. [ ] Browse the catalog and open a published course.
5. [ ] Enroll in a course and confirm it appears on the dashboard.
6. [ ] Attempt a duplicate enrollment and confirm no duplicate dashboard card appears.
7. [ ] Confirm the dashboard progress value matches `/api/enrollments/me`.
8. [ ] Verify loading, error, empty, and populated dashboard states.
9. [ ] Fix any issues found during smoke testing.
10. [ ] Re-run the relevant smoke tests and `pnpm validate`.

## Definition of done

1. [ ] The dashboard shows actual persisted enrollments and progress.
2. [ ] The full Week 1 flow works manually: register → login → browse → enroll → dashboard.
3. [ ] No placeholder, fake streak, or unfinished learning-route behavior is visible.
