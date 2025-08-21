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
    
    // Agresywna normalizacja - usuń WSZYSTKIE niedrukowane znaki
    const normalizeString = (str: string): string => {
      return str
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // usuń kontrolne znaki
        .replace(/[\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, '') // usuń Unicode spaces
        .trim()
        .replace(/\s+/g, ' ');
    };
    
    const normalizedUserName = normalizeString(userName);
    console.log(`🔍 DEBUGGING mapUserToAirtableOption:`);
    console.log(`  - Looking for: "${userName}" -> normalized: "${normalizedUserName}" (length: ${normalizedUserName.length})`);
    console.log(`  - Char codes:`, userName.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' '));
    
    const normalizedAvailableUsers = availableUsers.map(u => ({
      original: u,
      normalized: normalizeString(u),
      charCodes: u.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ')
    }));
    
    console.log(`  - Available users:`, normalizedAvailableUsers.map(u => 
      `"${u.original}" -> "${u.normalized}" (${u.original.length} -> ${u.normalized.length})`
    ));
    
    // Sprawdź dopasowanie na agresywnie znormalizowanych stringach
    const exactMatch = availableUsers.find(u => normalizeString(u) === normalizedUserName);
    if (exactMatch) {
      console.log(`✅ Found exact match in Airtable: "${exactMatch}" (aggressively normalized)`);
      return exactMatch;
    }
    
    // Debug: pokaż różnice w char codes
    normalizedAvailableUsers.forEach(u => {
      if (u.normalized === normalizedUserName) {
        console.log(`🔍 MATCH FOUND BUT MISSED: "${u.original}"`);
        console.log(`  User chars: ${userName.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ')}`);
        console.log(`  Available chars: ${u.charCodes}`);
      }
    });
    
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
      
      console.log(`🔍 Similarity "${userName}" vs "${availableUser}": ${(sim * 100).toFixed(1)}%`);
      
      if (sim > bestSimilarity && sim > 0.85) {
        bestMatch = availableUser;
        bestSimilarity = sim;
      }
    }
    
    if (bestMatch) {
      console.log(`🔄 Fuzzy matched user "${userName}" to "${bestMatch}" (${(bestSimilarity * 100).toFixed(1)}% similarity)`);
      return bestMatch;
    }
    
    // Jeśli nie ma w Airtable, ale użytkownik istnieje w systemie - pozwól na dodanie
    console.warn(`⚠️ User "${userName}" not found in Airtable options. Available: ${availableUsers.join(', ')}`);
    console.log(`🆕 Will attempt to add new user "${userName}" to Airtable`);
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

    console.log('🔍 updateTaskInAirtable debug:', {
      taskId,
      updates,
      currentUserName,
      assignedTo: updates.assignedTo,
      isTransferToOtherUser,
      isTaskCompletionAction,
      airtableUpdates: (updates as any).airtableUpdates
    });

    try {
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