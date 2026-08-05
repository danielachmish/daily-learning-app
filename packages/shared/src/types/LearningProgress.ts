/** Mirrors the `learning_progress` table. */
export interface LearningProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  lesson_date: string;
  completed_at: string;
}
