import React, { forwardRef } from 'react';
import { Referral, User, Facility } from '../../types';
import { format } from 'date-fns';

interface PrintableSummaryProps {
  referral: Referral;
  history: Referral['statusHistory'];
  users: User[];
  facilities: Facility[];
}

// On a printed clinical summary a blank reads as an omission rather than as
// "not recorded", so absent vitals are shown explicitly.
const NOT_RECORDED = '—';
const vital = (value: number | undefined, unit: string) =>
  value === undefined ? NOT_RECORDED : `${value}${unit}`;

export const PrintableSummary = forwardRef<HTMLDivElement, PrintableSummaryProps>(
  ({ referral, history, users, facilities }, ref) => {
    const { patientData } = referral;
    const facilitiesById = React.useMemo(() => new Map(facilities.map(f => [f.id, f])), [facilities]);
    const usersById = React.useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    const fromFacility = facilitiesById.get(referral.referringFacilityId);
    const toFacility = facilitiesById.get(referral.receivingFacilityId);

    return (
      <div ref={ref} className="p-8 bg-white text-black text-sm font-sans" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold uppercase mb-1">Clinical Summary</h1>
            <p className="text-gray-600 font-mono text-xs">ID: {referral.id}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase text-gray-500">Generated On</p>
            <p>{format(new Date(), 'PPpp')}</p>
          </div>
        </div>

        {/* Transfer Details */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded">
            <p className="text-xs font-bold uppercase text-gray-500">From</p>
            <p className="font-bold">{fromFacility?.name || 'Unknown'}</p>
            <p className="text-xs text-gray-600 mt-1">Status: {referral.status.replace(/_/g, ' ')}</p>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded">
            <p className="text-xs font-bold uppercase text-gray-500">To</p>
            <p className="font-bold">{toFacility?.name || 'Pending/Auto'}</p>
            <p className="text-xs text-gray-600 mt-1">Requested Bed: {referral.requiredBedType.replace(/_/g, ' ')}</p>
          </div>
        </div>

        {/* Patient Details */}
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase">Patient Demographics</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">Name</p>
              <p className="font-bold">{patientData.name}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">Age / Gender</p>
              <p>{patientData.age} • {patientData.gender}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">Identifiers</p>
              <p>Hosp: {patientData.hospitalId}</p>
              {patientData.nationalId && <p>NID: {patientData.nationalId}</p>}
            </div>
          </div>
        </div>

        {/* Clinical Info */}
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase">Clinical Information</h2>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Primary Diagnosis</p>
            <p className="font-medium">{patientData.diagnosis}</p>
          </div>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Clinical Notes</p>
            <p className="whitespace-pre-wrap text-sm">{patientData.clinicalNotes}</p>
          </div>
        </div>

        {/* Vitals */}
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase">Vital Signs</h2>
          <div className="flex gap-6">
            <p><span className="font-bold">HR:</span> {vital(patientData.vitalSigns.hr, ' bpm')}</p>
            <p><span className="font-bold">BP:</span> {patientData.vitalSigns.bp || NOT_RECORDED}</p>
            <p><span className="font-bold">SpO2:</span> {vital(patientData.vitalSigns.spo2, '%')}</p>
            <p><span className="font-bold">Temp:</span> {vital(patientData.vitalSigns.temp, '°C')}</p>
            <p><span className="font-bold">RR:</span> {vital(patientData.vitalSigns.rr, ' /min')}</p>
          </div>
        </div>

        {/* Investigations */}
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase">Investigations & Labs</h2>
          <p className="whitespace-pre-wrap text-sm">{patientData.investigations || 'No lab results recorded.'}</p>
        </div>
        
        {/* Attachments List */}
        {patientData.attachments && patientData.attachments.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase">Attachments</h2>
            <ul className="list-disc pl-5">
              {patientData.attachments.map(att => (
                <li key={att.id} className="text-sm">{att.name} ({att.type.toUpperCase()})</li>
              ))}
            </ul>
          </div>
        )}

        {/* Timeline (Text-based for print) */}
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase">Event Timeline</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 text-xs uppercase text-gray-500">Date/Time</th>
                <th className="py-2 text-xs uppercase text-gray-500">Status</th>
                <th className="py-2 text-xs uppercase text-gray-500">User</th>
              </tr>
            </thead>
            <tbody>
              {(history || []).map((sh, idx) => {
                const u = usersById.get(sh.userId);
                return (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 text-xs font-mono">{format(new Date(sh.timestamp), 'MMM d, yyyy HH:mm')}</td>
                    <td className="py-2 font-medium capitalize">{sh.status.replace(/_/g, ' ')}</td>
                    <td className="py-2 text-sm">{u ? u.name : 'System'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);
PrintableSummary.displayName = 'PrintableSummary';
