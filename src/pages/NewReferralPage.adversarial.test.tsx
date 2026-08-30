import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NewReferralPage } from './NewReferralPage';
import * as toastModule from '../lib/toast';

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'clinician-test-1',
      name: 'Dr. Tarek Cardiology',
      role: 'clinician',
      facilityId: 'f1',
      verified: true,
    },
  }),
}));

// Mock DataContext
const mockAddReferral = vi.fn();
vi.mock('../contexts/DataContext', () => ({
  useData: () => ({
    facilities: [
      {
        id: 'f1',
        name: 'Ismailia Primary Center',
        departments: ['General', 'Cardiology'],
        capacity: { Ward: { total: 10, occupied: 2 }, ICU: { total: 4, occupied: 1 }, CCU: { total: 2, occupied: 0 }, PICU: { total: 0, occupied: 0 } },
        type: 'primary_care',
        location: 'Ismailia',
      },
      {
        id: 'f2',
        name: 'Ismailia Medical Complex',
        departments: ['Cardiology', 'Emergency', 'ICU'],
        capacity: { Ward: { total: 50, occupied: 10 }, ICU: { total: 20, occupied: 5 }, CCU: { total: 10, occupied: 2 }, PICU: { total: 5, occupied: 1 } },
        type: 'tertiary_care',
        location: 'Ismailia',
      },
    ],
    addReferral: mockAddReferral,
    isOnline: true,
  }),
}));

// Mock URL.createObjectURL
let mockObjectUrlCounter = 0;
globalThis.URL.createObjectURL = vi.fn(() => `blob:mock-url-${++mockObjectUrlCounter}`);

describe('NewReferralPage - Adversarial Media Upload & Boundary Testing', () => {
  let toastSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockObjectUrlCounter = 0;
    toastSpy = vi.spyOn(toastModule, 'showToast').mockImplementation(() => 'toast-id');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const getFileInput = () => {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    return fileInputs[0] as HTMLInputElement;
  };

  describe('Byte Boundary Conditions (15MB Limit)', () => {
    it('accepts file at exact 15MB boundary (15 * 1024 * 1024 = 15,728,640 bytes)', async () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      const fileInput = getFileInput();
      const exact15MB = 15 * 1024 * 1024;
      const file = new File(['x'], 'exact_15mb_ecg.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: exact15MB });

      fireEvent.change(fileInput, { target: { files: [file] } });

      // No error toast should be emitted
      expect(toastSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/exceeds the 15MB size limit/i),
        'error'
      );

      await waitFor(() => {
        expect(screen.getByAltText('exact_15mb_ecg.png')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('rejects file at 15MB + 1 byte boundary (15,728,641 bytes) and resets input', () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      const fileInput = getFileInput();
      const overBoundary = 15 * 1024 * 1024 + 1;
      const file = new File(['x'], 'oversized_scan.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: overBoundary });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(toastSpy).toHaveBeenCalledWith(
        expect.stringMatching(/exceeds the 15MB size limit \(15\.0MB\)/i),
        'error'
      );

      // Attachment should not be present in DOM
      expect(screen.queryByText('oversized_scan.pdf')).not.toBeInTheDocument();
    });

    it('handles 0-byte file without throwing exceptions or NaN errors', async () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      const fileInput = getFileInput();
      const zeroByteFile = new File([], 'empty_trace.png', { type: 'image/png' });
      Object.defineProperty(zeroByteFile, 'size', { value: 0 });

      fireEvent.change(fileInput, { target: { files: [zeroByteFile] } });

      expect(toastSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/exceeds the 15MB size limit/i),
        'error'
      );

      await waitFor(() => {
        expect(screen.getByAltText('empty_trace.png')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Malicious / Disallowed File Extensions', () => {
    const maliciousFiles = [
      { name: 'malware.exe', type: 'application/x-msdownload' },
      { name: 'trojan.zip', type: 'application/zip' },
      { name: 'script.bat', type: 'application/x-bat' },
      { name: 'exploit.sh', type: 'application/x-sh' },
      { name: 'payload.vbs', type: 'text/vbscript' },
      { name: 'library.dll', type: 'application/octet-stream' },
      { name: 'macro.docm', type: 'application/vnd.ms-word.document.macroEnabled.12' },
      { name: 'code.js', type: 'text/javascript' },
      { name: 'page.html', type: 'text/html' },
    ];

    maliciousFiles.forEach(({ name, type }) => {
      it(`rejects disallowed file: ${name} (${type})`, () => {
        render(
          <MemoryRouter>
            <NewReferralPage />
          </MemoryRouter>
        );

        const fileInput = getFileInput();
        const file = new File(['content'], name, { type });
        Object.defineProperty(file, 'size', { value: 1024 });

        fireEvent.change(fileInput, { target: { files: [file] } });

        expect(toastSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Unsupported file type for/i),
          'error'
        );

        expect(screen.queryByText(name)).not.toBeInTheDocument();
        expect(screen.queryByAltText(name)).not.toBeInTheDocument();
      });
    });
  });

  describe('MIME Type Edge Cases and Whitelist Conformance', () => {
    const validFormats = [
      { name: 'ecg.jpg', type: 'image/jpeg', isImage: true },
      { name: 'ecg.jpeg', type: 'image/jpeg', isImage: true },
      { name: 'scan.png', type: 'image/png', isImage: true },
      { name: 'diagram.webp', type: 'image/webp', isImage: true },
      { name: 'animation.gif', type: 'image/gif', isImage: true },
      { name: 'vector.svg', type: 'image/svg+xml', isImage: true },
      { name: 'report.pdf', type: 'application/pdf', isImage: false },
    ];

    validFormats.forEach(({ name, type, isImage }) => {
      it(`accepts valid format: ${name} (${type})`, async () => {
        render(
          <MemoryRouter>
            <NewReferralPage />
          </MemoryRouter>
        );

        const fileInput = getFileInput();
        const file = new File(['test'], name, { type });
        Object.defineProperty(file, 'size', { value: 500 * 1024 }); // 500KB

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
          if (isImage) {
            expect(screen.getByAltText(name)).toBeInTheDocument();
          } else {
            expect(screen.getByText(name)).toBeInTheDocument();
          }
        }, { timeout: 2000 });
      });
    });

    it('accepts valid extension with empty MIME type (fallback handling)', async () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      const fileInput = getFileInput();
      // Simulating a file picker or OS that reports empty string for file.type
      const file = new File(['data'], 'ecg_chart.png', { type: '' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByAltText('ecg_chart.png')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Attachment List Mutation & Removal Stress', () => {
    it('supports multiple sequential uploads and selective deletion', async () => {
      render(
        <MemoryRouter>
          <NewReferralPage />
        </MemoryRouter>
      );

      const fileInput = getFileInput();

      // Upload file 1 (Image)
      const file1 = new File(['data1'], 'ecg_lead_1.png', { type: 'image/png' });
      Object.defineProperty(file1, 'size', { value: 100 * 1024 });
      fireEvent.change(fileInput, { target: { files: [file1] } });

      await waitFor(() => {
        expect(screen.getByAltText('ecg_lead_1.png')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Upload file 2 (PDF)
      const file2 = new File(['data2'], 'echo_report.pdf', { type: 'application/pdf' });
      Object.defineProperty(file2, 'size', { value: 200 * 1024 });
      fireEvent.change(fileInput, { target: { files: [file2] } });

      await waitFor(() => {
        expect(screen.getByText('echo_report.pdf')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Both should be present
      expect(screen.getByAltText('ecg_lead_1.png')).toBeInTheDocument();
      expect(screen.getByText('echo_report.pdf')).toBeInTheDocument();

      // Remove file 1
      const removeButtons = Array.from(document.querySelectorAll('button'));
      const removeBtn1 = removeButtons.find(b => b.closest('.group')?.querySelector('img[alt="ecg_lead_1.png"]'));
      if (removeBtn1) {
        fireEvent.click(removeBtn1);
      }

      await waitFor(() => {
        expect(screen.queryByAltText('ecg_lead_1.png')).not.toBeInTheDocument();
        expect(screen.getByText('echo_report.pdf')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});
