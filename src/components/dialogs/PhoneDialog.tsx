import React, { useState } from 'react';
import { X, Phone, PhoneCall, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
// import { twilioService, CallStatus } from '../../services/twilioService';
import { Task } from '../../types/Task';

interface PhoneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onCallResult: (taskId: string, result: 'reachable' | 'not_reachable') => void;
  onStartCall?: (phoneNumber: string, taskTitle: string) => Promise<void>;
}

export const PhoneDialog: React.FC<PhoneDialogProps> = ({
  isOpen,
  onClose,
  task,
  onCallResult,
  onStartCall
}) => {
  const { t } = useLanguage();
  const [phoneNumberInput, setPhoneNumberInput] = useState(task.airtableData?.phoneNumber || '');
  // const [callStatus, setCallStatus] = useState<CallStatus | null>(null);
  // const [isCallInProgress, setIsCallInProgress] = useState(false);

  // const handleStartCall = async () => {
  //   if (!phoneNumberInput.trim()) return;
    
  //   try {
  //     setIsCallInProgress(true);
  //     console.log('🔄 Rozpoczynam połączenie...');
      
  //     const result = await twilioService.makeCall(phoneNumberInput, task.title);
  //     setCallStatus(result);
      
  //     if (result.status === 'initiated') {
  //       console.log('✅ Połączenie zainicjowane pomyślnie');
  //       // Możemy tutaj dodać polling statusu połączenia
  //     } else {
  //       console.log('❌ Błąd podczas inicjowania połączenia:', result.error);
  //     }
  //   } catch (error) {
  //     console.error('❌ Błąd podczas połączenia:', error);
  //     setCallStatus({
  //       status: 'failed',
  //       error: error instanceof Error ? error.message : 'Unknown error'
  //     });
  //   } finally {
  //     setIsCallInProgress(false);
  //   }
  // };

  const handleCallResult = (result: 'reachable' | 'not_reachable') => {
    onCallResult(task.id, result);
    handleCloseDialog();
  };

  const handleCloseDialog = () => {
    setPhoneNumberInput(task.airtableData?.phoneNumber || '');
    // setCallStatus(null);
    // setIsCallInProgress(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Phone className="h-5 w-5 text-green-600" />
            <span>{t.startCall}</span>
          </h3>
          <button
            onClick={handleCloseDialog}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.phoneNumber}
            </label>
            <input
              type="tel"
              value={phoneNumberInput}
              onChange={(e) => setPhoneNumberInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              placeholder="+49 123 456 789"
            />
          </div>

          {/* Zakomentowana sekcja Twilio */}
          {/* <div className="flex justify-center">
            <button
              onClick={handleStartCall}
              disabled={!phoneNumberInput.trim() || isCallInProgress}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isCallInProgress ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Łączenie...</span>
                </>
              ) : (
                <>
                  <PhoneCall className="h-4 w-4" />
                  <span>{t.clickToCall}</span>
                </>
              )}
            </button>
          </div>

          {callStatus && (
            <div className="mt-4">
              {callStatus.status === 'initiated' && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-700">Połączenie w toku...</span>
                </div>
              )}
              
              {callStatus.status === 'in-progress' && (
                <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">Połączenie aktywne</span>
                </div>
              )}
              
              {callStatus.status === 'failed' && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700">Błąd: {callStatus.error}</span>
                </div>
              )}
            </div>
          )} */}

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-900 mb-3">
              {t.wasPersonReachable}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleCallResult('reachable')}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{t.yesReachable}</span>
              </button>
              <button
                onClick={() => handleCallResult('not_reachable')}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
              >
                <XCircle className="h-4 w-4" />
                <span>{t.notReachable}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};