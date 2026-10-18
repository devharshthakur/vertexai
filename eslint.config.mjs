// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier/flat'

export default withNuxt(
  // Externally installed agent skills (gitignored)
  { ignores: ['.agents/**'] },
  // Your custom configs here
  prettier
)
