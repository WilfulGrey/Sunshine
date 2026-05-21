import React, { useState } from 'react';
import { PlaneTakeoff, ArrowLeft, Loader2, X } from 'lucide-react';
import { Task } from '../../types/Task';
import { ConfirmDepartureStatus, RejectionReason } from '../../services/sunshineService';

interface PreDepartureDialogProps {
  task: Task;
  onConfirm: (
    status: ConfirmDepartureStatus,
    comebackDate?: string,
    comebackDepartureDate?: string,
    rejectionReasons?: RejectionReason[],
  ) => Promise<void>;
  onBack: () => void;
}

const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  tooLittleMoney: 'Zbyt mała stawka',
  poorPatientCondition: 'Zły stan podopiecznego',
  caregiverTakingBreak: 'Opiekun robi sobie przerwę',
  badChemistry: 'Brak chemii / zły kontakt',
  caregiverHasOtherPlacement: 'Inne zlecenie / placement',
};

const ALL_REJECTION_REASONS: RejectionReason[] = [
  'tooLittleMoney',
  'poorPatientCondition',
  'caregiverTakingBreak',
  'badChemistry',
  'caregiverHasOtherPlacement',
];

export const PreDepartureDialog: React.FC<PreDepartureDialogProps> = ({
  task,
  onConfirm,
  onBack,
}) => {
  const [status, setStatus] = useState<ConfirmDepartureStatus | null>(null);
  const [comebackDate, setComebackDate] = useState('');
  const [comebackDepartureDate, setComebackDepartureDate] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<Set<RejectionReason>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const toggleReason = (r: RejectionReason) => {
    setSelectedReasons(prev => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  };

  const isValid = (() => {
    if (status === '1') return Boolean(comebackDate && comebackDepartureDate);
    if (status === '0') return selectedReasons.size > 0;
    if (status === '2') return true;
    return false;
  })();

  const handleConfirm = async () => {
    if (!status || !isValid || submitting) return;
    setSubmitting(true);
    try {
      if (status === '1') {
        await onConfirm('1', comebackDate, comebackDepartureDate);
      } else if (status === '0') {
        await onConfirm('0', undefined, undefined, Array.from(selectedReasons));
      } else {
        await onConfirm('2');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="pre-departure-dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlaneTakeoff className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
          <p className="text-sm text-gray-600">Abreise bestätigen (potwierdzenie odjazdu) — 7 dni przed zjazdem</p>
        </div>

        <div className="mb-4 space-y-2">
          <button
            onClick={() => setStatus('1')}
            disabled={submitting}
            data-testid="pre-departure-returns"
            className={`w-full px-4 py-3 rounded-lg border-2 transition-colors text-left ${
              status === '1' ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <span className="font-medium">Wróci na kolejne zlecenie</span>
          </button>
          <button
            onClick={() => setStatus('2')}
            disabled={submitting}
            data-testid="pre-departure-later"
            className={`w-full px-4 py-3 rounded-lg border-2 transition-colors text-left ${
              status === '2' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <span className="font-medium">Wróci, ale później</span>
          </button>
          <button
            onClick={() => setStatus('0')}
            disabled={submitting}
            data-testid="pre-departure-rejects"
            className={`w-full px-4 py-3 rounded-lg border-2 transition-colors text-left ${
              status === '0' ? 'border-red-500 bg-red-50 text-red-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <span className="font-medium">Nie wróci (rezygnacja)</span>
          </button>
        </div>

        {status === '1' && (
          <div className="mb-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data powrotu opiekunki <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={comebackDate}
                onChange={(e) => setComebackDate(e.target.value)}
                data-testid="pre-departure-comeback-date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planowany wyjazd na następne zlecenie <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={comebackDepartureDate}
                onChange={(e) => setComebackDepartureDate(e.target.value)}
                data-testid="pre-departure-comeback-departure"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        )}

        {status === '0' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Powód rezygnacji <span className="text-red-500">*</span> (zaznacz co najmniej jeden)
            </label>
            <div className="space-y-2">
              {ALL_REJECTION_REASONS.map(reason => {
                const checked = selectedReasons.has(reason);
                return (
                  <label
                    key={reason}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      checked ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleReason(reason)}
                      data-testid={`pre-departure-reason-${reason}`}
                      className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">{REJECTION_REASON_LABELS[reason]}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

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
            disabled={!status || !isValid || submitting}
            data-testid="pre-departure-confirm"
            className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>Abreise bestätigen</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
