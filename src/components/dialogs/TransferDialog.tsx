import React from 'react';
import { ArrowRight, UserX } from 'lucide-react';
import { Task } from '../../types/Task';
import { useUsers } from '../../hooks/useUsers';

interface TransferDialogProps {
  task: Task;
  transferToUser: string;
  setTransferToUser: (user: string) => void;
  transferReason: string;
  setTransferReason: (reason: string) => void;
  currentUserName: string;
  availableUsers?: string[];
  onConfirm: () => void;
  onUnassign: () => void;
  onClose: () => void;
}

export const TransferDialog: React.FC<TransferDialogProps> = ({
  task,
  transferToUser,
  setTransferToUser,
  transferReason,
  setTransferReason,
  currentUserName,
  availableUsers,
  onConfirm,
  onUnassign,
  onClose
}) => {
  const { users, getUserDisplayName } = useUsers();
  
  // Use available users from props if provided, otherwise fall back to system users
  const usersToShow = availableUsers ? 
    availableUsers.filter(user => user !== currentUserName) :
    users.filter(u => getUserDisplayName(u) !== currentUserName);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowRight className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Transfer zadania</h3>
          <p className="text-gray-600 mb-4">{task.title}</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Przekaż do użytkownika: *
            </label>
            <select
              value={transferToUser}
              onChange={(e) => setTransferToUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              required
            >
              <option value="">Wybierz użytkownika...</option>
              {availableUsers ? (
                // Show users from available list
                usersToShow.map(user => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))
              ) : (
                // Fallback to system users
                usersToShow.map(user => (
                  <option key={user.id} value={getUserDisplayName(user)}>
                    {getUserDisplayName(user)}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Powód transferu:
            </label>
            <textarea
              rows={3}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Opisz dlaczego przekazujesz to zadanie..."
            />
          </div>
        </div>

        {transferToUser && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <div className="flex items-center space-x-2">
              <ArrowRight className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Zadanie zostanie przekazane do: <strong>{transferToUser}</strong>
              </span>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Anuluj
          </button>
          
          <button
            onClick={onUnassign}
            className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors flex items-center justify-center space-x-2"
          >
            <UserX className="h-4 w-4" />
            <span>Odpiąć się</span>
          </button>
          
          <button
            onClick={onConfirm}
            disabled={!transferToUser}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight className="h-5 w-5" />
            <span>Przekaż zadanie</span>
          </button>
        </div>
      </div>
    </div>
  );
};