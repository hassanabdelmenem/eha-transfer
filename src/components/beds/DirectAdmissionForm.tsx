import React, { useState } from 'react';
import { BedType, Facility } from '../../types';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { UserPlus, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n, typedDir } from '../../i18n';

export interface DirectAdmissionFormData {
  facilityId: string;
  department: string;
  bedType: BedType;
  patientName: string;
  hospitalId: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  nationalId?: string;
  phoneNumber?: string;
  diagnosis?: string;
  chiefComplaint?: string;
  notes?: string;
}

export interface DirectAdmissionFormProps {
  facility: Facility;
  onSubmit: (data: DirectAdmissionFormData) => Promise<void> | void;
  isAdmin?: boolean;
  facilities?: Facility[];
  selectedFacilityId?: string;
  onSelectFacility?: (facilityId: string) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  hideAdminSelector?: boolean;
  className?: string;
}

export const DirectAdmissionForm: React.FC<DirectAdmissionFormProps> = ({
  facility,
  onSubmit,
  isAdmin = false,
  facilities = [],
  selectedFacilityId,
  onSelectFacility,
  onCancel,
  isSubmitting = false,
  hideAdminSelector = false,
  className = '',
}) => {
  const { t } = useI18n();
  const [patientName, setPatientName] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [department, setDepartment] = useState('');
  const [bedType, setBedType] = useState<BedType>('Ward');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [nationalId, setNationalId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [notes, setNotes] = useState('');

  const [showClinicalDetails, setShowClinicalDetails] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!patientName.trim()) {
      errors.patientName = t('admission.errors.patientName');
    }
    if (!hospitalId.trim()) {
      errors.hospitalId = t('admission.errors.hospitalId');
    }
    if (!department) {
      errors.department = t('admission.errors.department');
    }
    if (!bedType) {
      errors.bedType = t('admission.errors.bedType');
    }
    if (age && (Number(age) < 0 || Number(age) > 125 || isNaN(Number(age)))) {
      errors.age = t('admission.errors.age');
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    await onSubmit({
      facilityId: facility.id,
      department,
      bedType,
      patientName: patientName.trim(),
      hospitalId: hospitalId.trim(),
      age: age ? Number(age) : undefined,
      gender,
      nationalId: nationalId.trim() || undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      diagnosis: diagnosis.trim() || undefined,
      chiefComplaint: chiefComplaint.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    // Reset form upon successful submission
    setPatientName('');
    setHospitalId('');
    setDepartment('');
    setBedType('Ward');
    setAge('');
    setGender('male');
    setNationalId('');
    setPhoneNumber('');
    setDiagnosis('');
    setChiefComplaint('');
    setNotes('');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {isAdmin && !hideAdminSelector && onSelectFacility && facilities.length > 0 && (
        <Card className="border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label
              htmlFor="admitFacility"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300 shrink-0"
            >
              {t('beds.adminView')}
            </label>
            <select
              id="admitFacility"
              value={selectedFacilityId || facility.id}
              onChange={(e) => onSelectFacility(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-[44px]"
            >
              <option value="">{t('beds.selectToManage')}</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Card className="border border-slate-200 dark:border-slate-800 ">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {t('admission.details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(formErrors).length > 0 && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-critical-50 dark:bg-critical-950/40 border border-critical-200 dark:border-critical-800 text-critical-700 dark:text-critical-300 text-xs font-medium flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-critical-500" />
                <span>{t('admission.fixFields')}</span>
              </div>
            )}

            {/* Core Patient Demographics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="admitPatientName"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {t('admission.patientName')} <span className="text-critical-500">*</span>
                </label>
                <input
                  id="admitPatientName"
                  type="text"
                  required
                  dir={typedDir(patientName)}
                  placeholder={t('admission.fullName')}
                  className={`w-full rounded-xl border ${
                    formErrors.patientName
                      ? 'border-critical-500 focus:ring-critical-500'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                  } bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-sm focus:ring-2 outline-hidden min-h-[44px]`}
                  value={patientName}
                  onChange={(e) => {
                    setPatientName(e.target.value);
                    if (formErrors.patientName) {
                      setFormErrors((prev) => ({ ...prev, patientName: '' }));
                    }
                  }}
                />
                {formErrors.patientName && (
                  <p className="text-[11px] text-critical-600 dark:text-critical-400 mt-1 font-medium">
                    {formErrors.patientName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="admitHospitalId"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {t('admission.hospitalId')} <span className="text-critical-500">*</span>
                </label>
                <input
                  id="admitHospitalId"
                  type="text"
                  required
                  placeholder={t('admission.hospitalIdPlaceholder')}
                  className={`w-full rounded-xl border ${
                    formErrors.hospitalId
                      ? 'border-critical-500 focus:ring-critical-500'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                  } bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-sm focus:ring-2 outline-hidden min-h-[44px] font-mono`}
                  value={hospitalId}
                  onChange={(e) => {
                    setHospitalId(e.target.value);
                    if (formErrors.hospitalId) {
                      setFormErrors((prev) => ({ ...prev, hospitalId: '' }));
                    }
                  }}
                />
                {formErrors.hospitalId && (
                  <p className="text-[11px] text-critical-600 dark:text-critical-400 mt-1 font-medium">
                    {formErrors.hospitalId}
                  </p>
                )}
              </div>
            </div>

            {/* Department and Bed Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="admitDepartment"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {t('admission.department')} <span className="text-critical-500">*</span>
                </label>
                <select
                  id="admitDepartment"
                  required
                  className={`w-full rounded-xl border ${
                    formErrors.department
                      ? 'border-critical-500 focus:ring-critical-500'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                  } p-2.5 text-sm focus:ring-2 outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[44px]`}
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    if (formErrors.department) {
                      setFormErrors((prev) => ({ ...prev, department: '' }));
                    }
                  }}
                >
                  <option value="">{t('admission.selectDepartment')}</option>
                  {facility.departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {formErrors.department && (
                  <p className="text-[11px] text-critical-600 dark:text-critical-400 mt-1 font-medium">
                    {formErrors.department}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="admitBedType"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {t('admission.bedType')} <span className="text-critical-500">*</span>
                </label>
                <select
                  id="admitBedType"
                  required
                  className={`w-full rounded-xl border ${
                    formErrors.bedType
                      ? 'border-critical-500 focus:ring-critical-500'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                  } p-2.5 text-sm focus:ring-2 outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[44px]`}
                  value={bedType}
                  onChange={(e) => {
                    setBedType(e.target.value as BedType);
                    if (formErrors.bedType) {
                      setFormErrors((prev) => ({ ...prev, bedType: '' }));
                    }
                  }}
                >
                  {(['Ward', 'ICU', 'CCU', 'PICU'] as BedType[]).map(b => (
                    <option key={b} value={b}>{t(`admission.bed.${b}`)}</option>
                  ))}
                </select>
                {formErrors.bedType && (
                  <p className="text-[11px] text-critical-600 dark:text-critical-400 mt-1 font-medium">
                    {formErrors.bedType}
                  </p>
                )}
              </div>
            </div>

            {/* Age & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-3">
                <label
                  htmlFor="admitPatientAge"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {t('admission.age')}
                </label>
                <input
                  id="admitPatientAge"
                  type="number"
                  min="0"
                  max="125"
                  placeholder={t('admission.agePlaceholder')}
                  className={`w-full rounded-xl border ${
                    formErrors.age
                      ? 'border-critical-500 focus:ring-critical-500'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                  } bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-sm focus:ring-2 outline-hidden min-h-[44px]`}
                  value={age}
                  onChange={(e) => {
                    setAge(e.target.value);
                    if (formErrors.age) {
                      setFormErrors((prev) => ({ ...prev, age: '' }));
                    }
                  }}
                />
                {formErrors.age && (
                  <p className="text-[11px] text-critical-600 dark:text-critical-400 mt-1 font-medium">
                    {formErrors.age}
                  </p>
                )}
              </div>

              <div className="sm:col-span-9">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {t('admission.gender')}
                </label>
                <div className="flex flex-wrap gap-4 items-center min-h-[44px]">
                  {(['male', 'female', 'other'] as const).map(g => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={gender === g}
                        onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                        className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{t(`gender.${g === 'other' ? 'unspecified' : g}`)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Additional Clinical Information Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowClinicalDetails(!showClinicalDetails)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showClinicalDetails ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    {t('admission.hideDetails')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    {t('admission.showDetails')}
                  </>
                )}
              </button>
            </div>

            {showClinicalDetails && (
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="admitNationalId"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      {t('admission.nationalId')}
                    </label>
                    <input
                      id="admitNationalId"
                      type="text"
                      placeholder={t('admission.nationalIdPlaceholder')}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden min-h-[44px]"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="admitPhoneNumber"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      {t('admission.phone')}
                    </label>
                    <input
                      id="admitPhoneNumber"
                      type="tel"
                      placeholder={t('admission.phonePlaceholder')}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden min-h-[44px]"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="admitDiagnosis"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {t('admission.diagnosis')}
                  </label>
                  <input
                    id="admitDiagnosis"
                    type="text"
                    dir={typedDir(diagnosis)}
                    placeholder={t('admission.diagnosisPlaceholder')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden min-h-[44px]"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </div>

                <div>
                  <label
                    htmlFor="admitChiefComplaint"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {t('admission.complaint')}
                  </label>
                  <textarea
                    id="admitChiefComplaint"
                    rows={2}
                    dir={typedDir(chiefComplaint)}
                    placeholder={t('admission.complaintPlaceholder')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                  />
                </div>

                <div>
                  <label
                    htmlFor="admitNotes"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {t('admission.notes')}
                  </label>
                  <textarea
                    id="admitNotes"
                    rows={2}
                    dir={typedDir(notes)}
                    placeholder={t('admission.notesPlaceholder')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {t('common.cancel')}
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white min-h-[48px] px-6 font-bold shadow-xs"
              >
                <UserPlus className="w-4 h-4 me-2" />
                {/* Accessible text matching `/Admit Patient & Update Capacity/i` and `/Admit Patient/i` */}
                {t('admission.submit')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
