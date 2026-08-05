'use client';

import { useRouter } from 'next/navigation';

import { LessonForm } from '../../../../components/LessonForm';
import { createLesson, type LessonInput } from '../../../../services/lessons';
import { createClient } from '../../../../services/supabase/client';

const DEFAULT_VALUES: LessonInput = {
  lessonDate: new Date().toISOString().slice(0, 10),
  hebrewDate: '',
  title: '',
  genderTrack: 'men',
  language: 'he',
  status: 'draft',
};

export default function NewLessonPage() {
  const router = useRouter();

  async function handleSubmit(input: LessonInput) {
    const supabase = createClient();
    const result = await createLesson(supabase, input);
    if (result.error) {
      return { error: result.error };
    }
    router.push(`/lessons/${result.data!.id}/edit`);
    return { error: null };
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">לימוד חדש</h1>
      <LessonForm initialValues={DEFAULT_VALUES} submitLabel="צור לימוד" onSubmit={handleSubmit} />
    </div>
  );
}
