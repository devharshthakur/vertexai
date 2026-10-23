# Agent instructions

Run `pnpm lint` after changing code and fix every error before finishing.
`@shadcn/lint` checks `.vue` templates against the design system; its errors
name the component, the theme file, and the fix.

When a rule blocks a legitimate design decision, add
`eslint-disable-next-line shadcn/<rule> -- <reason>` at that call site.
Ask before adding a file-level or config-level disable.
