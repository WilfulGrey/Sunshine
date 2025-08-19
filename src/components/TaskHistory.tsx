import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Play, CheckCircle2, Calendar, XCircle, Phone, PhoneOff, RotateCcw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Task, TaskHistoryEntry } from '../types/Task';

interface TaskHistoryProps {
  tasks: Task[];
  onUndoAction: (taskId: string, historyEntryId: string) => void;
}

export const TaskHistory: React.FC<TaskHistoryProps> = ({ tasks, onUndoAction }) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter history entries to last 48 hours only
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // Get all history entries from all tasks, sorted by timestamp (newest first)
  const allHistoryEntries = tasks
    .flatMap(task => 
      (task.history || []).map(entry => ({
        ...entry,
        taskId: task.id,
        taskTitle: task.title
      }))
    )
    .filter(entry => entry.timestamp >= fortyEightHoursAgo) // Only last 48 hours
    .filter(entry => entry.action !== 'created') // Exclude creation entries
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'started': return Play;
      case 'completed': return CheckCircle2;
      case 'postponed': return Calendar;
      case 'cancelled': return XCircle;
      case 'reachable': return Phone;
      case 'not_reachable': return PhoneOff;
      default: return Clock;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'started': return 'text-purple-600 bg-purple-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'postponed': return 'text-orange-600 bg-orange-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      case 'reachable': return 'text-green-600 bg-green-100';
      case 'not_reachable': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'created': return t.taskCreated;
      case 'started': return t.processingStarted;
      case 'completed': return t.successfullyCompleted;
      case 'postponed': return t.postponeScheduled;
      case 'cancelled': return t.taskCancelled;
      case 'reachable': return t.callSuccessful;
      case 'not_reachable': return t.callUnsuccessful;
      default: return action;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return t.justNow;
    if (diffInMinutes < 60) return t.minutesAgo.replace('{minutes}', diffInMinutes.toString());
    if (diffInMinutes < 1440) return t.hoursAgo.replace('{hours}', Math.floor(diffInMinutes / 60).toString());
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (allHistoryEntries.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <Clock className="h-4 w-4 text-gray-600" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900">{t.activityHistory}</h3>
            <p className="text-sm text-gray-500">
              {allHistoryEntries.length} {t.actions} • {t.lastAction} {formatTime(allHistoryEntries[0]?.timestamp)}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 max-h-96 overflow-y-auto">
          <div className="p-4 space-y-3">
            {allHistoryEntries.map((entry) => {
              const ActionIcon = getActionIcon(entry.action);
              const actionColor = getActionColor(entry.action);
              
              return (
                <div key={`${entry.taskId}-${entry.id}`} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-lg ${actionColor}`}>
                    <ActionIcon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {getActionText(entry.action)}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {formatTime(entry.timestamp)}
                        </span>
                        {entry.canUndo && (
                          <button
                            onClick={() => onUndoAction(entry.taskId, entry.id)}
                            className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                            title={t.undo}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 truncate">
                      {entry.taskTitle}
                    </p>
                    
                    {entry.details && (
                      <p className="text-xs text-gray-500 mt-1">
                        {entry.details}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};