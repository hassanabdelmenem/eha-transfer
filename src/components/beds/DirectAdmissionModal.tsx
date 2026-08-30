import React, { useEffect, useCallback } from 'react';
import { Facility } from '../../types';
import { DirectAdmissionForm, DirectAdmissionFormData } from './DirectAdmissionForm';
import { X, UserPlus } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { showToast, toastError } from '../../lib/toast';

export interface DirectAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: Facility;
  isAdmin?: boolean;
  facilities?: Facility[];
  selectedFacilityId?: string;
  onSelectFacility?: (facilityId: string) => void;
  onSuccess?: () => void;
}

export const DirectAdmissionModal: React.FC<DirectAdmissionModalProps> = ({
  isOpen,
  onClose,
  facility,
  isAdmin = false,
  facilities = [],
  selectedFacilityId,
  onSelectFacility,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { addDirectAdmission } = useData();

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleSubmit = async (data: DirectAdmissionFormData) => {
    if (!user) return;
    try {
      addDirectAdmission({
        facilityId: data.facilityId,
        department: data.department,
        bedType: data.bedType,
        patientName: data.patientName,
        hospitalId: data.hospitalId,
        admittedBy: user.id,
      });

      showToast(`Admitted ${data.patientName} directly to ${data.department} (${data.bedType})`, 'success');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      toastError(err, 'Failed to record direct admission.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="direct-admit-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="direct-admit-title"
                className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight"
              >
                Direct Walk-In Admission
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Admitting to <strong className="text-slate-700 dark:text-slate-200">{facility.name}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="h-10 w-10 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto">
          <DirectAdmissionForm
            facility={facility}
            onSubmit={handleSubmit}
            isAdmin={isAdmin}
            facilities={facilities}
            selectedFacilityId={selectedFacilityId}
            onSelectFacility={onSelectFacility}
            onCancel={onClose}
            hideAdminSelector={true}
          />
        </div>
      </div>
    </div>
  );
};
