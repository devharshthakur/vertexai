---
name: project-defaults
description: Load at the start of every task in this repository. Project defaults — required base-skill loading and the shadcn-vue-only UI rule.
---

# Project defaults

## 1. Load the base skills (required, first action)

Before any substantive work, invoke all three skills:

- `vue-best-practices`
- `nuxt`
- `shadcn-vue`

Completion: all three loaded; their rules apply for the whole task.

## 2. UI rule: shadcn-vue only

Build every UI from shadcn-vue components, in this order:

1. **Registry-first** — the needed component isn't installed: find it with `pnpm dlx shadcn-vue@latest search` / `docs`, then `pnpm dlx shadcn-vue@latest add <component>`.
2. **Compose second** — no registry match: compose already-installed components (a settings page is Tabs + Card + form controls).
3. **Gap** — neither covers the need (rare): flag it to the user and agree on an approach before building custom markup.

Never pull in another component library, and never hand-roll styled markup that duplicates a shadcn-vue component.

## 3. Project context

For scope, requirements, data model, API surface, or stack questions, load `project-context`. The PRD lives at `docs/PRD.md`.
