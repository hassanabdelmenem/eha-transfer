import React from 'react';
import { Role } from '../../types';
import { 
  ShieldCheck, 
  Building2, 
  Activity, 
  Stethoscope, 
  HeartPulse, 
  Flame, 
  UserCheck 
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface RoleBadgeProps {
  role?: Role | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const ROLE_CONFIGS: Record<string, {
  label: string;
  shortLabel: string;
  category: 'admin' | 'leadership' | 'department' | 'doctor' | 'nurse' | 'er';
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  owner: {
    label: 'Platform Owner',
    shortLabel: 'Owner',
    category: 'admin',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    textClass: 'text-slate-800 dark:text-slate-200',
    borderClass: 'border-slate-300 dark:border-slate-700',
    icon: ShieldCheck,
  },
  system_admin: {
    label: 'System Administrator',
    shortLabel: 'Admin',
    category: 'admin',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    textClass: 'text-slate-800 dark:text-slate-200',
    borderClass: 'border-slate-300 dark:border-slate-700',
    icon: ShieldCheck,
  },
  medical_director: {
    label: 'Medical Director',
    shortLabel: 'Med Director',
    category: 'leadership',
    bgClass: 'bg-purple-50 dark:bg-purple-950/50',
    textClass: 'text-purple-700 dark:text-purple-300',
    borderClass: 'border-purple-200 dark:border-purple-800',
    icon: Building2,
  },
  hospital_manager: {
    label: 'Hospital Manager',
    shortLabel: 'Hospital Mgr',
    category: 'leadership',
    bgClass: 'bg-purple-50 dark:bg-purple-950/50',
    textClass: 'text-purple-700 dark:text-purple-300',
    borderClass: 'border-purple-200 dark:border-purple-800',
    icon: Building2,
  },
  deputy_manager: {
    label: 'Deputy Manager',
    shortLabel: 'Deputy Mgr',
    category: 'leadership',
    bgClass: 'bg-purple-50 dark:bg-purple-950/50',
    textClass: 'text-purple-700 dark:text-purple-300',
    borderClass: 'border-purple-200 dark:border-purple-800',
    icon: Building2,
  },
  head_of_department: {
    label: 'Head of Department',
    shortLabel: 'Dept Head',
    category: 'department',
    bgClass: 'bg-amber-50 dark:bg-amber-950/50',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-200 dark:border-amber-800',
    icon: Activity,
  },
  consultant: {
    label: 'Consultant Physician',
    shortLabel: 'Consultant',
    category: 'doctor',
    bgClass: 'bg-blue-50 dark:bg-blue-950/50',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-800',
    icon: Stethoscope,
  },
  specialist: {
    label: 'Clinical Specialist',
    shortLabel: 'Specialist',
    category: 'doctor',
    bgClass: 'bg-blue-50 dark:bg-blue-950/50',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-800',
    icon: Stethoscope,
  },
  resident: {
    label: 'Resident Physician',
    shortLabel: 'Resident',
    category: 'doctor',
    bgClass: 'bg-blue-50 dark:bg-blue-950/50',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-800',
    icon: Stethoscope,
  },
  clinician: {
    label: 'Clinician',
    shortLabel: 'Clinician',
    category: 'doctor',
    bgClass: 'bg-blue-50 dark:bg-blue-950/50',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-800',
    icon: Stethoscope,
  },
  nursing_supervisor: {
    label: 'Nursing Supervisor',
    shortLabel: 'Nurse Super',
    category: 'nurse',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/50',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    icon: HeartPulse,
  },
  nurse: {
    label: 'Staff Nurse',
    shortLabel: 'Nurse',
    category: 'nurse',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/50',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    icon: HeartPulse,
  },
  er_official: {
    label: 'ER Operations Official',
    shortLabel: 'ER Official',
    category: 'er',
    bgClass: 'bg-rose-50 dark:bg-rose-950/50',
    textClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-200 dark:border-rose-800',
    icon: Flame,
  },
  er_room: {
    label: 'ER Room Coordinator',
    shortLabel: 'ER Room',
    category: 'er',
    bgClass: 'bg-rose-50 dark:bg-rose-950/50',
    textClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-200 dark:border-rose-800',
    icon: Flame,
  },
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role = 'clinician',
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : 'clinician';
  const config = ROLE_CONFIGS[normalizedRole] || {
    label: normalizedRole.replace(/_/g, ' '),
    shortLabel: normalizedRole.replace(/_/g, ' '),
    category: 'doctor',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    textClass: 'text-slate-700 dark:text-slate-300',
    borderClass: 'border-slate-200 dark:border-slate-700',
    icon: UserCheck,
  };

  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border shadow-sm transition-colors select-none',
        config.bgClass,
        config.textClass,
        config.borderClass,
        sizeClasses[size],
        className
      )}
      title={config.label}
    >
      {showIcon && <IconComponent className={cn('shrink-0', iconSizes[size])} aria-hidden="true" />}
      <span className="truncate">{config.label}</span>
    </span>
  );
};
