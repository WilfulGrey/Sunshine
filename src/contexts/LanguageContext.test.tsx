import React, { createContext } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { useUsers } from '../hooks/useUsers';

// Mock the hooks
vi.mock('../hooks/useUsers');
vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { 
      id: 'user1', 
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' }
    },
    loading: false
  })
}));
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    }
  }
}));

const mockUseUsers = vi.mocked(useUsers);

// Test component to access language context
const TestComponent = () => {
  const { language, t, updateUserLanguage } = useLanguage();
  
  return (
    <div>
      <span data-testid="current-language">{language}</span>
      <span data-testid="translated-text">{t.take}</span>
      <button 
        onClick={() => updateUserLanguage('pl')}
        data-testid="change-language"
      >
        Change to Polish
      </button>
    </div>
  );
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <LanguageProvider>
      {component}
    </LanguageProvider>
  );
};

describe('LanguageContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should default to Polish language', () => {
    mockUseUsers.mockReturnValue({
      users: [],
      loading: false,
      error: null,
      loadUsers: vi.fn(),
      getUserDisplayName: vi.fn(),
      updateUserLanguage: vi.fn()
    });

    renderWithProviders(<TestComponent />);
    
    expect(screen.getByTestId('current-language')).toHaveTextContent('pl');
    expect(screen.getByTestId('translated-text')).toHaveTextContent('Biorę'); // Polish for "take"
  });

  it('should load user preferred language from profile', async () => {
    mockUseUsers.mockReturnValue({
      users: [{
        id: 'user1',
        full_name: 'Test User',
        email: 'test@example.com',
        preferred_language: 'pl'
      }],
      loading: false,
      error: null,
      loadUsers: vi.fn(),
      getUserDisplayName: vi.fn(),
      updateUserLanguage: vi.fn()
    });

    renderWithProviders(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.getByTestId('current-language')).toHaveTextContent('pl');
      expect(screen.getByTestId('translated-text')).toHaveTextContent('Biorę'); // Polish for "take"
    });
  });

  it('should always use Polish even when user profile has German', () => {
    mockUseUsers.mockReturnValue({
      users: [{
        id: 'user1',
        full_name: 'Test User',
        email: 'test@example.com',
        preferred_language: 'de'
      }],
      loading: false,
      error: null,
      loadUsers: vi.fn(),
      getUserDisplayName: vi.fn(),
      updateUserLanguage: vi.fn()
    });

    renderWithProviders(<TestComponent />);

    expect(screen.getByTestId('current-language')).toHaveTextContent('pl');
    expect(screen.getByTestId('translated-text')).toHaveTextContent('Biorę');
  });

  it('should provide correct translations for Polish', async () => {
    mockUseUsers.mockReturnValue({
      users: [{
        id: 'user1',
        full_name: 'Test User', 
        email: 'test@example.com',
        preferred_language: 'pl'
      }],
      loading: false,
      error: null,
      loadUsers: vi.fn(),
      getUserDisplayName: vi.fn(),
      updateUserLanguage: vi.fn()
    });

    renderWithProviders(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.getByTestId('translated-text')).toHaveTextContent('Biorę');
    });
  });

  it('should handle missing user profile gracefully', () => {
    mockUseUsers.mockReturnValue({
      users: [],
      loading: false,
      error: null,
      loadUsers: vi.fn(),
      getUserDisplayName: vi.fn(),
      updateUserLanguage: vi.fn()
    });

    renderWithProviders(<TestComponent />);
    
    // Should default to Polish
    expect(screen.getByTestId('current-language')).toHaveTextContent('pl');
    expect(screen.getByTestId('translated-text')).toHaveTextContent('Biorę');
  });
});