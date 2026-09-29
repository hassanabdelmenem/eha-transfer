import type React from 'react';
import { Referral, Facility, User, BedType, ShiftLog, ShiftAssignment } from '../../types';
import { DirectAdmission } from '../../contexts/DataContext';

export type ClinicianSegment = 'you' | 'them' | 'moving' | 'inbound';

export interface EscalationAlertBannerProps {
  referral: Referral;
  onAction?: (referral: Referral) => void;
  actionLabel?: string;
  /** A second, outline action beside the primary ("Hand to admin"). */
  secondaryAction?: { label: string; onClick: (referral: Referral) => void };
  referrerPhone?: string;
  referringFacilityName?: string;
  onCallReferrer?: (phone: string) => void;
}

export interface ReferralCockpitCardProps {
  referral: Referral;
  variant?: 'clinician' | 'hod' | 'manager' | 'er_outbound' | 'er_inbound' | 'nurse';
  actionLabel?: string;
  actionSentence?: string;
  /** Replaces the clinician card's default "bed · departments" line. */
  contextLine?: React.ReactNode;
  onAction?: (id: string) => void;
  onSummary?: (referral: Referral) => void;
  onApprove?: (id: string) => Promise<void>;
  onAccept?: (id: string) => Promise<void>;
  onDispatch?: (id: string) => Promise<void>;
  onConfirmArrival?: (id: string) => Promise<void>;
  onAdmit?: (id: string, bedType: BedType) => Promise<void>;
  onSaveEscort?: (id: string, name: string, phone: string) => Promise<void>;
  getFacilityName?: (id: string) => string;
  getUserName?: (id: string) => string | undefined;
  referrerPhone?: string;
  approverName?: string;
  approverDept?: string;
  approvedAt?: string;
  /** Epoch ms for the SLA clock on queue cards; the parent owns the tick. */
  now?: number;
  busy?: boolean;
}

export interface FacilityAnalyticsChartsProps {
  facilityReferrals: Referral[];
  facilityAdmissions: DirectAdmission[];
  userFacilityId?: string;
}

export interface ShiftHandoverFeedProps {
  shiftLogs: ShiftLog[];
  userFacilityId?: string;
  userDepartment?: string;
  limit?: number;
}
