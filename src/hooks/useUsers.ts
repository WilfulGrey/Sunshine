import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  full_name: string | null;
  email: string;
  created_at?: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Attempting to load users from Supabase...');
      
      // Najpierw spróbuj pobrać z tabeli profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .order('full_name', { ascending: true });

      // Jeśli tabela profiles nie istnieje lub jest pusta, spróbuj użyć istniejących danych
      if (profilesError || !profilesData || profilesData.length === 0) {
        console.log('Profiles table not available or empty, checking for existing users...');
        
        // Sprawdź czy mamy dostęp do auth.users 
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser) {
          console.log('Current user found:', currentUser);
          console.log('Trying to get all users from auth...');
          
          // Spróbuj pobrać innych użytkowników przez RPC lub admin API
          try {
            // Metoda 1: Spróbuj RPC jeśli istnieje funkcja
            const { data: authUsers, error: rpcError } = await supabase.rpc('get_all_users');
            
            if (!rpcError && authUsers && authUsers.length > 0) {
              console.log('Found users via RPC:', authUsers);
              console.log('Sample user data:', authUsers[0]);
              
              setUsers(authUsers.map((user: any) => {
                // Spróbuj różne sposoby wyciągnięcia nazwy
                const fullName = 
                  user.raw_user_meta_data?.full_name ||
                  user.raw_user_meta_data?.name ||
                  user.raw_user_meta_data?.display_name ||
                  user.email.split('@')[0];
                
                console.log(`User ${user.email}: full_name will be "${fullName}"`);
                
                return {
                  id: user.id,
                  full_name: fullName,
                  email: user.email
                };
              }));
              return;
            }
          } catch (rpcErr) {
            console.log('RPC method not available:', rpcErr);
          }
          
          // Metoda 2: Spróbuj pobrać z auth.users bezpośrednio (może nie zadziałać)
          try {
            const { data: authUsers, error: authError } = await supabase
              .from('auth.users')
              .select('id, email, raw_user_meta_data');
              
            if (!authError && authUsers && authUsers.length > 0) {
              console.log('Found users via auth.users table:', authUsers);
              setUsers(authUsers.map((user: any) => ({
                id: user.id,
                full_name: user.raw_user_meta_data?.full_name,
                email: user.email
              })));
              return;
            }
          } catch (authErr) {
            console.log('Direct auth.users access not available:', authErr);
          }
          
          console.log('No method worked, using only current user');
          // Użyj tylko obecnego użytkownika - nie wymyślamy danych
          const currentUserData = {
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || currentUser.email,
            email: currentUser.email
          };
          
          setUsers([currentUserData]);
          return;
        } else {
          throw new Error('Brak dostępu do danych użytkowników');
        }
      }

      console.log(`Successfully loaded ${profilesData.length} users from profiles table`);
      setUsers(profilesData);
      
    } catch (err) {
      console.error('Błąd podczas ładowania użytkowników:', err);
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
      
      // No fallback - if we can't get users properly, show error
      console.log('Could not load users from any source');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const getUserDisplayName = (user: User): string => {
    return user.full_name || user.email || 'Nieznany użytkownik';
  };

  return {
    users,
    loading,
    error,
    loadUsers,
    getUserDisplayName
  };
};