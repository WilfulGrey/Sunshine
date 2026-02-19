import React, { useState } from 'react';
import { X, ClipboardCheck, Bell, Clock } from 'lucide-react';
import { Task } from '../../types/Task';

interface CloseTaskDialogProps {
  task: Task;
  onConfirm: (reason: string, notes: string) => void;
  onClose: () => void;
}

const CLOSE_REASONS = [
  { id: 'wklejka', label: 'Zrobiono wklejkę', icon: ClipboardCheck },
  { id: 'alert', label: 'Ustawiono alert', icon: Bell },
  { id: 'later', label: 'Dostępna później', icon: Clock },
] as const;

export const CloseTaskDialog: React.FC<CloseTaskDialogProps> = ({
  task,
  onConfirm,
  onClose,
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) return;
    const reasonLabel = CLOSE_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;
    onConfirm(reasonLabel, notes);
  };

  const handleSaveCustom = () => {
    if (!notes.trim()) return;
    onConfirm(notes.trim(), '');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Zamknij zadanie</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">{task.title}</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Powód zamknięcia:
          </label>
          <div className="space-y-2">
            {CLOSE_REASONS.map(reason => {
              const Icon = reason.icon;
              const isSelected = selectedReason === reason.id;
              return (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-colors text-left ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 text-purple-800'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                  data-testid={`reason-${reason.id}`}
                >
                  <Icon className={`h-5 w-5 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                  <span className="font-medium">{reason.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notatka (opcjonalnie):
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            placeholder="Dodatkowe informacje..."
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Anuluj
          </button>
          {selectedReason ? (
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-3 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              style={{ backgroundColor: '#AB4D95' }}
              data-testid="close-task-confirm"
            >
              <span>Zamknij zadanie</span>
            </button>
          ) : (
            <button
              onClick={handleSaveCustom}
              disabled={!notes.trim()}
              className="flex-1 px-4 py-3 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: notes.trim() ? '#AB4D95' : '#9CA3AF' }}
              data-testid="close-task-save-custom"
            >
              <span>Zapisz</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
