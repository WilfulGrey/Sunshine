import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface PostponeDialogProps {
  postponeDate: string;
  setPostponeDate: (date: string) => void;
  postponeTime: string;
  setPostponeTime: (time: string) => void;
  postponeNotes: string;
  setPostponeNotes: (notes: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const PostponeDialog: React.FC<PostponeDialogProps> = ({
  postponeDate,
  setPostponeDate,
  postponeTime,
  setPostponeTime,
  postponeNotes,
  setPostponeNotes,
  onConfirm,
  onClose
}) => {
  const { t } = useLanguage();

  const handleQuickSelect = (type: string) => {
    const now = new Date();
    
    switch (type) {
      case '1hour':
        now.setHours(now.getHours() + 1);
        break;
      case '2hours':
        now.setHours(now.getHours() + 2);
        break;
      case 'tomorrow9':
        now.setDate(now.getDate() + 1);
        now.setHours(9, 0, 0, 0);
        break;
      case 'tomorrow14':
        now.setDate(now.getDate() + 1);
        now.setHours(14, 0, 0, 0);
        break;
      case 'nextWeek':
        const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7;
        now.setDate(now.getDate() + daysUntilMonday);
        now.setHours(9, 0, 0, 0);
        break;
      case '1week':
        now.setDate(now.getDate() + 7);
        now.setHours(9, 0, 0, 0);
        break;
    }
    
    setPostponeDate(now.toISOString().slice(0, 10));
    setPostponeTime(now.toTimeString().slice(0, 5));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.setPostpone}</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notatka z rozmowy:
          </label>
          <textarea
            rows={3}
            value={postponeNotes}
            onChange={(e) => setPostponeNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            placeholder="Opisz powód przełożenia, ustalenia z rozmowy..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Ta notatka zostanie zapisana w polu "Następne kroki" w Airtable
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t.quickSelection}
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => handleQuickSelect('1hour')}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t.in1Hour}
            </button>
            <button
              onClick={() => handleQuickSelect('2hours')}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t.in2Hours}
            </button>
            <button
              onClick={() => handleQuickSelect('tomorrow9')}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t.tomorrow9}
            </button>
            <button
              onClick={() => handleQuickSelect('tomorrow14')}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t.tomorrow14}
            </button>
            <button
              onClick={() => handleQuickSelect('nextWeek')}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t.nextWeek}
            </button>
            <button
              onClick={() => handleQuickSelect('1week')}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t.in1Week}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.orSelectCustomTime}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Datum</label>
              <input
                type="date"
                value={postponeDate}
                onChange={(e) => setPostponeDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Uhrzeit</label>
              <div className="flex space-x-1">
                <select
                  value={postponeTime.split(':')[0] || '09'}
                  onChange={(e) => {
                    const minutes = postponeTime.split(':')[1] || '00';
                    setPostponeTime(`${e.target.value}:${minutes}`);
                  }}
                  className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-center"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i.toString().padStart(2, '0')}>
                      {i.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <span className="flex items-center text-gray-500 font-medium">:</span>
                <select
                  value={postponeTime.split(':')[1] || '00'}
                  onChange={(e) => {
                    const hours = postponeTime.split(':')[0] || '09';
                    setPostponeTime(`${hours}:${e.target.value}`);
                  }}
                  className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-center"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i.toString().padStart(2, '0')}>
                      {i.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={!postponeDate || !postponeTime}
            className="px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#AB4D95' }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#9A3D85')}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#AB4D95')}
          >
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};