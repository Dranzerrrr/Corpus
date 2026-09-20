/**
 * Content-based PDF Identity Hasher
 * 
 * Provides stable cryptographic fingerprinting for PDF files regardless of
 * filename changes, disk renames, or path shifts.
 */

export interface PdfHashResult {
  sha256: string;
  sizeBytes: number;
  isValidPdf: boolean;
  formatVersion?: string;
}

/**
 * Validates the '%PDF-' magic bytes at the beginning of the file buffer
 */
export function validatePdfMagicBytes(buffer: ArrayBuffer): { isValid: boolean; version?: string } {
  if (buffer.byteLength < 8) {
    return { isValid: false };
  }

  const bytes = new Uint8Array(buffer.slice(0, 16));
  // ASCII %PDF- is [0x25, 0x50, 0x44, 0x46, 0x2D]
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    // Extract version (e.g. "1.4", "1.7", "2.0")
    let version = '';
    for (let i = 5; i < 12; i++) {
      const char = String.fromCharCode(bytes[i]);
      if (/[\d.]/.test(char)) {
        version += char;
      } else {
        break;
      }
    }
    return { isValid: true, version: version || undefined };
  }

  return { isValid: false };
}

/**
 * Converts an ArrayBuffer to a hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes a deterministic SHA-256 content hash for a PDF file or buffer.
 * 
 * Strategy:
 * - Files <= 16MB: Full byte SHA-256 hash.
 * - Files > 16MB: Fast composite hash (First 2MB + Middle 2MB + Last 2MB + File Size)
 *   to avoid main-thread browser freezing on massive 500-page dissertations.
 */
export async function computePdfIdentityHash(
  fileOrBuffer: File | Blob | ArrayBuffer
): Promise<PdfHashResult> {
  let buffer: ArrayBuffer;
  let sizeBytes: number;

  if (fileOrBuffer instanceof ArrayBuffer) {
    buffer = fileOrBuffer;
    sizeBytes = buffer.byteLength;
  } else {
    sizeBytes = fileOrBuffer.size;
    // For smaller files, load full buffer
    if (sizeBytes <= 16 * 1024 * 1024) {
      buffer = await fileOrBuffer.arrayBuffer();
    } else {
      // Composite slice for large files
      const CHUNK_SIZE = 2 * 1024 * 1024;
      const head = await fileOrBuffer.slice(0, CHUNK_SIZE).arrayBuffer();
      const midStart = Math.floor(sizeBytes / 2) - Math.floor(CHUNK_SIZE / 2);
      const mid = await fileOrBuffer.slice(midStart, midStart + CHUNK_SIZE).arrayBuffer();
      const tail = await fileOrBuffer.slice(sizeBytes - CHUNK_SIZE, sizeBytes).arrayBuffer();

      // Concatenate slices + 8-byte big-endian size
      const combined = new Uint8Array(head.byteLength + mid.byteLength + tail.byteLength + 8);
      combined.set(new Uint8Array(head), 0);
      combined.set(new Uint8Array(mid), head.byteLength);
      combined.set(new Uint8Array(tail), head.byteLength + mid.byteLength);
      
      const view = new DataView(combined.buffer);
      view.setBigUint64(head.byteLength + mid.byteLength + tail.byteLength, BigInt(sizeBytes));

      buffer = combined.buffer;
    }
  }

  // Validate PDF header magic bytes
  const magicCheck = validatePdfMagicBytes(buffer);
  if (!magicCheck.isValid) {
    throw new Error('Invalid file format: Selected file is not a valid PDF document (missing %PDF- header).');
  }

  // Cryptographic digest using Web Cryptography API
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const sha256 = bufferToHex(hashBuffer);

  return {
    sha256,
    sizeBytes,
    isValidPdf: true,
    formatVersion: magicCheck.version,
  };
}
