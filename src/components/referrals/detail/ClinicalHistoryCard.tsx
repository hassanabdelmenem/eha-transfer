import React from 'react';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Referral } from '../../../types';
import { useI18n } from '../../../i18n';

interface ClinicalHistoryCardProps {
  referral: Referral;
}

export const ClinicalHistoryCard: React.FC<ClinicalHistoryCardProps> = ({ referral }) => {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('cards.clinicalHistory')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('cards.complaint')}</p>
            <p dir="auto" className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData?.complaint || t('common.notApplicable')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('cards.hpi')}</p>
            <p dir="auto" className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData?.presentation || t('common.notApplicable')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('cards.pmh')}</p>
            <p dir="auto" className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData?.pastHistory || t('common.notApplicable')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
