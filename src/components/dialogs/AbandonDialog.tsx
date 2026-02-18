import React from 'react';
import { Skull } from 'lucide-react';
import { Task } from '../../types/Task';

interface AbandonDialogProps {
  task: Task;
  abandonReason: string;
  setAbandonReason: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const AbandonDialog: React.FC<AbandonDialogProps> = ({
  task,
  abandonReason,
  setAbandonReason,
  onConfirm,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Skull className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Porzuć kontakt</h3>
          <p className="text-gray-600 mb-4">{task.title}</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Powód porzucenia kontaktu:
          </label>
          <textarea
            rows={4}
            value={abandonReason}
            onChange={(e) => setAbandonReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            placeholder="Opisz dlaczego kontakt został porzucony (np. niewłaściwa osoba, brak zainteresowania, inne powody)..."
          />
          <p className="text-xs text-gray-500 mt-2">
            Ten komentarz zostanie zapisany jako notatka w systemie
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <div className="flex items-center space-x-2">
            <Skull className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800 font-medium">
              Status zostanie zmieniony na "porzucony"
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
            disabled={!abandonReason.trim()}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Skull className="h-5 w-5" />
            <span>Porzuć kontakt</span>
          </button>
        </div>
      </div>
    </div>
  );
};