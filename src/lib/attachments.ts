import type { Attachment, Referral } from '../types';

/**
 * Clinical attachments (ECGs, images, PDF reports).
 *
 * They used to be saved as `blob:` URLs, which only open in the sending
 * browser tab, so the receiving hospital never saw them (audit S1, 3 Oct 2026).
 * This project runs on the free Spark plan, where new projects cannot use Cloud
 * Storage, so each file is stored as a data URL in its own Firestore document,
 * `referrals/{referralId}/attachments/{attachmentId}` (1 MiB document limit),
 * written in the same batch as the referral. The referral keeps only the details.
 *
 * Every image is re-drawn as JPEG: smaller, and an SVG cannot carry script any more.
 */

/** Data-URL characters per stored file: comfortably under Firestore's 1 MiB document limit. */
export const MAX_STORED_CHARS = 700_000;
/** Per referral, so one batch (referral + files) stays well under the 10 MiB request limit. */
export const MAX_ATTACHMENTS = 5;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
/** Tried in order until the JPEG fits; each step is never larger than the one before. */
const ENCODINGS: ReadonlyArray<[maxDim: number, quality: number]> = [[1600, 0.8], [1600, 0.65], [1280, 0.6], [1024, 0.55], [800, 0.5]];

export type AttachmentErrorCode = 'badType' | 'imageTooLarge' | 'pdfTooLarge' | 'tooMany';

export class AttachmentError extends Error {
  constructor(public readonly code: AttachmentErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AttachmentError';
  }
}

/** One stored file: the document under referrals/{id}/attachments. */
export interface AttachmentFile {
  id: string;
  name: string;
  mimeType: string;
  data: string;
}

export type Rasterize = (file: Blob, maxDim: number, quality: number) => Promise<string>;

/** Draws the image (any browser-decodable type, SVG included) onto a canvas and returns a JPEG data URL. */
export const rasterizeToJpeg: Rasterize = (file, maxDim, quality) => new Promise((resolve, reject) => {
  const src = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    try {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round((img.naturalWidth || maxDim) * scale));
      canvas.height = Math.max(1, Math.round((img.naturalHeight || maxDim) * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas unavailable');
      ctx.fillStyle = '#fff'; // transparent PNG/SVG areas become white, not black
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    } catch (err) {
      reject(err);
    } finally {
      URL.revokeObjectURL(src);
    }
  };
  img.onerror = () => { URL.revokeObjectURL(src); reject(new AttachmentError('badType')); };
  img.src = src;
});

export const readAsDataUrl = (file: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const extOf = (name: string) => `.${name.split('.').pop()?.toLowerCase() ?? ''}`;
const randomId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/** Turns a picked file into an attachment whose `url` is a data URL small enough to store. */
export async function prepareAttachment(
  file: File,
  { rasterize = rasterizeToJpeg, readAsDataUrl: read = readAsDataUrl, newId = randomId }:
    { rasterize?: Rasterize; readAsDataUrl?: (f: Blob) => Promise<string>; newId?: () => string } = {}
): Promise<Attachment> {
  const ext = extOf(file.name);
  const isPdf = file.type === 'application/pdf' || (!file.type && ext === '.pdf');
  const isImage = IMAGE_TYPES.includes(file.type) || (!file.type && IMAGE_EXTENSIONS.includes(ext));

  if (isPdf) {
    // Base64 is ~4/3 the size; check before reading so a large file is never loaded.
    if (Math.ceil(file.size / 3) * 4 > MAX_STORED_CHARS) throw new AttachmentError('pdfTooLarge');
    const data = await read(file);
    if (data.length > MAX_STORED_CHARS) throw new AttachmentError('pdfTooLarge');
    return { id: newId(), name: file.name, type: 'document', mimeType: 'application/pdf', size: file.size, url: data };
  }
  if (isImage) {
    for (const [maxDim, quality] of ENCODINGS) {
      // Sequential on purpose: stop at the first encoding that fits.
      // eslint-disable-next-line no-await-in-loop
      const data = await rasterize(file, maxDim, quality);
      if (data.length <= MAX_STORED_CHARS) {
        return { id: newId(), name: file.name, type: 'image', mimeType: 'image/jpeg', size: Math.round(data.length * 0.75), url: data };
      }
    }
    throw new AttachmentError('imageTooLarge');
  }
  throw new AttachmentError('badType');
}

/**
 * Separates the stored files from the referral before it is written: the files go
 * to the attachments subcollection, the referral keeps `{ id, name, type, mimeType,
 * size, stored: true }`. Entries without a data URL (old blob: links) are left as
 * they are.
 */
export function splitAttachments(referral: Referral): { referral: Referral; files: AttachmentFile[] } {
  const list = referral.patientData?.attachments;
  if (!Array.isArray(list) || list.length === 0) return { referral, files: [] };
  if (list.length > MAX_ATTACHMENTS) throw new AttachmentError('tooMany');
  const files: AttachmentFile[] = [];
  const kept = list.map((a) => {
    if (!a.url?.startsWith('data:')) return a;
    files.push({ id: a.id, name: a.name, mimeType: a.mimeType || 'image/jpeg', data: a.url });
    const { url: _url, ...meta } = a;
    return { ...meta, stored: true };
  });
  return { referral: { ...referral, patientData: { ...referral.patientData, attachments: kept } }, files };
}

/**
 * True for a link this app will not open. Only an inline image or PDF qualifies:
 * old blob: links worked only on the sending device, and anything else on a
 * referral document (an https page, data:text/html, an SVG) could have been
 * written there directly by its creator to phish or drop a file on the
 * receiving clinician (audit run-1, lead 11).
 */
const OPENABLE = /^data:(image\/(jpeg|png|webp|gif)|application\/pdf);base64,/;
export const isUnavailableUrl = (url: string | undefined) => !url || !OPENABLE.test(url);
