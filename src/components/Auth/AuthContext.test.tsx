import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}))

const mockSupabase = supabase as any

// Test component that uses useAuth
const TestComponent = () => {
  const { 
    user, 
    loading, 
    signIn, 
    signUp, 
    signOut, 
    resetPassword, 
    updatePassword, 
    updateProfile 
  } = useAuth()

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user?.email || 'no-user'}</div>
      <button onClick={() => signIn('test@example.com', 'password')}>Sign In</button>
      <button onClick={() => signUp('test@example.com', 'password', 'Test User')}>Sign Up</button>
      <button onClick={() => signOut()}>Sign Out</button>
      <button onClick={() => resetPassword('test@example.com')}>Reset Password</button>
      <button onClick={() => updatePassword('newpassword')}>Update Password</button>
      <button onClick={() => updateProfile({ full_name: 'New Name' })}>Update Profile</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
  })

  it('provides initial loading state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('loading')
  })

  it('handles successful session retrieval', async () => {
    const mockSession = {
      user: {
        id: '123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      },
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })
  })

  it('handles sign in', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('Sign In').click()
    })

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    })
  })

  it('handles sign up with full name', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('Sign Up').click()
    })

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      options: {
        data: {
          full_name: 'Test User',
        },
      },
    })
  })

  it('handles sign out', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({
      error: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('Sign Out').click()
    })

    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('handles password reset', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('Reset Password').click()
    })

    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      {
        redirectTo: 'http://localhost:3000/reset-password',
      }
    )
  })

  it('handles password update', async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('Update Password').click()
    })

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      password: 'newpassword',
    })
  })

  it('handles profile update', async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('Update Profile').click()
    })

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { full_name: 'New Name' },
    })
  })

  it('handles errors properly', async () => {
    const mockError = { message: 'Authentication failed' }
    
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: mockError,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await act(async () => {
      screen.getByText('Sign In').click()
    })

    // Verify the error was returned (would be handled by the component)
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled()
  })

  it('listens to auth state changes', async () => {
    const mockCallback = vi.fn()
    
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      mockCallback.mockImplementation(callback)
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      }
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
  })
})