// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier/flat'

export default withNuxt(
  { ignores: ['.agents/**'] },
  { ignores: ['app/components/ui/**'] },
  prettier
)
