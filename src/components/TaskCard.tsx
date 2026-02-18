import React from 'react';
import { 
  Clock, 
  User, 
  Bot, 
  Zap, 
  MoreHorizontal,
  CheckCircle2,
  PlayCircle,
  Pause,
  Trash2,
  Edit3,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { Task, TaskType, TaskPriority, TaskStatus } from '../types/Task';
import { formatDate, isOverdue } from '../utils/helpers';
import { useTimezone } from '../contexts/TimezoneContext';

interface TaskCardProps {
  task: Task;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate, onDelete, onEdit }) => {
  const { timezone } = useTimezone();
  
  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'manual': return User;
      case 'voicebot': return Bot;
      case 'automatic': return Zap;
    }
  };

  const getTypeColor = (type: TaskType) => {
    switch (type) {
      case 'manual': return 'bg-blue-100 text-blue-700';
      case 'voicebot': return 'bg-purple-100 text-purple-700';
      case 'automatic': return 'bg-green-100 text-green-700';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'urgent': return 'bg-red-100 text-red-700';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'pending': return 'text-orange-600';
      case 'in_progress': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'cancelled': return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'pending': return Clock;
      case 'in_progress': return PlayCircle;
      case 'completed': return CheckCircle2;
      case 'cancelled': return Pause;
    }
  };

  const TypeIcon = getTypeIcon(task.type);
  const StatusIcon = getStatusIcon(task.status);
  const overdue = task.dueDate && isOverdue(task.dueDate) && task.status !== 'completed';

  const handleStatusChange = (newStatus: TaskStatus) => {
    onUpdate(task.id, { 
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date() : undefined
    });
  };

  return (
    <div className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow ${
      overdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4 flex-1">
          <div className={`p-2 rounded-lg ${getTypeColor(task.type)}`}>
            <TypeIcon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
              {overdue && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
            </div>
            
            {task.description && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {task.dueDate && (
                <div className={`flex items-center space-x-1 ${overdue ? 'text-red-600' : ''}`}>
                  <Clock className="h-4 w-4" />
                  <span>{formatDate(task.dueDate, undefined, timezone)}</span>
                </div>
              )}
              
              {task.assignedTo && (
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{task.assignedTo}</span>
                </div>
              )}
              
              {task.category && task.category !== 'Matching & Kontakt' && (
                <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                  {task.category}
                </span>
              )}
            </div>
            
            {/* Links from API data */}
            {task.apiData?.phoneNumber && (
              <div className="flex items-center space-x-2 mt-3">
                <a
                  href={`tel:${task.apiData.phoneNumber.replace(/\s/g, '')}`}
                  className="inline-flex items-center space-x-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs hover:bg-green-100 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Phone: {task.apiData.phoneNumber}</span>
                </a>
              </div>
            )}
            {task.apiData?.recruiterName && (
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs text-gray-500">Recruiter: {task.apiData.recruiterName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <div className="relative group">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <MoreHorizontal className="h-5 w-5" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => onEdit(task)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Edit3 className="h-4 w-4" />
                <span>Bearbeiten</span>
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Löschen</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority === 'low' ? 'Niedrig' : 
             task.priority === 'medium' ? 'Mittel' : 
             task.priority === 'high' ? 'Hoch' : 'Dringend'}
          </span>
          
          {task.trigger && (
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
              Trigger: {task.trigger}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 ${getStatusColor(task.status)}`}>
            <StatusIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {task.status === 'pending' ? 'Ausstehend' :
               task.status === 'in_progress' ? 'In Bearbeitung' :
               task.status === 'completed' ? 'Abgeschlossen' : 'Abgebrochen'}
            </span>
          </div>

          {task.status !== 'completed' && (
            <div className="flex space-x-1">
              {task.status === 'pending' && (
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  className="px-3 py-1 text-white text-xs rounded transition-colors"
                  style={{ backgroundColor: '#AB4D95' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9A3D85'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#AB4D95'}
                >
                  Starten
                </button>
              )}
              {task.status === 'in_progress' && (
                <button
                  onClick={() => handleStatusChange('completed')}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                >
                  Abschließen
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};