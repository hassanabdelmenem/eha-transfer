import React from 'react';
import { format } from 'date-fns';
import { Building, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Referral, Facility, User } from '../../../types';
import { useI18n } from '../../../i18n';

const hhmm = (iso?: string) => {
  const t = Date.parse(iso || '');
  return Number.isNaN(t) ? null : format(new Date(t), 'HH:mm');
};

/** When the referral last entered `status`, from its history. */
const enteredAt = (referral: Referral, status: Referral['status']) =>
  [...(Array.isArray(referral.statusHistory) ? referral.statusHistory : [])].reverse().find(h => h.status === status)?.timestamp;

export interface TransferJourneyCardProps {
  referral: Referral;
  fromFacility?: Facility;
  toFacility?: Partial<Facility> & { name: string; isExternal?: boolean };
  usersById: Map<string, User>;
}

export const TransferJourneyCard: React.FC<TransferJourneyCardProps> = ({
  referral,
  fromFacility,
  toFacility,
}) => {
  const { t } = useI18n();
  // The outbound leg follows the referral. It used to read "Pending" both before
  // dispatch and after arrival, so an admitted patient looked never to have left.
  const leftAt = hhmm(enteredAt(referral, 'in_transit'));
  const arrivedAt = hhmm(enteredAt(referral, 'arrived'));
  const moved = referral.status === 'in_transit';
  const landed = ['arrived', 'admitted', 'discharged'].includes(referral.status);
  const outboundLine = moved
    ? (leftAt ? t('cards.inTransitLeft', { time: leftAt }) : t('cards.inTransit'))
    : landed
      ? (arrivedAt ? t('cards.arrivedAt', { time: arrivedAt }) : t('cards.arrived'))
      : ['rejected', 'cancelled'].includes(referral.status)
        ? t('cards.notDispatched')
        : t('cards.waitingDispatch');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cards.journey')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 relative">
          <div className="absolute start-4 top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-800" />
          
          <div className="relative flex gap-4">
            <div className="z-10 rounded p-1.5 bg-blue-100 text-blue-700 ring-2 ring-white dark:ring-slate-900">
              <Building className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{fromFacility?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('cards.origin')}</p>
            </div>
          </div>

          <div className="relative flex gap-4">
            <div className={`z-10 rounded p-1.5 ring-2 ring-white dark:ring-slate-900 ${moved ? 'bg-info-100 text-info-700' : landed ? 'bg-success-100 text-success-700' : 'bg-slate-100 text-slate-500 dark:text-slate-400'}`}>
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('cards.outbound')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{outboundLine}</p>
            </div>
          </div>

          <div className="relative flex gap-4">
            <div className="z-10 rounded p-1.5 bg-blue-100 text-blue-700 ring-2 ring-white dark:ring-slate-900">
              <Building className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{toFacility?.name}</p>
                {toFacility && Boolean(toFacility.isExternal) && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-semibold">
                    {t('cards.external')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('cards.destination', { bed: referral.requiredBedType })}
              </p>
            </div>
          </div>

          {referral.transferType && referral.transferType !== 'one_way' && (
            <>
              <div className="relative flex gap-4">
                <div className="z-10 rounded p-1.5 bg-slate-100 text-slate-500 dark:text-slate-400 ring-2 ring-white dark:ring-slate-900">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('cards.returnTransfer')}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('cards.pendingReturn')}</p>
                </div>
              </div>
              
              <div className="relative flex gap-4">
                <div className="z-10 rounded p-1.5 bg-blue-100 text-blue-700 ring-2 ring-white dark:ring-slate-900">
                  <Building className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{fromFacility?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('cards.finalReturn')}</p>
                </div>
              </div>
            </>
          )}
        </div>

      </CardContent>
    </Card>
  );
};
