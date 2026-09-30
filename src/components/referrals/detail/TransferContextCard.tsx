import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Referral, User } from '../../../types';
import { useI18n } from '../../../i18n';

interface TransferContextCardProps {
  referral: Referral;
  referringUser?: User;
}

export const TransferContextCard: React.FC<TransferContextCardProps> = ({ referral, referringUser }) => {
  const { t } = useI18n();
  const receivingDepts = Array.isArray(referral.receivingDepartments)
    ? referral.receivingDepartments
    : referral.receivingDepartments
    ? [referral.receivingDepartments]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('cards.transferContext')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('cards.reason')}</p>
          <div dir="auto" className="p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
            {referral.reasonForReferral}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('cards.physician')}</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{referringUser?.name || t('common.unknown')}</p>
            {referringUser?.phoneNumber && (
              <p className="text-xs text-slate-600 font-mono mt-0.5">📞 {referringUser.phoneNumber}</p>
            )}
            {referringUser?.email && (
              <p className="text-xs text-slate-600 mt-0.5">✉️ {referringUser.email}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('cards.targetDept')}</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              <bdi>{receivingDepts.join(', ')}</bdi> / <bdi>{referral.requiredBedType}</bdi>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
