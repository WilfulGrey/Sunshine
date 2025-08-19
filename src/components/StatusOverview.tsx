import React from 'react';
import { Clock, PlayCircle, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Task } from '../types/Task';

interface StatusOverviewProps {
  tasks: Task[];
  selectedStatus: string;
  onStatusClick: (status: string) => void;
}

export const StatusOverview: React.FC<StatusOverviewProps> = ({ tasks, selectedStatus, onStatusClick }) => {
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length,
    overdue: tasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'completed').length
  };

  const cards = [
    {
      title: 'Gesamt',
      value: stats.total,
      icon: Clock,
      color: 'bg-gray-100 text-gray-700',
      iconColor: 'text-gray-600',
      status: 'all'
    },
    {
      title: 'Überfällig',
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-700',
      iconColor: 'text-red-600',
      status: 'overdue'
    },
    {
      title: 'Ausstehend',
      value: stats.pending,
      icon: Clock,
      color: 'bg-orange-100 text-orange-700',
      iconColor: 'text-orange-600',
      status: 'pending'
    },
    {
      title: 'In Bearbeitung',
      value: stats.inProgress,
      icon: PlayCircle,
      color: 'bg-blue-100 text-blue-700',
      iconColor: 'text-blue-600',
      status: 'in_progress'
    },
    {
      title: 'Abgeschlossen',
      value: stats.completed,
      icon: CheckCircle2,
      color: 'bg-green-100 text-green-700',
      iconColor: 'text-green-600',
      status: 'completed'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedStatus === card.status;
        return (
          <button
            key={card.title}
            onClick={() => onStatusClick(card.status)}
            className={`${card.color} rounded-lg p-4 transition-all hover:shadow-md ${
              isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-75">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
              <Icon className={`h-8 w-8 ${card.iconColor} opacity-75`} />
            </div>
          </button>
        );
      })}
    </div>
  );
};