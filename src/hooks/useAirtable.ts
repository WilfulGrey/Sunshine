import { useState, useEffect } from 'react';
import { Task } from '../types/Task';
import { airtableService, AirtableContact } from '../services/airtableService';
import { convertAirtableContactToTask } from '../utils/airtableHelpers';
import { useAuth } from '../contexts/AuthContext';

export const useAirtable = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting to load contacts from Airtable...');
      
      // Pobierz kontakty i dostępnych użytkowników równolegle
      const [contacts, users] = await Promise.all([
        airtableService.getContacts(),
        airtableService.getAvailableUsers()
      ]);
      
      console.log(`Successfully loaded ${contacts.length} contacts from Airtable`);
      const convertedTasks = contacts.map(convertAirtableContactToTask);
      
      setTasks(convertedTasks);
      setAvailableUsers(users);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Błąd podczas ładowania kontaktów:', err);
      
      let errorMessage = 'Nie udało się załadować kontaktów z Airtable.';
      
      if (err instanceof Error) {
        if (err.message.includes('not authorized')) {
          errorMessage = 'Błąd autoryzacji: Sprawdź API Key i uprawnienia w Airtable.';
        } else if (err.message.includes('NOT_FOUND')) {
          errorMessage = 'Nie znaleziono tabeli. Sprawdź Base ID i nazwę tabeli.';
        } else if (err.message.includes('INVALID_REQUEST')) {
          errorMessage = 'Nieprawidłowe żądanie. Sprawdź konfigurację API.';
        } else {
          errorMessage = `Błąd: ${err.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh DISABLED temporarily for debugging
  // useEffect(() => {
  //   if (!loading) {
  //     const interval = setInterval(() => {
  //       console.log('🔄 Background sync with other users...');
  //       loadContacts();
  //     }, 60000);
  //     return () => clearInterval(interval);
  //   }
  // }, [loading]);

  // Mapowanie nazwy użytkownika na dostępną opcję w Airtable
  const mapUserToAirtableOption = (userName: string): string => {
    if (!userName) return userName;
    
    // Najpierw spróbuj znaleźć dokładne dopasowanie
    if (availableUsers.includes(userName)) {
      return userName;
    }
    
    // Jeśli nie ma dokładnego dopasowania, spróbuj znaleźć podobną opcję
    const normalizedName = userName.toLowerCase().replace(/\s+/g, ' ').trim();
    
    const match = availableUsers.find(availableUser => {
      const normalizedAvailable = availableUser.toLowerCase().replace(/\s+/g, ' ').trim();
      return normalizedAvailable === normalizedName || 
             normalizedAvailable.includes(normalizedName) ||
             normalizedName.includes(normalizedAvailable);
    });
    
    if (match) {
      console.log(`🔄 Mapped user "${userName}" to existing option "${match}"`);
      return match;
    }
    
    console.warn(`⚠️ No matching user option found for "${userName}". Available: ${availableUsers.join(', ')}`);
    return userName; // Fallback to original name
  };

  const updateTaskInAirtable = async (taskId: string, updates: Partial<Task>) => {
    // Check if this is a task completion action that should trigger refresh
    const isTaskCompletionAction = 
      updates.status === 'completed' || 
      updates.status === 'cancelled' || 
      updates.dueDate || // postpone action
      (updates as any).airtableUpdates?.['Status']; // any status change in Airtable

    try {
      // Get current user info for assignment
      const currentUserName = user?.user_metadata?.full_name || user?.email || 'Nieznany użytkownik';
      console.log('🔍 Current user data:', {
        user_metadata: user?.user_metadata,
        email: user?.email,
        currentUserName
      });
      
      const task = tasks.find(t => t.id === taskId);
      if (!task?.airtableData?.recordId) return;

      // Check if this is a "take task" operation
      const isTakingTask = updates.assignedTo === currentUserName && !task.assignedTo;
      
      if (isTakingTask) {
        console.log('🔒 Taking task - checking for conflicts...');
        
        // Fetch fresh data from Airtable to check current assignment
        try {
          const freshContacts = await airtableService.getContacts();
          const freshContact = freshContacts.find(c => c.id === task.airtableData?.recordId);
          
          if (freshContact?.fields['User'] && freshContact.fields['User'] !== currentUserName) {
            console.log('❌ Task already taken by:', freshContact.fields['User']);
            throw new Error(`Zadanie zostało już przypisane do: ${freshContact.fields['User']}`);
          }
        } catch (syncError) {
          console.error('❌ Error checking task assignment in Airtable:', syncError);
          throw new Error('Nie udało się sprawdzić aktualnego stanu zadania. Spróbuj ponownie.');
        }
      }


      // Use provided airtableUpdates or create default mapping
      let airtableUpdates: any = (updates as any).airtableUpdates || {};
      
      // Map User field if present (for both explicit and default updates)
      if (airtableUpdates['User']) {
        if (Array.isArray(airtableUpdates['User'])) {
          airtableUpdates['User'] = airtableUpdates['User'].map(mapUserToAirtableOption);
        } else {
          airtableUpdates['User'] = [mapUserToAirtableOption(airtableUpdates['User'])];
        }
        console.log('🔄 Mapped User field for Airtable:', airtableUpdates['User']);
      }
      
      // Default mappings if no specific airtableUpdates provided
      if (!airtableUpdates || Object.keys(airtableUpdates).length === 0) {
        if (updates.assignedTo) {
          const mappedUser = mapUserToAirtableOption(updates.assignedTo);
          console.log('🔄 Setting User field in Airtable:', {
            original: updates.assignedTo,
            mapped: mappedUser
          });
          airtableUpdates['User'] = [mappedUser];
        }
        if (updates.status === 'completed') {
          airtableUpdates['Status'] = 'kontakt udany';
        }
      }
      
      if (updates.dueDate) {
        // Use ISO 8601 format for Airtable date field
        airtableUpdates['kiedy dzwonić'] = updates.dueDate.toISOString();
        console.log('Updating Airtable "kiedy dzwonić" to:', airtableUpdates['kiedy dzwonić']);
      }

      if (Object.keys(airtableUpdates).length > 0) {
        console.log('📤 Sending updates to Airtable:', {
          recordId: task.airtableData.recordId,
          updates: airtableUpdates
        });
        await airtableService.updateContact(task.airtableData.recordId, airtableUpdates);
        console.log('✅ Successfully updated Airtable record');
      }

      // Clean up airtableUpdates from local state update
      const cleanUpdates = { ...updates };
      delete (cleanUpdates as any).airtableUpdates;
      
      // Aktualizuj lokalny stan - użyj funkcji callback dla lepszej synchronizacji
      setTasks(prev => {
        const newTasks = prev.map(t => 
          t.id === taskId ? { ...t, ...cleanUpdates } : t
        );
        console.log('Updated tasks state:', newTasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
        return newTasks;
      });
    } catch (err) {
      // Auto-refresh after task completion actions
      if (isTaskCompletionAction) {
        console.log('🔄 Task completion detected - refreshing contacts list...');
        setTimeout(() => {
          loadContacts();
        }, 1000); // Small delay to ensure Airtable has processed the update
      }
      console.error('Błąd podczas aktualizacji w Airtable:', err);
      
      // If it's a conflict error, refresh and throw
      if (err instanceof Error && err.message.includes('zostało już przypisane')) {
        await loadContacts();
        throw err;
      }
      
      // Clean up airtableUpdates from local state update
      const cleanUpdates = { ...updates };
      delete (cleanUpdates as any).airtableUpdates;
      
      // Mimo błędu, aktualizuj lokalnie - użyj funkcji callback
      setTasks(prev => {
        const newTasks = prev.map(t => 
          t.id === taskId ? { ...t, ...cleanUpdates } : t
        );
        console.log('Updated tasks state (after error):', newTasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
        return newTasks;
      });
    }
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    // Dla nowych zadań, dodaj je tylko lokalnie lub stwórz nowy rekord w Airtable
    const newTask: Task = {
      ...taskData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      history: []
    };
    
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  };

  const deleteTask = async (taskId: string) => {
    // Usuń tylko lokalnie - nie usuwamy rekordów z Airtable
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  useEffect(() => {
    loadContacts();
  }, []);

  return {
    tasks,
    loading,
    error,
    lastRefresh,
    availableUsers,
    mapUserToAirtableOption,
    loadContacts,
    updateTask: updateTaskInAirtable,
    addTask,
    deleteTask
  };
};