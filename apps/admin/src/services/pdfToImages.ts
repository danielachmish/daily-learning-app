const RENDER_SCALE = 2.5; // matches scripts/import-lesson-pdf.py — crisp on a phone screen

/**
 * Renders every page of a PDF file to a PNG image, exactly as designed
 * (not re-typeset) — same approach as the monthly bulk importer
 * (scripts/import-lesson-pdf.py), just for a single lesson's worth of
 * pages uploaded by hand instead of a whole booklet.
 *
 * pdfjs-dist is imported dynamically, inside this function, rather than at
 * module scope — it references browser-only globals (e.g. DOMMatrix) that
 * don't exist in Node, and Next.js evaluates a client component's static
 * imports during its server render pass too, which crashed the page
 * (ReferenceError: DOMMatrix is not defined) even though this function is
 * only ever called from a browser event handler.
 */
export async function renderPdfPagesToImages(file: File): Promise<File[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: File[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Pass `canvas` only, not `canvasContext` — pdfjs-dist's docs say
    // canvasContext is "for backwards compatibility" and that canvas "must
    // be null" if the context is to be used, i.e. the two are mutually
    // exclusive despite both being individually optional-looking in the
    // type. Passing both together made page.render(...).promise hang
    // forever with no error (confirmed by instrumenting each await step —
    // getDocument/getPage both resolved fine, only render() never did).
    await page.render({ canvas, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error(`עיבוד עמוד ${pageNumber} מה-PDF נכשל.`);

    const baseName = file.name.replace(/\.pdf$/i, '');
    pages.push(new File([blob], `${baseName}-page-${pageNumber}.png`, { type: 'image/png' }));
  }

  return pages;
}
