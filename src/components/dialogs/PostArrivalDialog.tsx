import React, { useState } from 'react';
import { Home, ArrowLeft, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Task } from '../../types/Task';
import { ConfirmArrivalStatus } from '../../services/sunshineService';

interface PostArrivalDialogProps {
  task: Task;
  onConfirm: (status: ConfirmArrivalStatus, dlv?: number) => Promise<void>;
  onBack: () => void;
}

export const PostArrivalDialog: React.FC<PostArrivalDialogProps> = ({
  task,
  onConfirm,
  onBack,
}) => {
  const [status, setStatus] = useState<ConfirmArrivalStatus | null>(null);
  const [dlvInput, setDlvInput] = useState<string>(
    task.apiData?.dlv != null ? String(task.apiData.dlv) : ''
  );
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!status || submitting) return;
    setSubmitting(true);
    try {
      const dlvParsed = dlvInput.trim() === '' ? undefined : Number(dlvInput);
      const dlv = dlvParsed != null && !Number.isNaN(dlvParsed) ? dlvParsed : undefined;
      await onConfirm(status, dlv);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="post-arrival-dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
          <p className="text-sm text-gray-600">Anreise bestätigen (potwierdzenie dojazdu) — 1 dzień po dojeździe</p>
        </div>

        <div className="mb-4 space-y-2">
          <button
            onClick={() => setStatus('1')}
            disabled={submitting}
            data-testid="post-arrival-ok"
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-colors text-left ${
              status === '1' ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <CheckCircle2 className={`h-5 w-5 ${status === '1' ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="font-medium">Przyjechała i wszystko OK</span>
          </button>
          <button
            onClick={() => setStatus('0')}
            disabled={submitting}
            data-testid="post-arrival-not-ok"
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-colors text-left ${
              status === '0' ? 'border-red-500 bg-red-50 text-red-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <AlertTriangle className={`h-5 w-5 ${status === '0' ? 'text-red-600' : 'text-gray-400'}`} />
            <span className="font-medium">Przyjechała, ale są problemy</span>
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            DLV (€) — opcjonalne:
          </label>
          <input
            type="number"
            min="0"
            step="50"
            value={dlvInput}
            onChange={(e) => setDlvInput(e.target.value)}
            placeholder={task.apiData?.dlv != null ? `np. ${task.apiData.dlv}` : 'np. 2500'}
            data-testid="post-arrival-dlv"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">Zostaw puste, jeśli nie chcesz aktualizować stawki.</p>
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
            disabled={!status || submitting}
            data-testid="post-arrival-confirm"
            className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>Anreise bestätigen</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
