import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NewReferralPage } from './NewReferralPage';
import * as toastModule from '../lib/toast';

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'clinician-1',
      name: 'Dr. Clinician',
      role: 'clinician',
      facilityId: 'f1',
      verified: true
    }
  })
}));

// Mock DataContext
const mockAddReferral = vi.fn();
vi.mock('../contexts/DataContext', () => ({
  useData: () => ({
    facilities: [
      { id: 'f1', name: 'Primary Clinic', departments: ['General'], capacity: { Ward: { total: 10, occupied: 0 }, ICU: { total: 2, occupied: 0 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 } }, type: 'primary_care', location: 'Ismailia' },
      { id: 'f2', name: 'Main Hospital', departments: ['Cardiology', 'Emergency'], capacity: { Ward: { total: 20, occupied: 5 }, ICU: { total: 10, occupied: 2 }, CCU: { total: 5, occupied: 1 }, PICU: { total: 2, occupied: 0 } }, type: 'tertiary_care', location: 'Ismailia' }
    ],
    addReferral: mockAddReferral,
    isOnline: true
  })
}));

// Mock URL.createObjectURL
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

describe('NewReferralPage - Clinician Access & Media Attachment Validation', () => {
  let toastSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    toastSpy = vi.spyOn(toastModule, 'showToast').mockImplementation(() => 'toast-id');
  });

  it('allows clinician role to access the new referral form without Access Denied', () => {
    render(
      <MemoryRouter>
        <NewReferralPage />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Access Denied/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Unified Hospital ID/i).length).toBeGreaterThan(0);
  });

  it('rejects files larger than 15MB with an error toast', () => {
    render(
      <MemoryRouter>
        <NewReferralPage />
      </MemoryRouter>
    );

    // Find the file input
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const fileInput = fileInputs[0] as HTMLInputElement;

    // Create a 16MB fake file
    const oversizedFile = new File(['a'.repeat(1024)], 'large-scan.pdf', { type: 'application/pdf' });
    Object.defineProperty(oversizedFile, 'size', { value: 16 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringMatching(/exceeds the 15MB size limit/i),
      'error'
    );
  });

  it('rejects files with unsupported MIME types/extensions with an error toast', () => {
    render(
      <MemoryRouter>
        <NewReferralPage />
      </MemoryRouter>
    );

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const fileInput = fileInputs[0] as HTMLInputElement;

    const invalidFile = new File(['executable'], 'malicious.exe', { type: 'application/x-msdownload' });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringMatching(/unsupported file type/i),
      'error'
    );
  });

  it('accepts valid images and PDFs within 15MB limit', async () => {
    render(
      <MemoryRouter>
        <NewReferralPage />
      </MemoryRouter>
    );

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const fileInput = fileInputs[0] as HTMLInputElement;

    const validImage = new File(['image content'], 'ecg_trace.png', { type: 'image/png' });
    Object.defineProperty(validImage, 'size', { value: 2 * 1024 * 1024 }); // 2MB

    fireEvent.change(fileInput, { target: { files: [validImage] } });

    await waitFor(() => {
      expect(screen.getByAltText('ecg_trace.png')).toBeInTheDocument();
    });
  });
});
