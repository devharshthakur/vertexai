import { z } from 'zod'

/**
 * Schemas for the credential forms.
 *
 * They live in `shared/` so the browser and the Nitro server can validate the
 * same payloads with the same rules. TanStack Form reads them as Standard
 * Schema validators, which spreads the issues over the matching fields.
 */

const email = z.email('Enter a valid email address.')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.')
})

export const signupSchema = z.object({
  name: z.string().min(1, 'Enter your name.'),
  email,
  password: z.string().min(8, 'Use at least 8 characters.')
})

export type LoginValues = z.input<typeof loginSchema>
export type SignupValues = z.input<typeof signupSchema>
