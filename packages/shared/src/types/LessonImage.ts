/** Mirrors the `lesson_images` table. */
export interface LessonImage {
  id: string;
  lesson_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}
