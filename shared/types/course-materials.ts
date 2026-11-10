export interface CourseMaterialSummary {
  id: string
  courseId: string
  moduleId: string
  lectureId: string | null
  originalFilename: string
  contentType: string
  sizeBytes: number
  createdAt: string
}
