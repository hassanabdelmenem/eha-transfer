import { describe, it, expect, vi } from 'vitest';
import {
  prepareAttachment, splitAttachments, isUnavailableUrl, AttachmentError,
  MAX_STORED_CHARS, MAX_ATTACHMENTS,
} from './attachments';
import type { Referral } from '../types';

// Attachments used to be saved as blob: URLs, which only open in the sender's
// own tab: the receiving hospital never saw an ECG (audit S1, 3 Oct 2026).
// Now each file is stored as a data URL in referrals/{id}/attachments/{id}.

const file = (name: string, type: string, bytes: number) => new File([new Uint8Array(bytes)], name, { type });
const dataUrl = (mime: string, chars: number) => `data:${mime};base64,${'A'.repeat(chars)}`;

describe('prepareAttachment', () => {
  it('re-encodes images as JPEG within the size budget, trying smaller settings until it fits', async () => {
    const rasterize = vi.fn()
      .mockResolvedValueOnce(dataUrl('image/jpeg', MAX_STORED_CHARS + 10)) // first try too big
      .mockResolvedValueOnce(dataUrl('image/jpeg', 200_000));
    const a = await prepareAttachment(file('ecg.png', 'image/png', 3_000_000), { rasterize, newId: () => 'a1' });
    expect(a).toMatchObject({ id: 'a1', name: 'ecg.png', type: 'image', mimeType: 'image/jpeg' });
    expect(a.url!.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(rasterize).toHaveBeenCalledTimes(2);
    expect(rasterize.mock.calls[1][1]).toBeLessThanOrEqual(rasterize.mock.calls[0][1]); // never larger
  });

  it('turns SVG and GIF into plain JPEG pixels (an SVG can carry script)', async () => {
    const rasterize = vi.fn().mockResolvedValue(dataUrl('image/jpeg', 1000));
    const a = await prepareAttachment(file('chart.svg', 'image/svg+xml', 5000), { rasterize, newId: () => 'a2' });
    expect(a.mimeType).toBe('image/jpeg');
    expect(a.url).not.toMatch(/svg/);
  });

  it('refuses an image that cannot be made small enough', async () => {
    const rasterize = vi.fn().mockResolvedValue(dataUrl('image/jpeg', MAX_STORED_CHARS + 1));
    await expect(prepareAttachment(file('huge.jpg', 'image/jpeg', 9_000_000), { rasterize })).rejects.toThrow(AttachmentError);
  });

  it('keeps a small PDF as it is and refuses a large one', async () => {
    const readAsDataUrl = vi.fn().mockResolvedValue(dataUrl('application/pdf', 50_000));
    const pdf = await prepareAttachment(file('labs.pdf', 'application/pdf', 30_000), { readAsDataUrl, newId: () => 'p1' });
    expect(pdf).toMatchObject({ id: 'p1', type: 'document', mimeType: 'application/pdf', size: 30_000 });
    await expect(prepareAttachment(file('scan.pdf', 'application/pdf', 900_000), { readAsDataUrl }))
      .rejects.toMatchObject({ code: 'pdfTooLarge' });
  });

  it('refuses anything that is not an image or a PDF (video does not fit the free plan)', async () => {
    await expect(prepareAttachment(file('clip.mp4', 'video/mp4', 1000), {})).rejects.toMatchObject({ code: 'badType' });
  });
});

describe('splitAttachments', () => {
  const ref = (attachments: any[]) => ({ id: 'r1', patientData: { name: 'P', attachments } } as unknown as Referral);

  it('moves data out of the referral into separate files, keeping only the details on the referral', () => {
    const { referral, files } = splitAttachments(ref([
      { id: 'a1', name: 'ecg.jpg', type: 'image', mimeType: 'image/jpeg', size: 1, url: dataUrl('image/jpeg', 10) },
      { id: 'a2', name: 'old.png', type: 'image', url: 'blob:https://x/123' },
    ]));
    expect(files).toEqual([{ id: 'a1', name: 'ecg.jpg', mimeType: 'image/jpeg', data: dataUrl('image/jpeg', 10) }]);
    expect(referral.patientData.attachments[0]).toEqual({ id: 'a1', name: 'ecg.jpg', type: 'image', mimeType: 'image/jpeg', size: 1, stored: true });
    expect(referral.patientData.attachments[1].url).toBe('blob:https://x/123'); // legacy entries untouched
  });

  it('caps a referral at the attachment limit', () => {
    const many = Array.from({ length: MAX_ATTACHMENTS + 1 }, (_, i) => ({ id: `a${i}`, name: 'x', type: 'image', url: dataUrl('image/jpeg', 1) }));
    expect(() => splitAttachments(ref(many))).toThrow(AttachmentError);
  });

  it('leaves a referral without attachments alone', () => {
    const r = { id: 'r1', patientData: { name: 'P' } } as unknown as Referral;
    expect(splitAttachments(r)).toEqual({ referral: r, files: [] });
  });
});

describe('isUnavailableUrl', () => {
  it('flags the old blob: links that only ever worked on the sending device', () => {
    expect(isUnavailableUrl('blob:https://eha/abc')).toBe(true);
    expect(isUnavailableUrl(undefined)).toBe(true);
    expect(isUnavailableUrl(dataUrl('image/jpeg', 4))).toBe(false);
  });
});
