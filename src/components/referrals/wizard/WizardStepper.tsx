import React from 'react';
import { Check, ShieldCheck, UserCheck, Stethoscope, FileCheck } from 'lucide-react';
import { WIZARD_STEPS } from './types';

interface WizardStepperProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

const STEP_ICONS = [
  ShieldCheck,
  UserCheck,
  Stethoscope,
  FileCheck
];

export const WizardStepper: React.FC<WizardStepperProps> = ({
  currentStep,
  completedSteps,
  onStepClick
}) => {
  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {WIZARD_STEPS.map((step, idx) => {
          const Icon = STEP_ICONS[idx] || ShieldCheck;
          const isCurrent = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id);
          
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(step.id)}
              className={`flex items-center gap-2.5 p-2 sm:p-3 rounded-lg text-left transition-all relative overflow-hidden ${
                isCurrent
                  ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 shadow-sm ring-1 ring-blue-500/20'
                  : isCompleted
                  ? 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'bg-transparent border border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {/* Step Icon Badge */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>

              {/* Title & Description */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Step {step.id}
                  </span>
                  {isCompleted && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
                <h3
                  className={`text-xs sm:text-sm font-semibold truncate ${
                    isCurrent
                      ? 'text-blue-950 dark:text-blue-200 font-bold'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span className="hidden sm:inline">{step.title}</span>
                  <span className="sm:hidden">{step.shortTitle}</span>
                </h3>
              </div>

              {/* Active Indicator Bar */}
              {isCurrent && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
