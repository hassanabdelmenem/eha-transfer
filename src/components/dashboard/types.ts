import { Referral, Facility, User, BedType, ShiftLog, ShiftAssignment } from '../../types';
import { DirectAdmission } from '../../contexts/DataContext';

export type ClinicianSegment = 'you' | 'them' | 'moving' | 'inbound';

export interface DashboardMetric {
  label: string;
  value: number;
  valueColor: string;
  bg: string;
  labelColor: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
}

export interface DashboardStatGridProps {
  metrics?: DashboardMetric[];
  loading?: boolean;
  facilityReferrals?: Referral[];
}

export interface EscalationAlertBannerProps {
  referral: Referral;
  onAction?: (referral: Referral) => void;
  actionLabel?: string;
  referrerPhone?: string;
  referringFacilityName?: string;
  onCallReferrer?: (phone: string) => void;
}

export interface ReferralCockpitCardProps {
  referral: Referral;
  variant?: 'clinician' | 'hod' | 'manager' | 'er_outbound' | 'er_inbound' | 'nurse';
  actionLabel?: string;
  actionSentence?: string;
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
