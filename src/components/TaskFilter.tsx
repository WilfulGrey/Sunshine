import React from 'react';
import { Filter, Search } from 'lucide-react';
import { TaskType, TaskPriority, TaskStatus } from '../types/Task';

interface FilterState {
  status: TaskStatus | 'all';
  type: TaskType | 'all';
  priority: TaskPriority | 'all';
  search: string;
}

interface TaskFilterProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
}

export const TaskFilter: React.FC<TaskFilterProps> = ({ filter, onFilterChange }) => {
  const updateFilter = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filter, [key]: value });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="h-5 w-5 text-gray-500" />
        <span className="font-medium text-gray-900">Filter & Suche</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Aufgaben durchsuchen..."
            value={filter.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            style={{ focusRingColor: '#AB4D95' }}
          />
        </div>

        <select
          value={filter.type}
          onChange={(e) => updateFilter('type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          style={{ focusRingColor: '#AB4D95' }}
        >
          <option value="all">Alle Typen</option>
          <option value="manual">Manuell</option>
          <option value="automatic">Automatisch</option>
          <option value="voicebot">Voicebot</option>
        </select>

        <select
          value={filter.priority}
          onChange={(e) => updateFilter('priority', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          style={{ focusRingColor: '#AB4D95' }}
        >
          <option value="all">Alle Prioritäten</option>
          <option value="low">Niedrig</option>
          <option value="medium">Mittel</option>
          <option value="high">Hoch</option>
          <option value="urgent">Dringend</option>
        </select>
      </div>
    </div>
  );
};