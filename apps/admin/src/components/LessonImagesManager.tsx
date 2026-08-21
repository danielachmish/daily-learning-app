'use client';

import type { LessonImage } from '@daily-learning/shared';
import { useEffect, useRef, useState } from 'react';

import { deleteLessonImage, fetchLessonImages, reorderLessonImages, uploadLessonImage } from '../services/lessons';
import { renderPdfPagesToImages } from '../services/pdfToImages';
import { createClient } from '../services/supabase/client';

interface Props {
  lessonId: string;
}

export function LessonImagesManager({ lessonId }: Props) {
  const [images, setImages] = useState<LessonImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      let pagesToUpload: File[];
      if (file.type === 'application/pdf') {
        setUploadStatus(`מעבד את ${file.name}…`);
        try {
          pagesToUpload = await renderPdfPagesToImages(file);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'עיבוד ה-PDF נכשל.');
          break;
        }
      } else {
        pagesToUpload = [file];
      }

      for (let i = 0; i < pagesToUpload.length; i++) {
        setUploadStatus(
          pagesToUpload.length > 1 ? `מעלה עמוד ${i + 1} מתוך ${pagesToUpload.length}…` : 'מעלה…'
        );
        const result = await uploadLessonImage(supabase, lessonId, pagesToUpload[i]);
        if (result.error) {
          setError(result.error);
          break;
        }
      }
    }

    setUploading(false);
    setUploadStatus(null);
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
      <p className="mb-2 text-xs text-slate-500">
        אפשר להעלות תמונות בודדות, או קובץ PDF שלם — כל עמוד ב-PDF יהפוך אוטומטית לתמונה נפרדת, לפי הסדר.
      </p>

      {/* The native <input type="file"> renders as plain, easy-to-miss
          browser-default text — hidden here and triggered by a real,
          clearly-visible button instead, matching the rest of the panel. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="mb-4 rounded-full bg-teal-400 px-4 py-2 text-sm font-bold text-on-teal disabled:opacity-60"
      >
        + העלאת תמונות או PDF
      </button>
      {uploading && <p className="mb-2 text-sm text-slate-500">{uploadStatus ?? 'מעלה…'}</p>}
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
              <img
                src={image.image_url}
                alt=""
                onClick={() => setZoomedUrl(image.image_url)}
                className="h-16 w-16 cursor-zoom-in rounded object-cover"
                title="לחיצה להגדלה"
              />
              <span className="flex-1 text-xs text-slate-500">סדר: {image.sort_order}</span>
              <button
                onClick={() => setZoomedUrl(image.image_url)}
                className="rounded-full border border-teal-400 px-2 py-1 text-xs text-teal-600"
              >
                הגדלה
              </button>
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

      {zoomedUrl && (
        <div
          onClick={() => setZoomedUrl(null)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomedUrl}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
          <button
            onClick={() => setZoomedUrl(null)}
            aria-label="סגירה"
            className="absolute end-6 top-6 rounded-full bg-paper-50 px-3 py-1.5 text-sm font-bold text-ink-900"
          >
            ✕ סגירה
          </button>
        </div>
      )}
    </div>
  );
}
