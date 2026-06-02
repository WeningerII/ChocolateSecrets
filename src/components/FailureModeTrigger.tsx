import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import FailureModeSheet from './FailureModeSheet';
import { CHOCOLATE_WORK_ACTION_TYPES } from '../services/culinaryTools';

interface FailureModeTriggerProps {
  actionType?: string;
  /** Only render the trigger if the step is chocolate-related. Default true. */
  gateByActionType?: boolean;
  className?: string;
}

/**
 * Renders a subtle "Something's off?" link that opens the chocolate failure-mode sheet.
 * By default, only renders when the step's actionType is in CHOCOLATE_WORK_ACTION_TYPES.
 * Pass gateByActionType={false} to always render (useful for a recipe-level troubleshoot button).
 */
export default function FailureModeTrigger({ actionType, gateByActionType = true, className }: FailureModeTriggerProps) {
  const { t } = useTranslation(['failureMode']);
  const [open, setOpen] = useState(false);

  if (gateByActionType && (!actionType || !CHOCOLATE_WORK_ACTION_TYPES.has(actionType))) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-xs text-cocoa-500 hover:text-copper transition-colors ${className ?? ''}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
        {t('failureMode:trigger')}
      </button>
      <FailureModeSheet open={open} onClose={() => setOpen(false)} actionType={actionType} />
    </>
  );
}
