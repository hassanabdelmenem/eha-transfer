import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Download, FileText, Activity, ImageOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Referral } from '../../../types';
import { db } from '../../../lib/firebase';
import { isUnavailableUrl, type AttachmentFile } from '../../../lib/attachments';
import { useI18n } from '../../../i18n';

interface ClinicalAttachmentsCardProps {
  referral: Referral;
  onSelectECG: (url: string) => void;
}

// Stored files never change (the rules forbid edits), so one fetch per referral per
// session is enough: reopening a referral costs no further Firestore reads.
const cache = new Map<string, Record<string, string>>();
/** Test hook: forget fetched files between tests. */
export const clearAttachmentCache = () => cache.clear();

/** Data URLs of a referral's stored attachments, by attachment id (audit S1). */
function useStoredAttachmentData(referralId: string, needed: boolean): Record<string, string> {
  const [data, setData] = useState<Record<string, string>>(() => cache.get(referralId) ?? {});
  useEffect(() => {
    if (!needed || cache.has(referralId)) return;
    let alive = true;
    getDocs(collection(db, 'referrals', referralId, 'attachments'))
      .then((snap) => {
        const byId = Object.fromEntries(snap.docs.map((d) => {
          const f = d.data() as AttachmentFile;
          return [f.id, f.data];
        }));
        cache.set(referralId, byId);
        if (alive) setData(byId);
      })
      .catch((err) => console.error('Could not load attachments', err));
    return () => { alive = false; };
  }, [referralId, needed]);
  return data;
}

export const ClinicalAttachmentsCard: React.FC<ClinicalAttachmentsCardProps> = ({ referral, onSelectECG }) => {
  const { t } = useI18n();
  const attachments = Array.isArray(referral.patientData?.attachments)
    ? referral.patientData.attachments
    : [];
  const stored = useStoredAttachmentData(referral.id, attachments.some(a => a.stored));

  if (attachments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('cards.attachments')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {attachments.map(att => {
            const url = att.stored ? stored[att.id] : att.url;
            const loading = att.stored && !url;
            // Saved before 3 Oct 2026 as a link only the sender's browser could open.
            const unavailable = !att.stored && isUnavailableUrl(att.url);
            return (
              <div key={att.id} className="relative w-24 h-24 border border-slate-200 dark:border-slate-800 rounded overflow-hidden group bg-slate-50 dark:bg-slate-950">
                {unavailable ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-1 text-center">
                    <ImageOff className="w-6 h-6 mb-1" aria-hidden="true" />
                    <span className="text-[11px] leading-tight">{t('cards.attachmentUnavailable')}</span>
                  </div>
                ) : loading ? (
                  <div className="w-full h-full animate-pulse bg-slate-100 dark:bg-slate-900" aria-label={t('cards.attachmentLoading', { name: att.name })} />
                ) : att.type === 'image' ? (
                  <img src={url} alt={att.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                    <FileText className="w-8 h-8 mb-1" />
                    <span className="text-xs px-1 truncate w-full text-center">{att.name}</span>
                  </div>
                )}
                {url && !unavailable && (att.type === 'image' ? (
                  <button
                    type="button"
                    onClick={() => onSelectECG(url)}
                    className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Activity className="w-5 h-5 mb-1" />
                    <span className="text-xs font-semibold">{t('cards.quickView')}</span>
                  </button>
                ) : (
                  <a
                    href={url}
                    download={att.name}
                    rel="noreferrer"
                    className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="w-5 h-5 mb-1" />
                    <span className="text-xs font-semibold">{t('cards.download')}</span>
                  </a>
                ))}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
