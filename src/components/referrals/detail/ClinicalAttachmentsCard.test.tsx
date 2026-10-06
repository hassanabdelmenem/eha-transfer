import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFirestoreModuleMock, getActiveFirestoreState, resetFirestoreState, seedCollection } from '../../../contexts/testUtils/mockFirestore';
import { makeReferral } from '../../../contexts/testUtils/fixtures';
import { ClinicalAttachmentsCard, clearAttachmentCache } from './ClinicalAttachmentsCard';
import { I18nProvider } from '../../../i18n';

vi.mock('firebase/firestore', () => createFirestoreModuleMock());
vi.mock('../../../lib/firebase', () => ({ db: {} }));

// Audit S1 (3 Oct 2026): the receiving hospital must actually see the ECG.
describe('ClinicalAttachmentsCard', () => {
  beforeEach(() => {
    resetFirestoreState(getActiveFirestoreState());
    clearAttachmentCache();
  });

  const renderCard = (attachments: any[]) => render(
    <I18nProvider>
      <ClinicalAttachmentsCard referral={makeReferral({ id: 'r1', patientData: { ...makeReferral().patientData, attachments } })} onSelectECG={vi.fn()} />
    </I18nProvider>
  );

  it('loads a stored attachment from the referral and shows it', async () => {
    seedCollection(getActiveFirestoreState(), 'referrals/r1/attachments', [
      { id: 'a1', name: 'ecg.jpg', mimeType: 'image/jpeg', data: 'data:image/jpeg;base64,QUJD' },
    ]);
    renderCard([{ id: 'a1', name: 'ecg.jpg', type: 'image', mimeType: 'image/jpeg', stored: true }]);
    await waitFor(() => expect(screen.getByAltText('ecg.jpg')).toHaveAttribute('src', 'data:image/jpeg;base64,QUJD'));
  });

  it('says an old attachment is unavailable instead of showing a broken image', () => {
    renderCard([{ id: 'old', name: 'old-ecg.png', type: 'image', url: 'blob:https://eha/123' }]);
    expect(screen.queryByAltText('old-ecg.png')).not.toBeInTheDocument();
    expect(screen.getByText(/not available/i)).toBeInTheDocument();
  });
});
