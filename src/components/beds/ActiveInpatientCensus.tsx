import React from 'react';
import { formatDayMonthClock } from '../../i18n/format';
import { DirectAdmission } from '../../contexts/DataContext';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { UserMinus, Users, Calendar, Building, Hash } from 'lucide-react';
import { useI18n } from '../../i18n';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export interface ActiveInpatientCensusProps {
  admissions: DirectAdmission[];
  onDischarge: (id: string) => Promise<void> | void;
  dischargingId?: string | null;
  title?: string;
  className?: string;
}

export const ActiveInpatientCensus: React.FC<ActiveInpatientCensusProps> = ({
  admissions,
  onDischarge,
  dischargingId = null,
  title,
  className = '',
}) => {
  const { t, lang } = useI18n();
  // Discharge frees the bed for the whole network at once, so it asks first.
  const [confirming, setConfirming] = React.useState<DirectAdmission | null>(null);
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {title ?? t('beds.censusTitle')}
        </h2>
        {admissions.length > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            {t('beds.active', { count: admissions.length })}
          </span>
        )}
      </div>

      {admissions.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 dark:text-slate-400 border-dashed shadow-none bg-slate-50/50 dark:bg-slate-900/20">
          <div className="flex flex-col items-center justify-center gap-2">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-medium">{t('beds.noDirect')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              {t('beds.noDirectSub')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {admissions.map((admission) => {
            const isDischarging = dischargingId === admission.id;
            const formattedDate = admission.admittedAt
              ? formatDayMonthClock(new Date(admission.admittedAt), lang)
              : t('beds.unknownDate');

            return (
              <Card
                key={admission.id}
                data-testid={`active-admission-${admission.id}`}
                className="border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {admission.patientName}
                      </h3>
                      <Badge variant="info">{admission.bedType}</Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
                        <Hash className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        {t('referralList.hid', { id: admission.hospitalId })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        <bdi>{admission.department}</bdi>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isDischarging}
                      className="border-critical-200 dark:border-critical-900 text-critical-600 dark:text-critical-400 hover:bg-critical-50 dark:hover:bg-critical-950/30 px-4 font-semibold"
                      onClick={() => setConfirming(admission)}
                    >
                      <UserMinus className="w-4 h-4 me-2" />
                      {t('beds.discharge')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <ConfirmDialog
        open={!!confirming}
        title={t('dischargeConfirm.title', { patient: confirming?.patientName ?? '' })}
        body={t('dischargeConfirm.body')}
        confirmLabel={t('dischargeConfirm.confirm')}
        onCancel={() => setConfirming(null)}
        onConfirm={() => { const id = confirming!.id; setConfirming(null); onDischarge(id); }}
      />
    </div>
  );
};
