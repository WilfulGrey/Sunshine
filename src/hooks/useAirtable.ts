import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types/Task';
import { airtableService, AirtableContact } from '../services/airtableService';
import { convertAirtableContactToTask } from '../utils/airtableHelpers';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
      
      
      // Pobierz kontakty i dostępnych użytkowników równolegle
      const [contacts, users] = await Promise.all([
        airtableService.getContacts(),
        airtableService.getAvailableUsers()
      ]);
      
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

  const silentRefresh = async () => {
    try {
      
      // Pobierz kontakty i dostępnych użytkowników równolegle
      const [contacts, users] = await Promise.all([
        airtableService.getContacts(),
        airtableService.getAvailableUsers()
      ]);
      
      const convertedTasks = contacts.map(convertAirtableContactToTask);
      
      
      // Update data silently - no loading state changes
      setTasks(convertedTasks);
      setAvailableUsers(users);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('🔇 Silent refresh failed:', err);
      // Don't set error state for silent refresh - don't disrupt user experience
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
    
    // Agresywna normalizacja - usuń WSZYSTKIE niedrukowane znaki
    const normalizeString = (str: string): string => {
      return str
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // usuń kontrolne znaki
        .replace(/[\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, '') // usuń Unicode spaces
        .trim()
        .replace(/\s+/g, ' ');
    };
    
    const normalizedUserName = normalizeString(userName);
    
    // Sprawdź dopasowanie na agresywnie znormalizowanych stringach
    const exactMatch = availableUsers.find(u => normalizeString(u) === normalizedUserName);
    if (exactMatch) {
      return exactMatch;
    }
    
    // Fuzzy matching dla podobnych nazw (błędy pisowni)
    const normalizedName = normalizeString(userName).toLowerCase();
    
    // Funkcja podobieństwa stringów (Levenshtein distance)
    const similarity = (a: string, b: string): number => {
      const matrix = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return 1 - (matrix[b.length][a.length] / Math.max(a.length, b.length));
    };
    
    // Znajdź najbardziej podobną opcję (>85% podobieństwa)
    let bestMatch = null;
    let bestSimilarity = 0;
    
    for (const availableUser of availableUsers) {
      const normalizedAvailable = normalizeString(availableUser).toLowerCase();
      const sim = similarity(normalizedName, normalizedAvailable);
      
      
      if (sim > bestSimilarity && sim > 0.85) {
        bestMatch = availableUser;
        bestSimilarity = sim;
      }
    }
    
    if (bestMatch) {
      return bestMatch;
    }
    
    // Jeśli nie ma w Airtable, ale użytkownik istnieje w systemie - pozwól na dodanie
    return userName; // Airtable może automatycznie dodać nową opcję do multiselect
  };

  const updateTaskInAirtable = async (taskId: string, updates: Partial<Task>) => {
    // Get current user info for assignment
    const currentUserName = user?.user_metadata?.full_name || user?.email || 'Nieznany użytkownik';
    
    // Check if this is transfer to different user (should remove task)
    const isTransferToOtherUser = (updates as any).airtableUpdates?.['User'] && 
      updates.assignedTo && updates.assignedTo !== currentUserName;
    
    // Check if this is a task completion action that should remove task from list
    const isTaskCompletionAction = 
      updates.status === 'completed' || 
      updates.status === 'cancelled' || 
      (updates as any).airtableUpdates?.['Status'] || // any status change in Airtable
      isTransferToOtherUser; // only transfer to different user, not "take task"

    try {
      
      const task = tasks.find(t => t.id === taskId);
      if (!task?.airtableData?.recordId) return;

      // Check if this is a "take task" operation
      const isTakingTask = updates.assignedTo === currentUserName && !task.assignedTo;
      
      if (isTakingTask) {
        // Fetch fresh data from Airtable to check current assignment
        try {
          const freshContacts = await airtableService.getContacts();
          const freshContact = freshContacts.find(c => c.id === task.airtableData?.recordId);
          
          if (freshContact?.fields['User'] && freshContact.fields['User'] !== currentUserName) {
            throw new Error(`Zadanie zostało już przypisane do: ${freshContact.fields['User']}`);
          }
        } catch (syncError) {
          console.error('❌ Error checking task assignment in Airtable:', syncError);
          throw new Error('Nie udało się sprawdzić aktualnego stanu zadania. Spróbuj ponownie.');
        }
      }


      // Use provided airtableUpdates or create default mapping
      const airtableUpdates: any = (updates as any).airtableUpdates || {};
      
      // Map User field if present (for both explicit and default updates)
      if (airtableUpdates['User']) {
        console.log('🔍 Original User field value:', airtableUpdates['User'], 'Type:', typeof airtableUpdates['User']);
        console.log('🔍 Available users in Airtable:', availableUsers);
        
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

        // Weryfikacja przypisania dla "take task" operations
        if (isTakingTask) {
          console.log('🔍 Weryfikuję czy przypisanie się powiodło...');
          await new Promise(resolve => setTimeout(resolve, 1500)); // Poczekaj na propagację

          const verificationContacts = await airtableService.getContacts();
          const verifiedContact = verificationContacts.find(c => c.id === task.airtableData?.recordId);
          
          if (!verifiedContact?.fields['User'] || 
              (Array.isArray(verifiedContact.fields['User']) && !verifiedContact.fields['User'].includes(currentUserName)) ||
              (!Array.isArray(verifiedContact.fields['User']) && verifiedContact.fields['User'] !== currentUserName)) {
            console.log('❌ Weryfikacja nie powiodła się - zadanie nie przypisało się poprawnie');
            console.log('Oczekiwano:', currentUserName, 'Otrzymano:', verifiedContact?.fields['User']);
            throw new Error(`Zadanie nie przypisało się poprawnie. Spróbuj ponownie lub skontaktuj się z administratorem.`);
          }
          
          console.log('✅ Weryfikacja przypisania udana - zadanie przypisane do:', verifiedContact.fields['User']);
        }
      }

      // Clean up airtableUpdates from local state update
      const cleanUpdates = { ...updates };
      delete (cleanUpdates as any).airtableUpdates;
      
      // For completion actions - remove task, for others - update task
      if (isTaskCompletionAction) {
        console.log('🔄 Task completion/transfer detected (SUCCESS) - removing task locally');
        setTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        // Aktualizuj lokalny stan - użyj funkcji callback dla lepszej synchronizacji
        setTasks(prev => {
          const newTasks = prev.map(t => 
            t.id === taskId ? { ...t, ...cleanUpdates } : t
          );
          console.log('Updated tasks state:', newTasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
          return newTasks;
        });
      }
    } catch (err) {
      // Don't remove task on error - user should see what happened
      console.log('❌ Task update failed, keeping task in list for user visibility');
      console.error('Błąd podczas aktualizacji w Airtable:', err);
      
      // If it's a conflict error, refresh and throw
      if (err instanceof Error && err.message.includes('zostało już przypisane')) {
        // Refresh tasks by calling the same logic without recursion
        try {
          const freshContacts = await airtableService.getContacts();
          const freshTasks = freshContacts.map(convertAirtableContactToTask);
          setTasks(freshTasks);
        } catch (refreshErr) {
          console.error('Failed to refresh after conflict:', refreshErr);
        }
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
  }, []); // Empty dependency array

  // Real-time listener moved to TaskFocusedView for better focused task handling

  // Production: Remove verbose debug logging

  return {
    tasks,
    loading,
    error,
    lastRefresh,
    availableUsers,
    mapUserToAirtableOption,
    loadContacts,
    silentRefresh,
    updateTask: updateTaskInAirtable,
    addTask,
    deleteTask
  };
};