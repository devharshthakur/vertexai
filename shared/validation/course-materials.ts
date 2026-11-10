import { z } from 'zod'
import { lectureIdSchema, moduleIdSchema } from './courses'

export const COURSE_MATERIAL_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.mp4', '.webm', '.mov'] as const
export const MAX_COURSE_MATERIAL_BYTES = 100 * 1024 * 1024

export const courseMaterialIdSchema = z.uuid('Invalid material ID.')

export const courseMaterialUploadFieldsSchema = z.strictObject({
  moduleId: moduleIdSchema,
  lectureId: lectureIdSchema.optional()
})

export type CourseMaterialUploadFields = z.output<typeof courseMaterialUploadFieldsSchema>
