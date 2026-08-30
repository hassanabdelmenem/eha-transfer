import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PatientConsentCard } from './PatientConsentCard';

describe('PatientConsentCard', () => {
  it('renders patient consent card and handles acceptance and decline', () => {
    const onConsent = vi.fn();
    const onDecline = vi.fn();
    const setShowDeclineForm = vi.fn();
    const setDeclineReason = vi.fn();

    const { rerender } = render(
      <PatientConsentCard
        toFacility={{ name: 'Ismailia General' }}
        showDeclineForm={false}
        setShowDeclineForm={setShowDeclineForm}
        declineReason=""
        setDeclineReason={setDeclineReason}
        consentBusy={false}
        onConsent={onConsent}
        onDecline={onDecline}
      />
    );

    expect(screen.getByText(/Patient Consent/i)).toBeInTheDocument();
    expect(screen.getByText(/transfer to Ismailia General/i)).toBeInTheDocument();

    const consentBtn = screen.getByRole('button', { name: /accepted transfer/i });
    fireEvent.click(consentBtn);
    expect(onConsent).toHaveBeenCalledTimes(1);

    const declineBtn = screen.getByRole('button', { name: /declined this facility/i });
    fireEvent.click(declineBtn);
    expect(setShowDeclineForm).toHaveBeenCalledWith(true);

    // Rerender with decline form open
    rerender(
      <PatientConsentCard
        toFacility={{ name: 'Ismailia General' }}
        showDeclineForm={true}
        setShowDeclineForm={setShowDeclineForm}
        declineReason="Patient preference"
        setDeclineReason={setDeclineReason}
        consentBusy={false}
        onConsent={onConsent}
        onDecline={onDecline}
      />
    );

    const confirmDeclineBtn = screen.getByRole('button', { name: /confirm decline & re-route/i });
    fireEvent.click(confirmDeclineBtn);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });
});
