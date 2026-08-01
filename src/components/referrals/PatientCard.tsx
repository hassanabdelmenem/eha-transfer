import React, { useState } from 'react';
import { PatientData } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Lock, Unlock, AlertCircle, HeartPulse, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../ui/Badge';

interface PatientCardProps {
  patient: PatientData;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient }) => {
  const { verifyMFA, mfaVerifiedAt } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  // Consider MFA valid for 15 minutes
  const isMfaValid = mfaVerifiedAt && (Date.now() - mfaVerifiedAt < 15 * 60 * 1000);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyMFA(pin)) {
      setError(false);
      setPin('');
    } else {
      setError(true);
    }
  };

  // Collapsed / Encrypted View
  if (!isMfaValid) {
    return (
      <div className="h-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col md:flex-row shadow-sm overflow-hidden">
        <div className="w-full md:w-1/3 bg-slate-900 text-white p-6 flex flex-col shrink-0">
          <div className="flex justify-between items-center mb-2">
            <div className="text-[10px] text-blue-400 font-bold uppercase">Live Case Detail</div>
            <span className="text-[9px] text-amber-400 border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
              <Lock className="w-3 h-3" /> LOCKED
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center py-6">
             <div className="w-12 h-12 bg-white dark:bg-slate-900/10 rounded mb-3 flex items-center justify-center">
               <Lock className="w-6 h-6 text-white/50" />
             </div>
             <p className="text-xs text-white/60">Protected Health Information (PHI)<br/>Authentication Required</p>
          </div>
        </div>
        <div className="flex-1 p-6 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 p-6 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">MFA PIN Code</label>
                <Input
                  type="password"
                  maxLength={4}
                  placeholder="• • • •"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  error={error}
                  className="tracking-[1em] text-center font-mono text-lg py-3"
                />
                {error && <p className="text-red-600 text-xs mt-1 font-medium">Invalid PIN.</p>}
              </div>
              <Button type="submit" className="w-full">
                <Unlock className="h-4 w-4 mr-2" />
                Unlock Record
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Expanded / Decrypted View
  return (
    <div className="h-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col md:flex-row shadow-sm">
      <div className="w-full md:w-1/3 bg-slate-900 text-white p-6 flex flex-col shrink-0 rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
        <div className="flex justify-between items-center mb-2">
          <div className="text-[10px] text-blue-400 font-bold uppercase">Live Case Detail</div>
          <span className="text-[9px] text-green-400 border border-green-400/30 bg-green-400/10 px-1.5 py-0.5 rounded font-mono">VERIFIED</span>
        </div>
        <div>
          <h4 className="text-xl font-light">{patient.name}</h4>
          <p className="text-xs opacity-60 mt-1">Age: {patient.age} • {patient.gender} • {patient.bloodType || 'Unknown'} Blood</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-[10px] border-t border-slate-800 pt-4">
          <div>
            <p className="opacity-40">Hospital ID</p>
            <p className="font-mono mt-0.5">{patient.hospitalId}</p>
          </div>
          <div>
            <p className="opacity-40">National ID</p>
            <p className="font-mono mt-0.5">{patient.nationalId || 'N/A'}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-900 rounded-b-lg md:rounded-r-lg md:rounded-bl-none">
        <div className="col-span-1 md:col-span-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Primary Diagnosis & Notes</span>
          <p className="text-sm mt-1 leading-relaxed font-medium">{patient.diagnosis}</p>
          <p className="text-xs mt-2 opacity-80 whitespace-pre-wrap">{patient.clinicalNotes}</p>
        </div>
        <div className="col-span-1 md:col-span-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Clinical Vitals</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
            <div className={`p-2 rounded border ${patient.vitalSigns.hr > 100 || patient.vitalSigns.hr < 60 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}>
              <p className={`text-[9px] ${patient.vitalSigns.hr > 100 || patient.vitalSigns.hr < 60 ? 'text-red-500' : 'text-slate-400'}`}>HR</p>
              <p className={`text-sm font-bold ${patient.vitalSigns.hr > 100 || patient.vitalSigns.hr < 60 ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>{patient.vitalSigns.hr} <span className={`text-[10px] font-normal ${patient.vitalSigns.hr > 100 || patient.vitalSigns.hr < 60 ? 'text-red-600 dark:text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>bpm</span></p>
            </div>
            <div className={`p-2 rounded border ${parseInt(patient.vitalSigns.bp.split('/')[0]) > 140 || parseInt(patient.vitalSigns.bp.split('/')[0]) < 90 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}>
              <p className={`text-[9px] ${parseInt(patient.vitalSigns.bp.split('/')[0]) > 140 || parseInt(patient.vitalSigns.bp.split('/')[0]) < 90 ? 'text-red-500' : 'text-slate-400'}`}>BP</p>
              <p className={`text-sm font-bold ${parseInt(patient.vitalSigns.bp.split('/')[0]) > 140 || parseInt(patient.vitalSigns.bp.split('/')[0]) < 90 ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>{patient.vitalSigns.bp} <span className={`text-[10px] font-normal ${parseInt(patient.vitalSigns.bp.split('/')[0]) > 140 || parseInt(patient.vitalSigns.bp.split('/')[0]) < 90 ? 'text-red-600 dark:text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>mmHg</span></p>
            </div>
            <div className={`p-2 rounded border ${patient.vitalSigns.spo2 < 95 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}>
              <p className={`text-[9px] ${patient.vitalSigns.spo2 < 95 ? 'text-red-500' : 'text-slate-400'}`}>SpO2</p>
              <p className={`text-sm font-bold ${patient.vitalSigns.spo2 < 95 ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>{patient.vitalSigns.spo2}%</p>
            </div>
            <div className={`p-2 rounded border ${patient.vitalSigns.temp > 38 || patient.vitalSigns.temp < 36 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}>
              <p className={`text-[9px] ${patient.vitalSigns.temp > 38 || patient.vitalSigns.temp < 36 ? 'text-red-500' : 'text-slate-400'}`}>Temp</p>
              <p className={`text-sm font-bold ${patient.vitalSigns.temp > 38 || patient.vitalSigns.temp < 36 ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>{patient.vitalSigns.temp}°C</p>
            </div>
            <div className={`p-2 rounded border ${patient.vitalSigns.rr > 20 || patient.vitalSigns.rr < 12 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}>
              <p className={`text-[9px] ${patient.vitalSigns.rr > 20 || patient.vitalSigns.rr < 12 ? 'text-red-500' : 'text-slate-400'}`}>RR</p>
              <p className={`text-sm font-bold ${patient.vitalSigns.rr > 20 || patient.vitalSigns.rr < 12 ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>{patient.vitalSigns.rr} <span className={`text-[10px] font-normal ${patient.vitalSigns.rr > 20 || patient.vitalSigns.rr < 12 ? 'text-red-600 dark:text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>/min</span></p>
            </div>
          </div>
        </div>
        <div className="col-span-1 md:col-span-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Investigations & Labs</span>
          <p className="text-xs mt-1 leading-relaxed text-slate-800 bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">{patient.investigations || 'None recorded'}</p>
        </div>
      </div>
    </div>
  );
};
