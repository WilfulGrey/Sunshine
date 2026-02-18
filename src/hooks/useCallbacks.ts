import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types/Task';
import { sunshineService } from '../services/sunshineService';
import { convertCallbackToTask } from '../utils/sunshineHelpers';
import { getAllEmployees } from '../config/employeeMapping';

export const useCallbacks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const availableUsers = getAllEmployees().map(e => e.name);

  const loadCallbacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await sunshineService.getCallbacks(1, 100);
      const convertedTasks = response.data.map(convertCallbackToTask);

      setTasks(convertedTasks);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Błąd podczas ładowania callbacks:', err);

      let errorMessage = 'Nie udało się załadować kontaktów.';
      if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('403')) {
          errorMessage = 'Błąd autoryzacji: Sprawdź X-Sunshine-Token.';
        } else if (err.message.includes('404')) {
          errorMessage = 'Endpoint nie znaleziony. Sprawdź VITE_SUNSHINE_API_URL.';
        } else {
          errorMessage = `Błąd: ${err.message}`;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const response = await sunshineService.getCallbacks(1, 100);
      const convertedTasks = response.data.map(convertCallbackToTask);

      setTasks(convertedTasks);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Silent refresh failed:', err);
    }
  }, []);

  const updateLocalTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    ));
  }, []);

  const removeLocalTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  useEffect(() => {
    loadCallbacks();
  }, [loadCallbacks]);

  return {
    tasks,
    loading,
    error,
    lastRefresh,
    availableUsers,
    loadCallbacks,
    silentRefresh,
    updateLocalTask,
    removeLocalTask,
  };
};
