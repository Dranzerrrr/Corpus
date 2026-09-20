/**
 * OPFS (Origin Private File System) File Manager
 * Stores raw PDF binaries in the sandboxed browser filesystem, indexed by content hash.
 */

const PDF_DIRECTORY = 'pdfs';

/**
 * Checks if OPFS is supported in the current environment
 */
export function isOpfsSupported(): boolean {
  return typeof navigator !== 'undefined' && 
         typeof navigator.storage !== 'undefined' && 
         typeof navigator.storage.getDirectory === 'function';
}

/**
 * Gets or creates the 'pdfs' root directory inside OPFS
 */
async function getPdfsDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
  if (!isOpfsSupported()) {
    throw new Error('OPFS (Origin Private File System) is not supported in this browser environment.');
  }
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle(PDF_DIRECTORY, { create: true });
}

/**
 * Saves a PDF File or Blob to OPFS using its SHA-256 hash as the file key
 * @param sha256 Content-based hash of the PDF
 * @param data ArrayBuffer or Blob of the PDF content
 * @returns The storage file path
 */
export async function savePdfToOpfs(sha256: string, data: ArrayBuffer | Blob): Promise<string> {
  const dirHandle = await getPdfsDirectoryHandle();
  const filename = `${sha256}.pdf`;
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  
  const writable = await fileHandle.createWritable();
  if (data instanceof Blob) {
    await writable.write(data);
  } else {
    await writable.write(new Uint8Array(data));
  }
  await writable.close();

  return `${PDF_DIRECTORY}/${filename}`;
}

/**
 * Reads a PDF file from OPFS as an ArrayBuffer
 * @param sha256 Content-based hash of the PDF
 */
export async function getPdfFromArrayBuffer(sha256: string): Promise<ArrayBuffer> {
  const dirHandle = await getPdfsDirectoryHandle();
  const filename = `${sha256}.pdf`;
  const fileHandle = await dirHandle.getFileHandle(filename);
  const file = await fileHandle.getFile();
  return await file.arrayBuffer();
}

/**
 * Retrieves a PDF file from OPFS as a Blob
 * @param sha256 Content-based hash of the PDF
 */
export async function getPdfBlob(sha256: string): Promise<Blob> {
  const dirHandle = await getPdfsDirectoryHandle();
  const filename = `${sha256}.pdf`;
  const fileHandle = await dirHandle.getFileHandle(filename);
  const file = await fileHandle.getFile();
  return file;
}

/**
 * Checks whether a PDF with this hash already exists in OPFS
 */
export async function hasPdfInOpfs(sha256: string): Promise<boolean> {
  try {
    const dirHandle = await getPdfsDirectoryHandle();
    const filename = `${sha256}.pdf`;
    await dirHandle.getFileHandle(filename);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes a PDF file from OPFS
 */
export async function deletePdfFromOpfs(sha256: string): Promise<boolean> {
  try {
    const dirHandle = await getPdfsDirectoryHandle();
    const filename = `${sha256}.pdf`;
    await dirHandle.removeEntry(filename);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lists all stored PDF file names and sizes from OPFS
 */
export async function listOpfsPdfs(): Promise<Array<{ filename: string; sizeBytes: number }>> {
  if (!isOpfsSupported()) return [];
  try {
    const dirHandle = await getPdfsDirectoryHandle();
    const results: Array<{ filename: string; sizeBytes: number }> = [];
    
    // @ts-expect-error - entries() is standard in AsyncIterable FileSystemDirectoryHandle
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile();
        results.push({ filename: name, sizeBytes: file.size });
      }
    }
    return results;
  } catch (err) {
    console.warn('Failed to list OPFS pdfs', err);
    return [];
  }
}
