import React from 'react';
import { Pill } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Referral } from '../../../types';

interface ClinicalMedicationsCardProps {
  referral: Referral;
}

export const ClinicalMedicationsCard: React.FC<ClinicalMedicationsCardProps> = ({ referral }) => {
  if (!referral.patientData?.medications) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-emerald-700" />
          Medications & Interventions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Medications Received</p>
          <p className="text-slate-800 dark:text-slate-200 text-sm bg-slate-50 dark:bg-slate-950 p-4 rounded border border-slate-100 dark:border-slate-800 leading-relaxed">
            {referral.patientData.medications}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
