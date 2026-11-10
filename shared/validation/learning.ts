import { z } from 'zod'

export const learningNoteIdSchema = z.uuid('Invalid note ID.')
export const learningBookmarkIdSchema = z.uuid('Invalid bookmark ID.')

export const noteContentSchema = z.string().trim().min(1, 'Enter a note.').max(10_000, 'Keep notes under 10,000 characters.')
export const createLectureNoteSchema = z.strictObject({
  timestampSeconds: z.number().int().min(0).max(86_400),
  content: noteContentSchema
})
export const updateLectureNoteSchema = z.strictObject({ content: noteContentSchema })
export const createLectureBookmarkSchema = z.strictObject({ timestampSeconds: z.number().int().min(0).max(86_400) })

export type CreateLectureNote = z.output<typeof createLectureNoteSchema>
export type UpdateLectureNote = z.output<typeof updateLectureNoteSchema>
export type CreateLectureBookmark = z.output<typeof createLectureBookmarkSchema>
