import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { I18nProvider } from '../../i18n';
import { ShiftHandoverFeed } from './ShiftHandoverFeed';
import { shiftSummaryVars } from '../../i18n/notifications';
import type { ShiftLog } from '../../types';

const base = { userId: 'u1', userName: 'Dr. Sara', facilityId: 'f1', department: 'Cardiology', timestamp: new Date().toISOString(), pendingTransfersCount: 2, admittedPatientsCount: 1 };

describe('recent handovers feed in Arabic', () => {
  it('renders a keyed summary in Arabic and an older one in its stored English', () => {
    const logs: ShiftLog[] = [
      { ...base, id: 'k', summary: 'Night shift ending. 2 active transfers in progress for Cardiology department.', key: 'summary', vars: shiftSummaryVars('Night', 2, 'Cardiology') },
      { ...base, id: 'o', timestamp: new Date(Date.now() - 60_000).toISOString(), summary: 'Old handover, written in English.' },
    ];
    render(<I18nProvider arabicAvailable savedLanguage="ar"><ShiftHandoverFeed shiftLogs={logs} userFacilityId="f1" /></I18nProvider>);
    expect(screen.getByText(/انتهاء المناوبة الليلية/)).toBeInTheDocument();
    expect(screen.queryByText(/Night shift ending/)).not.toBeInTheDocument();
    expect(screen.getByText('Old handover, written in English.')).toBeInTheDocument();
  });
});
