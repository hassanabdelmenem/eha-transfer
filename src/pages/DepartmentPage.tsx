import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { HodCockpit } from '../components/dashboard/HodCockpit';
import { isAdmin as checkIsAdmin } from '../lib/permissions';
import { useI18n } from '../i18n';

export const DepartmentPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdmin = checkIsAdmin(user);

  if (!user || (user.role !== 'head_of_department' && !isAdmin)) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        {t('department.accessDenied')}
      </div>
    );
  }

  if ((!user.facilityId || !user.department) && !isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        {t('department.missingConfig')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {user.department ? t('department.title', { dept: user.department }) : t('department.titleGeneric')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('department.subtitle')}
        </p>
      </div>

      <HodCockpit isDepartmentRoute={true} />
    </div>
  );
};
