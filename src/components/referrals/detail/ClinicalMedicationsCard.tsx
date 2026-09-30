import React from 'react';
import { Pill } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Referral } from '../../../types';
import { useI18n } from '../../../i18n';

interface ClinicalMedicationsCardProps {
  referral: Referral;
}

export const ClinicalMedicationsCard: React.FC<ClinicalMedicationsCardProps> = ({ referral }) => {
  const { t } = useI18n();
  if (!referral.patientData?.medications) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('cards.meds')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('cards.medsReceived')}</p>
          <p dir="auto" className="text-slate-800 dark:text-slate-200 text-sm bg-slate-50 dark:bg-slate-950 p-4 rounded border border-slate-100 dark:border-slate-800 leading-relaxed">
            {referral.patientData.medications}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
