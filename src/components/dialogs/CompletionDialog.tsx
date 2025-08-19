import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Task } from '../../types/Task';
import { useLanguage } from '../../contexts/LanguageContext';

interface CompletionDialogProps {
  task: Task;
  completionSummary: string;
  setCompletionSummary: (summary: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const CompletionDialog: React.FC<CompletionDialogProps> = ({
  task,
  completionSummary,
  setCompletionSummary,
  onConfirm,
  onClose
}) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.completeTask}</h3>
          <p className="text-gray-600 mb-4">{task.title}</p>
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
            Ten komentarz zostanie zapisany w polu "Następne kroki" w Airtable
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800 font-medium">
              Status zostanie zmieniony na "kontakt udany"
            </span>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Anuluj
          </button>
          
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>Zakończ zadanie</span>
          </button>
        </div>
      </div>
    </div>
  );
};