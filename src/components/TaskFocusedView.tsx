import React from 'react';
import { Clock, User, CheckCircle2, Pause, AlertTriangle, ArrowRight, ExternalLink, Phone, X, Skull } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { useUsers } from '../hooks/useUsers';
import { useAirtable } from '../hooks/useAirtable';
import { Task } from '../types/Task';
import { formatDate, isOverdue } from '../utils/helpers';
import { useTaskActions } from '../hooks/useTaskActions';
import { useDialogState } from '../hooks/useDialogState';
import { getTypeIcon, getTypeColor, getPriorityColor, getProcessedTasks } from '../utils/taskUtils';
import { CompletionDialog } from './dialogs/CompletionDialog';
import { AbandonDialog } from './dialogs/AbandonDialog';
import { TransferDialog } from './dialogs/TransferDialog';
import { PostponeDialog } from './dialogs/PostponeDialog';

interface TaskFocusedViewProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

export const TaskFocusedView: React.FC<TaskFocusedViewProps> = ({ tasks, onUpdateTask }) => {
  const { t } = useLanguage();
  const { timezone } = useTimezone();
  const { users, getUserDisplayName } = useUsers();
  const { availableUsers } = useAirtable();
  
  const taskActions = useTaskActions(tasks, onUpdateTask);
  const dialogState = useDialogState();

  const { nextTask, upcomingTasks } = getProcessedTasks(tasks, taskActions.currentUserName, taskActions.takenTasks);



  const handleStartTask = (task: Task) => {
    dialogState.openPhoneDialog(task);
  };

  const handlePhoneCall = (reachable: boolean) => {
    if (!dialogState.showPhoneDialog) return;
    
    taskActions.handlePhoneCall(dialogState.showPhoneDialog, reachable);
    dialogState.closePhoneDialog();
  };

  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      dialogState.openCompletionDialog(task);
    }
  };

  const handlePostponeTask = (taskId: string) => {
    dialogState.openPostponeDialog(taskId);
  };

  const handlePostponeConfirm = () => {
    if (dialogState.showPostponeDialog && dialogState.postponeDate && dialogState.postponeTime) {
      const task = tasks.find(t => t.id === dialogState.showPostponeDialog);
      if (task) {
        taskActions.handlePostponeTask(
          task,
          dialogState.postponeDate,
          dialogState.postponeTime,
          dialogState.postponeNotes
        );
      }
      dialogState.closePostponeDialog();
    }
  };


  const handleCompletionConfirm = () => {
    if (!dialogState.showCompletionDialog) return;
    
    taskActions.handleCompleteTask(
      dialogState.showCompletionDialog,
      dialogState.completionSummary
    );
    dialogState.closeCompletionDialog();
  };

  const handleAbandonConfirm = () => {
    if (!dialogState.showAbandonDialog) return;
    
    taskActions.handleAbandonTask(
      dialogState.showAbandonDialog,
      dialogState.abandonReason
    );
    dialogState.closeAbandonDialog();
  };

  const handleTransferTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      dialogState.openTransferDialog(task);
    }
  };

  const handleTransferConfirm = () => {
    if (!dialogState.showTransferDialog || !dialogState.transferToUser) return;
    
    taskActions.handleTransferTask(
      dialogState.showTransferDialog,
      dialogState.transferToUser,
      dialogState.transferReason
    );
    dialogState.closeTransferDialog();
  };


  const handleAbandonTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      dialogState.openAbandonDialog(task);
    }
  };






  if (!nextTask) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t.allTasksCompleted}</h3>
        <p className="text-gray-500">{t.greatWork}</p>
      </div>
    );
  }

  const TypeIcon = getTypeIcon(nextTask.type);
  const isNextTaskOverdue = nextTask.dueDate && isOverdue(nextTask.dueDate);

  return (
    <div className="space-y-8">
      {/* Next Task - Hero Section */}
      <div className={`bg-white rounded-xl border-2 p-8 ${
        isNextTaskOverdue ? 'border-red-300 bg-red-50' : 'border-purple-200'
      }`}>
        <div className="flex items-center space-x-3 mb-4">
          {nextTask.airtableData?.urgent && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-700 rounded-full relative group">
              <span className="text-lg">🚨</span>
              <span className="text-sm font-bold">PILNE</span>
              <button
                onClick={() => taskActions.handleRemoveUrgent(nextTask.id)}
                className="ml-2 p-1 hover:bg-red-200 rounded-full transition-colors"
                title="Usuń status pilny"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(nextTask.priority)}`}>
            {nextTask.priority === 'low' ? t.low : 
             nextTask.priority === 'medium' ? t.medium : 
             nextTask.priority === 'high' ? t.high : t.urgent}
          </span>
          {nextTask.dueDate && (
            <div className={`flex items-center space-x-2 ${isNextTaskOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
              <Clock className="h-4 w-4" />
              <span className="text-sm">{formatDate(nextTask.dueDate, t, timezone)}</span>
              {isNextTaskOverdue && <AlertTriangle className="h-4 w-4" />}
            </div>
          )}
          {isNextTaskOverdue && (
            <span className="text-red-600 font-semibold">{t.overdue}</span>
          )}
        </div>

        <div className="flex items-start space-x-6">
          <div className={`p-4 rounded-xl ${getTypeColor(nextTask.type)}`}>
            <TypeIcon className="h-8 w-8" />
          </div>

          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{nextTask.title}</h3>

            {nextTask.description && (
              <p className="text-gray-700 text-lg mb-4">{nextTask.description}</p>
            )}

            {/* Poprzednie rekomendacje z Airtable */}
            {nextTask.airtableData?.previousRecommendation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                {console.log('=== DEBUG PREVIOUS RECOMMENDATION ===', nextTask.airtableData.previousRecommendation)}
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm">💡</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Notatka Agenta:</h4>
                    <p className="text-blue-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {nextTask.airtableData.previousRecommendation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Następne kroki z Airtable */}
            {nextTask.airtableData?.nextSteps && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-sm">📝</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">Następne kroki:</h4>
                    <p className="text-green-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {nextTask.airtableData.nextSteps}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Linki z Airtable */}
            {nextTask.airtableData && (nextTask.airtableData.profileLink || nextTask.airtableData.retellLink || nextTask.airtableData.jobLink) && (
              <div className="flex items-center space-x-3 mb-6">
                {nextTask.airtableData.profileLink && (
                  <a
                    href={nextTask.airtableData.profileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Profil w portalu MM</span>
                  </a>
                )}
                {nextTask.airtableData.retellLink && (
                  <a
                    href={nextTask.airtableData.retellLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Dashboard Retell</span>
                  </a>
                )}
                {nextTask.airtableData.jobLink && (
                  <a
                    href={nextTask.airtableData.jobLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Link do JOBa</span>
                  </a>
                )}
              </div>
            )}

            {nextTask.category && nextTask.category !== 'Matching & Kontakt' && nextTask.category !== t.matchingContact && (
              <div className="mb-6">
                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                  {nextTask.category}
                </span>
              </div>
            )}

            <div className="flex space-x-3">
              {nextTask.status === 'pending' && (
                <>
                  {!taskActions.isTaskAssignedToMe(nextTask) ? (
                    <button
                      disabled={taskActions.takingTask === nextTask.id}
                      onClick={() => taskActions.handleTakeTask(nextTask.id)}
                      className="px-6 py-3 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#AB4D95' }}
                      onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#9A3D85')}
                      onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#AB4D95')}
                    >
                      <User className="h-5 w-5" />
                      <span>{taskActions.takingTask === nextTask.id ? 'Przypisuję...' : 'Biorę'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartTask(nextTask)}
                        className="px-6 py-3 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                        style={{ backgroundColor: '#AB4D95' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9A3D85'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#AB4D95'}
                      >
                        <Phone className="h-5 w-5" />
                        <span>{t.startNow}</span>
                      </button>
                      
                      <button
                        onClick={() => handlePostponeTask(nextTask.id)}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center space-x-2"
                      >
                        <Pause className="h-5 w-5" />
                        <span>{t.postpone}</span>
                      </button>
                      
                      <button
                        onClick={() => handleTransferTask(nextTask.id)}
                        className="px-6 py-3 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center space-x-2"
                      >
                        <ArrowRight className="h-5 w-5" />
                        <span>Transfer</span>
                      </button>
                      
                      <button
                        onClick={() => handleAbandonTask(nextTask.id)}
                        className="px-6 py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors flex items-center space-x-2"
                      >
                        <Skull className="h-5 w-5" />
                        <span>Porzuć kontakt</span>
                      </button>
                    </>
                  )}
                </>
              )}
              
              {nextTask.status === 'in_progress' && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleCompleteTask(nextTask.id)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span>{t.complete}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <span>{t.upcomingTasks}</span>
            <span className="text-sm font-normal text-gray-500">({upcomingTasks.length})</span>
          </h3>
          
          <div className="space-y-3">
            {upcomingTasks.map((task, index) => {
              const TaskTypeIcon = getTypeIcon(task.type);
              const taskOverdue = task.dueDate && isOverdue(task.dueDate);
              
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-lg border p-4 hover:shadow-md transition-all ${
                    taskOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-sm font-medium text-gray-400 w-6">#{index + 2}</span>
                      
                      <div className={`p-2 rounded-lg ${getTypeColor(task.type)}`}>
                        <TaskTypeIcon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                          {task.airtableData?.urgent && (
                            <span className="text-red-500 text-lg" title="Pilne zadanie z Airtable">🚨</span>
                          )}
                          {taskOverdue && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          {task.dueDate && (
                            <div className={`flex items-center space-x-1 ${taskOverdue ? 'text-red-600' : ''}`}>
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(task.dueDate, t, timezone)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority === 'low' ? t.low.replace('🟢 ', '') : 
                         task.priority === 'medium' ? t.medium.replace('🟡 ', '') : 
                         task.priority === 'high' ? t.high.replace('🟠 ', '') : t.urgent.replace('🔴 ', '')}
                      </span>
                      
                      <div className="flex items-center space-x-1">
                        {task.airtableData?.urgent && (
                          <button
                            onClick={() => taskActions.handleBoostUrgent(task.id)}
                            className="p-1 text-red-500 hover:text-red-700 transition-colors"
                            title="Pilny kontakt - przenieś na pierwszą pozycję"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => taskActions.handleBoostPriority(task.id)}
                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Osoba dzwoni - przenieś na pierwszą pozycję"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Phone Call Dialog */}
      {dialogState.showPhoneDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📞</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.startCall}</h3>
              <p className="text-gray-600 mb-4">{dialogState.showPhoneDialog.title}</p>
              
              {/* Phone Number Display */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">{t.phoneNumber}</p>
                <a 
                  href={`tel:${taskActions.extractPhoneNumber(dialogState.showPhoneDialog).replace(/\s/g, '')}`}
                  className="text-2xl font-bold text-blue-600 hover:text-blue-800 transition-colors block"
                >
                  {taskActions.extractPhoneNumber(dialogState.showPhoneDialog)}
                </a>
                <p className="text-xs text-gray-500 mt-2">{t.clickToCall}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-center text-gray-700 font-medium">{t.wasPersonReachable}</p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handlePhoneCall(true)}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{t.yesReachable}</span>
                </button>
                
                <button
                  onClick={() => handlePhoneCall(false)}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <XCircle className="h-5 w-5" />
                  <span>{t.notReachable}</span>
                </button>
              </div>
              
              <button
                onClick={dialogState.closePhoneDialog}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abandon Contact Dialog */}
      {dialogState.showAbandonDialog && (
        <AbandonDialog
          task={dialogState.showAbandonDialog}
          abandonReason={dialogState.abandonReason}
          setAbandonReason={dialogState.setAbandonReason}
          onConfirm={handleAbandonConfirm}
          onClose={dialogState.closeAbandonDialog}
        />
      )}

      {/* Transfer Dialog */}
      {dialogState.showTransferDialog && (
        <TransferDialog
          task={dialogState.showTransferDialog}
          transferToUser={dialogState.transferToUser}
          setTransferToUser={dialogState.setTransferToUser}
          transferReason={dialogState.transferReason}
          setTransferReason={dialogState.setTransferReason}
          currentUserName={taskActions.currentUserName}
          onConfirm={handleTransferConfirm}
          onClose={dialogState.closeTransferDialog}
        />
      )}

      {/* Postpone Dialog */}
      {dialogState.showPostponeDialog && (
        <PostponeDialog
          postponeDate={dialogState.postponeDate}
          setPostponeDate={dialogState.setPostponeDate}
          postponeTime={dialogState.postponeTime}
          setPostponeTime={dialogState.setPostponeTime}
          postponeNotes={dialogState.postponeNotes}
          setPostponeNotes={dialogState.setPostponeNotes}
          onConfirm={handlePostponeConfirm}
          onClose={dialogState.closePostponeDialog}
        />
      )}

      {/* Completion Summary Dialog */}
      {dialogState.showCompletionDialog && (
        <CompletionDialog
          task={dialogState.showCompletionDialog}
          completionSummary={dialogState.completionSummary}
          setCompletionSummary={dialogState.setCompletionSummary}
          onConfirm={handleCompletionConfirm}
          onClose={dialogState.closeCompletionDialog}
        />
      )}
    </div>
  );
};