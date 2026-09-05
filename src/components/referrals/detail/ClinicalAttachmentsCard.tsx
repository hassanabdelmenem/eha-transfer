import React from 'react';
import { Download, FileText, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Referral } from '../../../types';

interface ClinicalAttachmentsCardProps {
  referral: Referral;
  onSelectECG: (url: string) => void;
}

export const ClinicalAttachmentsCard: React.FC<ClinicalAttachmentsCardProps> = ({ referral, onSelectECG }) => {
  const attachments = Array.isArray(referral.patientData?.attachments)
    ? referral.patientData.attachments
    : [];

  if (attachments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-700" />
          Clinical Attachments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {attachments.map(att => (
            <div key={att.id} className="relative w-24 h-24 border border-slate-200 dark:border-slate-800 rounded overflow-hidden group bg-slate-50 dark:bg-slate-950">
              {att.type === 'image' ? (
                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <FileText className="w-8 h-8 mb-1" />
                  <span className="text-xs px-1 truncate w-full text-center">{att.name}</span>
                </div>
              )}
              {att.type === 'image' ? (
                <button
                  type="button"
                  onClick={() => onSelectECG(att.url)}
                  className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Activity className="w-5 h-5 mb-1" />
                  <span className="text-xs font-semibold">Quick View</span>
                </button>
              ) : (
                <a
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Download className="w-5 h-5 mb-1" />
                  <span className="text-xs font-semibold">Download</span>
                </a>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
