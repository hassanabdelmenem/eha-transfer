import React from 'react';
import { PatientData } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { User, CreditCard, Sparkles } from 'lucide-react';

interface StepPatientDemographicsProps {
  patientData: Partial<PatientData>;
  setPatientData: React.Dispatch<React.SetStateAction<Partial<PatientData>>>;
}

export const StepPatientDemographics: React.FC<StepPatientDemographicsProps> = ({
  patientData,
  setPatientData,
}) => {
  const handleNationalIdChange = (nid: string) => {
    setPatientData(prev => {
      const updates: Partial<PatientData> = { nationalId: nid };
      if (nid.length === 14 && /^\d+$/.test(nid)) {
        const century = parseInt(nid.substring(0, 1), 10);
        const year = parseInt(nid.substring(1, 3), 10);
        const month = parseInt(nid.substring(3, 5), 10) - 1;
        const day = parseInt(nid.substring(5, 7), 10);
        const genderCode = parseInt(nid.substring(12, 13), 10);

        let fullYear = 0;
        if (century === 2) fullYear = 1900 + year;
        else if (century === 3) fullYear = 2000 + year;

        if (fullYear !== 0) {
          const birthDate = new Date(fullYear, month, day);
          const now = new Date();
          let age = now.getFullYear() - birthDate.getFullYear();
          const m = now.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
            age--;
          }
          updates.age = age;
          updates.gender = genderCode % 2 === 0 ? 'female' : 'male';
        }
      }
      return { ...prev, ...updates };
    });
  };

  const parseNumber = (val: string): number | undefined => {
    const n = parseInt(val, 10);
    return isNaN(n) ? undefined : n;
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-sm">
            2
          </span>
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Patient Identification & Demographics
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter official patient records, MRN, and personal demographics.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Hospital ID & National ID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="hospitalId"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 after:content-['_*'] after:text-critical-500"
            >
              Unified Hospital ID
            </label>
            <div className="relative">
              <Input
                id="hospitalId"
                required
                placeholder="ISM-XXXXX"
                value={patientData.hospitalId || ''}
                onChange={e => setPatientData({ ...patientData, hospitalId: e.target.value })}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Required medical record number / unique patient identifier.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="nationalId"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
              >
                National ID (Optional)
              </label>
              {patientData.nationalId && patientData.nationalId.length === 14 && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Auto-decoded Age & Gender
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                id="nationalId"
                placeholder="14-digit NID (auto-calculates age & sex)"
                value={patientData.nationalId || ''}
                onChange={e => handleNationalIdChange(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              14-digit Egyptian National ID automatically determines birthdate and gender.
            </p>
          </div>
        </div>

        {/* Patient Name, Age, & Gender */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
          <div className="md:col-span-6">
            <label
              htmlFor="patientName"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 after:content-['_*'] after:text-critical-500"
            >
              Full Name
            </label>
            <div className="relative">
              <Input
                id="patientName"
                required
                placeholder="e.g. Sayed Abdel-Rahman"
                value={patientData.name || ''}
                onChange={e => setPatientData({ ...patientData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="patientAge"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 after:content-['_*'] after:text-critical-500"
            >
              Age
            </label>
            <Input
              id="patientAge"
              type="number"
              required
              min={0}
              max={130}
              placeholder="e.g. 58"
              value={patientData.age ?? ''}
              onChange={e => setPatientData({ ...patientData, age: parseNumber(e.target.value) })}
            />
          </div>

          <div className="md:col-span-4">
            <label
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 after:content-['_*'] after:text-critical-500"
            >
              Gender
            </label>
            <div className="flex gap-6 items-center min-h-[48px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={patientData.gender === 'male' || !patientData.gender}
                  onChange={() => setPatientData({ ...patientData, gender: 'male' })}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Male</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={patientData.gender === 'female'}
                  onChange={() => setPatientData({ ...patientData, gender: 'female' })}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Female</span>
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
