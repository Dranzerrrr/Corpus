import * as pdfjsLib from 'pdfjs-dist';
// Configure bundled worker directly using Vite's URL asset resolution
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getPdfBlob } from '../../db/opfs';

// Set worker source to self-bundled worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export interface LoadedPdfDoc {
  doc: pdfjsLib.PDFDocumentProxy;
  numPages: number;
  fingerprint: string;
}

/**
 * Loads a PDF Document Proxy from an OPFS-stored SHA-256 hash or directly from a Blob/ArrayBuffer
 */
export async function loadPdfDocument(
  source: string | Blob | ArrayBuffer
): Promise<LoadedPdfDoc> {
  let data: ArrayBuffer;

  if (typeof source === 'string') {
    // Treat as SHA-256 fingerprint from OPFS
    const blob = await getPdfBlob(source);
    data = await blob.arrayBuffer();
  } else if (source instanceof Blob) {
    data = await source.arrayBuffer();
  } else {
    data = source;
  }

  const loadingTask = pdfjsLib.getDocument({
    data,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
    enableXfa: false,
  });

  const doc = await loadingTask.promise;
  return {
    doc,
    numPages: doc.numPages,
    fingerprint: typeof source === 'string' ? source : doc.fingerprints[0] || 'unknown',
  };
}

export { pdfjsLib };
