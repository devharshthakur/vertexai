export interface LearningLecture {
  id: string
  title: string
  videoUrl: string | null
  positionSeconds: number
  completed: boolean
}

export interface LearningCourse {
  title: string
  resumeLectureId: string | null
  progressPercent: number
  modules: { id: string; title: string; lectures: LearningLecture[] }[]
}
