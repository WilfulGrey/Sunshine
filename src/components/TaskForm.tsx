import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Bot, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useUsers } from '../hooks/useUsers';
import { Task, TaskType, TaskPriority, TaskStatus } from '../types/Task';

interface TaskFormProps {
  task?: Task | null;
  onSave: (taskData: Omit<Task, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ task, onSave, onCancel }) => {
  const { t } = useLanguage();
  const { users, loading: usersLoading, getUserDisplayName } = useUsers();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'manual' as TaskType,
    priority: 'medium' as TaskPriority,
    status: 'pending' as TaskStatus,
    dueDate: '',
    assignedTo: '',
    trigger: '',
    wklejkaUrl: '',
    voicebotConfig: {
      script: '',
      recipients: [] as string[],
      scheduledFor: ''
    }
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        type: task.type,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 16) : '',
        assignedTo: task.assignedTo || '',
        trigger: task.trigger || '',
        wklejkaUrl: task.apiData?.wklejkaUrl || '',
        voicebotConfig: {
          script: task.voicebotConfig?.script || '',
          recipients: task.voicebotConfig?.recipients || [],
          scheduledFor: task.voicebotConfig?.scheduledFor ? 
            task.voicebotConfig.scheduledFor.toISOString().slice(0, 16) : ''
        }
      });
    } else {
      // Reset form for new task
      setFormData({
        title: '',
        description: '',
        type: 'manual',
        priority: 'medium',
        status: 'pending',
        dueDate: '',
        assignedTo: '',
        trigger: '',
        wklejkaUrl: '',
        voicebotConfig: {
          script: '',
          recipients: [],
          scheduledFor: ''
        }
      });
    }
  }, [task]);

  // Auto-assign to Voicebot System when type is voicebot
  useEffect(() => {
    if (formData.type === 'voicebot') {
      setFormData(prev => ({ ...prev, assignedTo: 'Voicebot System' }));
    }
  }, [formData.type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData: Omit<Task, 'id' | 'createdAt'> = {
      title: formData.title,
      description: formData.description || undefined,
      type: formData.type,
      priority: formData.priority,
      status: formData.status,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      assignedTo: formData.type === 'voicebot' ? 'Voicebot System' : (formData.assignedTo || undefined),
      trigger: formData.trigger || undefined,
      voicebotConfig: formData.type === 'voicebot' ? {
        script: formData.voicebotConfig.script || undefined,
        recipients: formData.voicebotConfig.recipients.length > 0 ? formData.voicebotConfig.recipients : undefined,
        scheduledFor: formData.voicebotConfig.scheduledFor ? new Date(formData.voicebotConfig.scheduledFor) : undefined
      } : undefined
    };

    // Jeśli edytujemy zadanie z API i zmienił się URL wklejki
    if (task?.apiData && formData.wklejkaUrl !== (task.apiData.wklejkaUrl || '')) {
      (taskData as any).apiUpdates = {
        'Wklejka': formData.wklejkaUrl || null
      };
    }

    onSave(taskData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {task ? t.editTask : t.createNewTask}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.titleRequired}
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder={t.titlePlaceholder}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.description}
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder={t.descriptionPlaceholder}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.typeRequired}
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as TaskType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="manual">{t.manual}</option>
                <option value="automatic">{t.automatic}</option>
                <option value="voicebot">{t.voicebot}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.priorityRequired}
              </label>
              <select
                required
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="low">{t.low}</option>
                <option value="medium">{t.medium}</option>
                <option value="high">{t.high}</option>
                <option value="urgent">{t.urgent}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.status}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="pending">{t.pending}</option>
                <option value="in_progress">{t.inProgress}</option>
                <option value="completed">{t.completed}</option>
                <option value="cancelled">{t.cancelled}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.type !== 'voicebot' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.dueDate}
                </label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            )}

            <div className={formData.type === 'voicebot' ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.assignedTo}
              </label>
              {formData.type === 'voicebot' ? (
                <div className="flex items-center space-x-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                  <Bot className="h-5 w-5 text-purple-600" />
                  <span className="text-purple-700 font-medium">{t.voicebotSystem}</span>
                </div>
              ) : (
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={usersLoading}
                >
                  <option value="">{t.notAssigned}</option>
                  {usersLoading ? (
                    <option disabled>Ładowanie użytkowników...</option>
                  ) : (
                    users.map(user => (
                      <option key={user.id} value={getUserDisplayName(user)}>
                        {getUserDisplayName(user)}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          </div>

          {/* URL Wklejki - tylko dla zadań z API */}
          {task?.apiData && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL Wklejki
              </label>
              <input
                type="url"
                value={formData.wklejkaUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, wklejkaUrl: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="https://..."
              />
            </div>
          )}

          {formData.type === 'automatic' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.triggerEvent}
              </label>
              <input
                type="text"
                value={formData.trigger}
                onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder={t.triggerPlaceholder}
              />
            </div>
          )}

          {formData.type === 'voicebot' && (
            <div className="bg-purple-50 p-4 rounded-lg space-y-4">
              <div className="flex items-center space-x-2 mb-2">
                <Bot className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-purple-900">{t.voicebotConfig}</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.scriptMessage}
                </label>
                <textarea
                  rows={3}
                  value={formData.voicebotConfig.script}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    voicebotConfig: { ...prev.voicebotConfig, script: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder={t.scriptPlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.scheduledFor}
                </label>
                <input
                  type="datetime-local"
                  value={formData.voicebotConfig.scheduledFor}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    voicebotConfig: { ...prev.voicebotConfig, scheduledFor: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-white rounded-lg transition-colors"
              style={{ backgroundColor: '#AB4D95' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9A3D85'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#AB4D95'}
            >
              {task ? t.update : t.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};