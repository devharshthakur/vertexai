# Agent instructions

## Project and architecture

- Read `docs/PRD/PRD.md` for product scope, roles, data model, and API requirements. Its React/Express stack and deployment sections are suggestions, not the current architecture; this repository intentionally uses Nuxt 4/Vue 3, Nitro, Better Auth, Drizzle, and PostgreSQL. Do not introduce PRD-suggested infrastructure as if it already exists.
- `app/` contains the SSR Vue client, `server/api/` contains thin Nitro routes, `server/services/` owns business logic, and `shared/` contains Zod schemas and types used on both sides. Validate request input with `server/utils/validate.ts`; keep HTTP error mapping in routes rather than services.
- App component and composable auto-import scanning is disabled in `nuxt.config.ts`. Explicitly import them through `@/`; use `#server/` and `#shared/` for those respective trees.
- Client route middleware does not protect APIs. Each protected server route must call `requireSession`, `requireRole`, or `optionalSession` as appropriate; a global Nitro auth middleware would also intercept Better Auth and public routes.

## Local workflow and verification

- First run: `pnpm install`, copy `.env.example` to `.env` and fill it in, then `pnpm db:up`, `pnpm db:migrate`, and `pnpm dev`. The app uses port 5173 and local PostgreSQL defaults to host port 5433, not 5432.
- After changing code, run `pnpm validate` (Prettier check, ESLint, then Nuxt typecheck) and fix every failure. Do not use a production build as routine validation unless explicitly requested.
- For focused checks, use `pnpm exec eslint <files>` or `pnpm exec prettier --check <files>`. No automated test runner or test script is currently configured.

## Database and generated auth schema

- Export every Drizzle table module from `server/db/schema/index.ts`. After schema changes, run `pnpm db:generate`, inspect the migration under `server/db/migrations/`, then apply it with `pnpm db:migrate`; Drizzle commands require `DATABASE_URL`.
- `server/db/schema/auth.ts` is generated from `server/utils/auth.ts`. After changing auth config or plugins, regenerate it with `pnpm dlx auth@1.7.13 generate --config server/utils/auth.ts --output server/db/schema/auth.ts -y`, then generate and apply a Drizzle migration.

## UI and editing constraints

- Build UI with shadcn-vue, adding missing primitives with `pnpm dlx shadcn-vue@latest add <component>`. Generated primitives live in `app/components/ui/`; Tailwind v4 theme customizations belong in `app/assets/css/main.css`.
- Vue files outside `app/components/ui/` have additional shadcn design-system lint rules. When one blocks a legitimate design decision, add `eslint-disable-next-line shadcn/<rule> -- <reason>` at that call site; ask before a file-level or config-level disable.
- Never edit any documentation unless explicitly requested.
