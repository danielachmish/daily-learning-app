'use client';

import type { LessonImage } from '@daily-learning/shared';
import { useEffect, useState } from 'react';

import { deleteLessonImage, fetchLessonImages, reorderLessonImages, uploadLessonImage } from '../services/lessons';
import { createClient } from '../services/supabase/client';

interface Props {
  lessonId: string;
}

export function LessonImagesManager({ lessonId }: Props) {
  const [images, setImages] = useState<LessonImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    const supabase = createClient();
    const result = await fetchLessonImages(supabase, lessonId);
    if (result.error) setError(result.error);
    setImages(result.images);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const result = await uploadLessonImage(supabase, lessonId, file);
      if (result.error) {
        setError(result.error);
        break;
      }
    }

    setUploading(false);
    event.target.value = '';
    reload();
  }

  async function handleDelete(image: LessonImage) {
    if (!confirm('למחוק את התמונה הזו?')) return;
    setBusyId(image.id);
    const supabase = createClient();
    const result = await deleteLessonImage(supabase, image);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    reload();
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const reordered = [...images];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setImages(reordered);

    const supabase = createClient();
    const result = await reorderLessonImages(
      supabase,
      reordered.map((img) => img.id)
    );
    if (result.error) {
      setError(result.error);
      reload();
    }
  }

  return (
    <div className="mt-8 max-w-lg">
      <h2 className="mb-3 text-lg font-extrabold text-ink-900">תמונות</h2>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        disabled={uploading}
        className="mb-4 text-sm"
      />
      {uploading && <p className="mb-2 text-sm text-slate-500">מעלה…</p>}
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">טוען…</p>
      ) : images.length === 0 ? (
        <p className="text-sm text-slate-500">אין עדיין תמונות ללימוד זה.</p>
      ) : (
        <ul className="space-y-2">
          {images.map((image, index) => (
            <li
              key={image.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-paper-50 p-2"
            >
              {/* Arbitrary Storage URLs — next/image would require remotePatterns per-environment. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.image_url} alt="" className="h-16 w-16 rounded object-cover" />
              <span className="flex-1 text-xs text-slate-500">סדר: {image.sort_order}</span>
              <button
                onClick={() => handleMove(index, -1)}
                disabled={index === 0 || busyId === image.id}
                className="rounded-full border border-teal-400 px-2 py-1 text-xs text-teal-600 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => handleMove(index, 1)}
                disabled={index === images.length - 1 || busyId === image.id}
                className="rounded-full border border-teal-400 px-2 py-1 text-xs text-teal-600 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                onClick={() => handleDelete(image)}
                disabled={busyId === image.id}
                className="text-xs text-danger hover:underline"
              >
                מחיקה
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
