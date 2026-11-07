import { plugin as shadcn } from '@shadcn/lint'
import pluginQuery from '@tanstack/eslint-plugin-query'
// @ts-ignore
import drizzle from 'eslint-plugin-drizzle'
import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier/flat'

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

/**
 * `eslint-plugin-drizzle` only ships legacy (`.eslintrc`) presets, so its rules
 * are registered here for the flat config. `drizzleObjectName` limits the rules
 * to this project's Drizzle clients: `useDb()` chains, `const db = useDb()`, and
 * transaction callbacks (`tx`).
 *
 * @type {import('eslint').Linter.Config}
 */
const databaseSafety = {
  files: ['server/**/*.ts', 'seed/**/*.ts'],
  plugins: { drizzle },
  rules: {
    'drizzle/enforce-delete-with-where': ['error', { drizzleObjectName: ['db', 'tx', 'useDb'] }],
    'drizzle/enforce-update-with-where': ['error', { drizzleObjectName: ['db', 'tx', 'useDb'] }]
  }
}

export default withNuxt({ ignores: ['.agents/**'] }, { ignores: ['app/components/ui/**'] }, ...pluginQuery.configs['flat/recommended-strict'], designSystem, databaseSafety, prettier)
