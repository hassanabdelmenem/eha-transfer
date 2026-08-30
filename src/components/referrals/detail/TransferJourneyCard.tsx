import React from 'react';
import { Building, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { ReferralTimeline } from '../ReferralTimeline';
import { Referral, Facility, User } from '../../../types';

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
  usersById,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Journey</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 relative">
          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-800" />
          
          <div className="relative flex gap-4">
            <div className="z-10 rounded p-1.5 bg-blue-100 text-blue-700 ring-2 ring-white dark:ring-slate-900">
              <Building className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{fromFacility?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Origin</p>
            </div>
          </div>

          <div className="relative flex gap-4">
            <div className="z-10 rounded p-1.5 bg-slate-100 text-slate-400 ring-2 ring-white dark:ring-slate-900">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Outbound Transfer</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {referral.status === 'in_transit' ? 'Currently in transit' : 'Pending'}
              </p>
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
                    External
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Destination ({referral.requiredBedType})
              </p>
            </div>
          </div>

          {referral.transferType && referral.transferType !== 'one_way' && (
            <>
              <div className="relative flex gap-4">
                <div className="z-10 rounded p-1.5 bg-slate-100 text-slate-400 ring-2 ring-white dark:ring-slate-900">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Return Transfer</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pending Return</p>
                </div>
              </div>
              
              <div className="relative flex gap-4">
                <div className="z-10 rounded p-1.5 bg-blue-100 text-blue-700 ring-2 ring-white dark:ring-slate-900">
                  <Building className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{fromFacility?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Final Return</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-0 relative">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">Timeline</h4>
          <ReferralTimeline referral={referral} usersById={usersById} />
        </div>
      </CardContent>
    </Card>
  );
};
