import { z } from 'zod'

export const progressUpdateSchema = z.discriminatedUnion('action', [z.strictObject({ action: z.literal('view') }), z.strictObject({ action: z.literal('position'), positionSeconds: z.number().int().min(0).max(86400) }), z.strictObject({ action: z.literal('complete') })])

export type ProgressUpdate = z.infer<typeof progressUpdateSchema>
