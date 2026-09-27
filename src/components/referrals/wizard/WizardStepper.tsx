import React from 'react';
import { WIZARD_STEPS } from './types';
import { cn } from '../../../lib/utils';

interface WizardStepperProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (stepId: number) => void;
}

/**
 * The 5-segment progress bar in the wizard's ink header: done in olive, the
 * current step in paper, the rest faint. Each segment is a real button so a
 * draft can be resumed "from any step"; its name says which step and whether
 * it is complete, so progress is never carried by colour alone.
 */
export const WizardStepper: React.FC<WizardStepperProps> = ({ currentStep, completedSteps, onStepClick }) => (
  <ol className="flex gap-1.5" aria-label="Referral steps">
    {WIZARD_STEPS.map(step => {
      const current = step.id === currentStep;
      const done = completedSteps.includes(step.id);
      return (
        <li key={step.id} className="flex-1">
          <button
            type="button"
            onClick={() => onStepClick(step.id)}
            aria-current={current ? 'step' : undefined}
            aria-label={`Step ${step.id}: ${step.title}${done ? ', complete' : ''}`}
            className="group flex h-11 w-full items-center focus-visible:outline-none"
          >
            <span
              aria-hidden="true"
              className={cn(
                'h-[5px] w-full rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-paper group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-ink',
                current ? 'bg-paper' : done ? 'bg-success-400' : 'bg-paper/22 group-hover:bg-paper/40'
              )}
            />
          </button>
        </li>
      );
    })}
  </ol>
);
