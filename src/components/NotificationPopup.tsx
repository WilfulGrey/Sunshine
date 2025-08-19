import React from 'react';
import { Clock, User, Bot, Zap, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { Task } from '../types/Task';
import { formatDate, isOverdue } from '../utils/helpers';

interface NotificationPopupProps {
  tasks: Task[];
  onClose: () => void;
  onStartTask: (task: Task) => void;
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({ 
  tasks, 
  onClose, 
  onStartTask 
}) => {
  const { t } = useLanguage();
  const { timezone } = useTimezone();

  // Filter and sort tasks by priority and due date
  const activeTasks = tasks.filter(task => task.status !== 'completed' && task.status !== 'cancelled');
  
  const sortedTasks = [...activeTasks].sort((a, b) => {
    // First sort by overdue status
    const aOverdue = a.dueDate && isOverdue(a.dueDate);
    const bOverdue = b.dueDate && isOverdue(b.dueDate);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    // Then by priority
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Finally by due date
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    
    return 0;
  });

  const nextTask = sortedTasks[0];
  const urgentTasks = sortedTasks.filter(task => task.priority === 'urgent').length;
  const overdueTasks = sortedTasks.filter(task => task.dueDate && isOverdue(task.dueDate)).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'manual': return User;
      case 'voicebot': return Bot;
      case 'automatic': return Zap;
      default: return User;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'manual': return 'bg-blue-100 text-blue-700';
      case 'voicebot': return 'bg-purple-100 text-purple-700';
      case 'automatic': return 'bg-green-100 text-green-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'urgent': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{t.notifications}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{activeTasks.length}</div>
            <div className="text-xs text-gray-600">{t.currentTasks}</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">{overdueTasks}</div>
            <div className="text-xs text-red-600">{t.overdueStatus}</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-lg font-bold text-orange-600">{urgentTasks}</div>
            <div className="text-xs text-orange-600">{t.urgent.replace('🔴 ', '')}</div>
          </div>
        </div>

        {nextTask ? (
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
              <span>🎯</span>
              <span>Nächste Aufgabe:</span>
            </h4>
            
            <div className={`border rounded-lg p-4 ${
              nextTask.dueDate && isOverdue(nextTask.dueDate) ? 'border-red-200 bg-red-50' : 'border-gray-200'
            }`}>
              <div className="flex items-start space-x-3 mb-3">
                <div className={`p-2 rounded-lg ${getTypeColor(nextTask.type)}`}>
                  {React.createElement(getTypeIcon(nextTask.type), { className: "h-4 w-4" })}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900 text-sm mb-1 truncate">
                    {nextTask.title}
                  </h5>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                    {nextTask.dueDate && (
                      <div className={`flex items-center space-x-1 ${
                        isOverdue(nextTask.dueDate) ? 'text-red-600' : ''
                      }`}>
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(nextTask.dueDate, t, timezone)}</span>
                        {isOverdue(nextTask.dueDate) && <AlertTriangle className="h-3 w-3" />}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(nextTask.priority)}`}>
                      {nextTask.priority === 'low' ? t.low.replace('🟢 ', '') : 
                       nextTask.priority === 'medium' ? t.medium.replace('🟡 ', '') : 
                       nextTask.priority === 'high' ? t.high.replace('🟠 ', '') : t.urgent.replace('🔴 ', '')}
                    </span>
                    
                    <button
                      onClick={() => {
                        onStartTask(nextTask);
                        onClose();
                      }}
                      className="px-3 py-1 text-white text-xs rounded transition-colors flex items-center space-x-1"
                      style={{ backgroundColor: '#AB4D95' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9A3D85'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#AB4D95'}
                    >
                      <ArrowRight className="h-3 w-3" />
                      <span>{t.start}</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {nextTask.description && (
                <p className="text-xs text-gray-600 line-clamp-2 ml-11">
                  {nextTask.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🎉</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{t.allTasksCompleted}</p>
            <p className="text-xs text-gray-500">{t.greatWork}</p>
          </div>
        )}
      </div>
    </div>
  );
};