import React, { useState, useMemo } from 'react';
import { X, ScrollText, Loader2, ExternalLink, Heart } from 'lucide-react';
import { SunshineLog } from '../../services/sunshineService';

interface LogsDialogProps {
  logs: SunshineLog[];
  loading: boolean;
  onClose: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
}

const CONTACT_TITLES = new Set(['Successfully', 'Not Successfully', 'Note Only', 'interest']);

function formatLogDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAuthorName(log: SunshineLog): string {
  if (log.custom_author_name) return log.custom_author_name;
  if (log.author) return `${log.author.first_name} ${log.author.last_name}`.trim();
  return '';
}

export const LogsDialog: React.FC<LogsDialogProps> = ({
  logs,
  loading,
  onClose,
  onLoadMore,
  hasMore,
  loadingMore,
}) => {
  const [notesOnly, setNotesOnly] = useState(true);

  const filteredLogs = useMemo(() => {
    if (!notesOnly) return logs;
    return logs.filter(log => CONTACT_TITLES.has(log.title));
  }, [logs, notesOnly]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <ScrollText className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Historia notatek</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter toggle */}
        <div className="px-4 pt-3 pb-1">
          <div className="inline-flex rounded-lg border border-gray-200 text-sm" data-testid="logs-filter-toggle">
            <button
              onClick={() => setNotesOnly(true)}
              className={`px-3 py-1.5 rounded-l-lg font-medium transition-colors ${
                notesOnly
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Tylko notatki
            </button>
            <button
              onClick={() => setNotesOnly(false)}
              className={`px-3 py-1.5 rounded-r-lg font-medium transition-colors ${
                !notesOnly
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Wszystkie wpisy
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Brak notatek</p>
          ) : (
            filteredLogs.map((log) => {
              const author = getAuthorName(log);

              return (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    {author && (
                      <p className="text-xs text-gray-500">{author}</p>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatLogDate(log.created_at)}
                    </span>
                  </div>
                  {log.title === 'interest' && (
                    <div className="flex items-center space-x-1 mb-2">
                      <Heart className="h-3.5 w-3.5 text-pink-500" />
                      <span className="text-xs font-medium text-pink-700">Zainteresowanie zleceniem</span>
                      {log.job_offer_id && (
                        <a
                          href={`https://portal.mamamia.app/caregiver-agency/job-market/${log.job_offer_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-xs text-pink-600 hover:text-pink-800 hover:underline ml-1"
                          data-testid={`job-offer-link-${log.id}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Zlecenie #{log.job_offer_id}</span>
                        </a>
                      )}
                    </div>
                  )}
                  {log.content && (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {log.content}
                    </p>
                  )}
                </div>
              );
            })
          )}

          {hasMore && !loading && (
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full py-2 text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <span className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Ładowanie...</span>
                </span>
              ) : (
                'Załaduj więcej'
              )}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
