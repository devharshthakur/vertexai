# Repository guidance

Load the `defaults` skill at the start of every repository task.

## Architecture

- The PRD describes product requirements, not the implemented stack: read `docs/PRD/PRD.md` for scope, but use the repository's Nuxt/Vue/Nitro stack rather than the PRD's suggested technologies.
- `server/api/` contains Nitro routes, `server/services/` business logic, and `shared/` schemas and types used on both sides. Validate route inputs with `server/utils/validate.ts` and map service errors at the route boundary.
- Nuxt component and composable auto-import scanning is disabled. Explicitly import app components and composables; server and shared code use `#server/` and `#shared/` aliases.
- Client route middleware does not protect APIs. Protected routes must explicitly use `requireSession` or `requireRole`; use `optionalSession` for public routes that vary by session. Global auth middleware would also intercept public and Better Auth routes.

## Workflow

- Follow `SETUP.md` for environment and local setup. The dev server uses port 5173; Compose PostgreSQL defaults to host port 5433.
- `pnpm validate` runs Prettier check, ESLint, then Nuxt typecheck. Focused checks: `pnpm exec eslint <files>` and `pnpm exec prettier --check <files>`. There is currently no test script or configured test runner.
- `pnpm setup` and `pnpm demo:setup` both run `seed/setup.ts`: they require interactive confirmation and **delete the Compose project's database volumes** before migrating and seeding. Re-running `pnpm db:seed` resets demo account passwords and signs those accounts out.
- Drizzle reads `DATABASE_URL` and discovers tables through `server/db/schema/index.ts`. Export new table modules there; generate migrations with `pnpm db:generate`, inspect `server/db/migrations/`, then apply with `pnpm db:migrate` when authorized.
- `server/db/schema/auth.ts` is generated from Better Auth configuration; see `server/db/schema/index.ts` for the regeneration workflow, check the CLI version against the installed Better Auth version, then generate a Drizzle migration.
- Vue files outside `app/components/ui/` have additional shadcn design-system lint rules. The `defaults` skill contains the UI component policy.
