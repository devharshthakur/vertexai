# Agent instructions

- Run `pnpm validate` after changing code and fix every failure before finishing.
  Never build the project every time to validate your changes unless user explicitly asks

- When a rule blocks a legitimate design decision, add
  `eslint-disable-next-line shadcn/<rule> -- <reason>` at that call site.
  Ask before adding a file-level or config-level disable.

- Never edit any documentation
