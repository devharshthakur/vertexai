---
name: defaults
description: Load at the start of every task in this repository. Routes work to task-specific Vue, Nuxt, and shadcn-vue skills and provides on-demand project context.
---

# Project defaults

## 1. Load skills for the task

At the start of the task, evaluate each trigger independently and invoke every matching skill before doing the relevant work. A task may match several triggers; ordinary shared TypeScript may match none.

- **Vue/client code:** When creating or editing Vue SFCs, client components, or Vue composables, load `vue-best-practices`.
- **Nuxt-specific work:** When working with Nuxt configuration, file-based routing, pages, layouts, middleware, data fetching, SSR/hydration, or Nitro/server routes, load `nuxt`.
- **UI creation or editing:** For any UI work, load `shadcn-vue`. When the skill does not provide the documentation needed for a component or pattern, use the shadcn-vue MCP server.

Completion: every matching skill is loaded before its corresponding work begins, and its rules apply for the rest of the task.

## 2. Load project context on demand

Read `references/project-context.md` when the task involves product scope, requirements, porting PRD behavior into this project's stack, the data model, API surface, architecture, or stack decisions. Read it before acting on a technology named by the PRD.

The canonical product document is `docs/PRD/PRD.docx`; use `docs/PRD/PRD.md` as the readable mirror.

## 3. UI rule: shadcn-vue only

Build every UI from shadcn-vue components, in this order:

1. **Registry-first** — the needed component isn't installed: find it with `pnpm dlx shadcn-vue@latest search` / `docs`, then `pnpm dlx shadcn-vue@latest add <component>`.
2. **Compose second** — no registry match: compose already-installed components (a settings page is Tabs + Card + form controls).
3. **Gap** — neither covers the need (rare): flag it to the user and agree on an approach before building custom markup.

Never pull in another component library, and never hand-roll styled markup that duplicates a shadcn-vue component.
