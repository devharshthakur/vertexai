# Certificate fonts

`Roboto-Regular.ttf` and `Roboto-Medium.ttf` are the two weights the certificate
PDF embeds. PDF's standard fonts only cover ANSI text, so a name outside that set
needs an embedded family.

- Source: the copies bundled with the `pdfmake` package (`fonts/Roboto/`), which
  ship the upstream Google Fonts files.
- Licence: Roboto is distributed under the Apache License 2.0, included here as
  `LICENSE-Roboto.txt`. That attribution does not change this project's own MIT
  licence.
- Weights: only regular and medium (the bold weight) are kept; the certificate
  uses no italics.
- Coverage: Latin, Latin Extended, Greek, Cyrillic, and Vietnamese. Devanagari,
  Arabic, Hebrew, and CJK scripts would need an additional family.

`nuxt.config.ts` does not register anything extra: Nitro already mounts
`server/assets` as the `assets:server` store, so the renderer reads
`certificate-fonts/Roboto-Regular.ttf` and its bold weight through `useStorage`
and the fonts ship inside the build output instead of depending on
`node_modules` at runtime.
