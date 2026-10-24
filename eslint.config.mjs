import { plugin as shadcn } from '@shadcn/lint'
import pluginQuery from '@tanstack/eslint-plugin-query'
import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier/flat'

// Nuxt's generated config already parses .vue with vue-eslint-parser, so
// this block only registers the plugin and the design-system rules.
/** @type {import('eslint').Linter.Config} */
const designSystem = {
  files: ['**/*.vue'],
  plugins: { shadcn },
  rules: {
    'shadcn/no-restyle': ['error', { allow: ['layout'] }],
    'shadcn/no-raw-colors': 'error',
    'shadcn/no-arbitrary-values': ['error', { allow: ['layout'] }],
    'shadcn/no-inline-styles': 'error',
    'shadcn/require-static-classes': 'error',
    'shadcn/no-unknown-classes': 'error'
  }
}

export default withNuxt(
  { ignores: ['.agents/**'] },
  { ignores: ['app/components/ui/**'] },
  ...pluginQuery.configs['flat/recommended-strict'],
  designSystem,
  prettier
)
