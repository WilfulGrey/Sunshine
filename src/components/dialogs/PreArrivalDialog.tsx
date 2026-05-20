import React, { useState } from 'react';
import { PlaneLanding, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Task } from '../../types/Task';

interface PreArrivalDialogProps {
  task: Task;
  onConfirm: () => Promise<void>;
  onBack: () => void;
}

export const PreArrivalDialog: React.FC<PreArrivalDialogProps> = ({
  task,
  onConfirm,
  onBack,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="pre-arrival-dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlaneLanding className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
          <p className="text-sm text-gray-600">
            Potwierdź przyjazd opiekunki (3 dni przed). System powiadomi HP na podstawie danych z assignment.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onBack}
            disabled={submitting}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Wróć</span>
          </button>

          <button
            onClick={handleConfirm}
            disabled={submitting}
            data-testid="pre-arrival-confirm"
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span>Potwierdź przyjazd</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
