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

export interface LectureNote {
  id: string
  timestampSeconds: number
  content: string
  createdAt: string
  updatedAt: string
}

export interface LectureBookmark {
  id: string
  timestampSeconds: number
  createdAt: string
}

export interface LearningStreak {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string | null
}
