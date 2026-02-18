import React from 'react';
import { CheckCircle2, ArrowLeft, Save } from 'lucide-react';
import { Task } from '../../types/Task';
import { useLanguage } from '../../contexts/LanguageContext';

interface CompletionDialogProps {
  task: Task;
  completionSummary: string;
  setCompletionSummary: (summary: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export const CompletionDialog: React.FC<CompletionDialogProps> = ({
  task,
  completionSummary,
  setCompletionSummary,
  onConfirm,
  onBack
}) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Podsumowanie rozmowy:
          </label>
          <textarea
            rows={4}
            value={completionSummary}
            onChange={(e) => setCompletionSummary(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            placeholder="Opisz wynik rozmowy, ustalenia, następne kroki..."
          />
          <p className="text-xs text-gray-500 mt-2">
            Ten komentarz zostanie zapisany jako notatka w systemie
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onBack}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Wróć</span>
          </button>

          <button
            onClick={onConfirm}
            disabled={!completionSummary.trim()}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            <span>Zapisz</span>
          </button>
        </div>
      </div>
    </div>
  );
};