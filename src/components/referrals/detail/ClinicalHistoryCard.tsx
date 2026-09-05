import React from 'react';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Referral } from '../../../types';

interface ClinicalHistoryCardProps {
  referral: Referral;
}

export const ClinicalHistoryCard: React.FC<ClinicalHistoryCardProps> = ({ referral }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-700" />
          Clinical History & Presentation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Chief Complaint</p>
            <p className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData?.complaint || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Presentation & HPI</p>
            <p className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData?.presentation || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Past Medical History</p>
            <p className="text-slate-800 dark:text-slate-200 text-sm">{referral.patientData?.pastHistory || 'N/A'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
