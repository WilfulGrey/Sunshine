import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResetPasswordForm } from './ResetPasswordForm'
import { useAuth } from '../../contexts/AuthContext'

// Mock useAuth hook
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// Mock window.location
const mockLocation = {
  search: '',
  href: '',
  origin: 'http://localhost:3000',
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

describe('ResetPasswordForm', () => {
  const mockUpdatePassword = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useAuth return value
    ;(useAuth as any).mockReturnValue({
      updatePassword: mockUpdatePassword,
    })
    
    // Reset location mock
    mockLocation.search = ''
  })

  it('shows error when no access token in URL', () => {
    render(<ResetPasswordForm />)

    expect(screen.getByText(/Nieprawidłowy lub wygasły link/)).toBeInTheDocument()
    expect(screen.getByText('Powrót do logowania')).toBeInTheDocument()
  })

  it('shows form when access token is present', () => {
    mockLocation.search = '?access_token=valid-token'
    
    render(<ResetPasswordForm />)

    expect(screen.getByLabelText('Nowe hasło')).toBeInTheDocument()
    expect(screen.getByLabelText('Potwierdź nowe hasło')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zmień hasło' })).toBeInTheDocument()
  })

  it('shows validation error when passwords do not match', async () => {
    mockLocation.search = '?access_token=valid-token'
    
    render(<ResetPasswordForm />)

    fireEvent.change(screen.getByLabelText('Nowe hasło'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('Potwierdź nowe hasło'), {
      target: { value: 'different123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }))

    await waitFor(() => {
      expect(screen.getByText('Hasła nie są identyczne')).toBeInTheDocument()
    })
    
    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })

  it('shows validation error for short password', async () => {
    mockLocation.search = '?access_token=valid-token'
    
    render(<ResetPasswordForm />)

    fireEvent.change(screen.getByLabelText('Nowe hasło'), {
      target: { value: '123' },
    })
    fireEvent.change(screen.getByLabelText('Potwierdź nowe hasło'), {
      target: { value: '123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }))

    await waitFor(() => {
      expect(screen.getByText('Hasło musi mieć co najmniej 6 znaków')).toBeInTheDocument()
    })
    
    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })

  it('successfully updates password', async () => {
    mockLocation.search = '?access_token=valid-token'
    mockUpdatePassword.mockResolvedValue({ error: null })
    
    render(<ResetPasswordForm />)

    fireEvent.change(screen.getByLabelText('Nowe hasło'), {
      target: { value: 'newpassword123' },
    })
    fireEvent.change(screen.getByLabelText('Potwierdź nowe hasło'), {
      target: { value: 'newpassword123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }))

    await waitFor(() => {
      expect(screen.getByText(/Hasło zostało zmienione pomyślnie/)).toBeInTheDocument()
    })
    
    expect(mockUpdatePassword).toHaveBeenCalledWith('newpassword123')
  })

  it('shows error from updatePassword', async () => {
    mockLocation.search = '?access_token=valid-token'
    const errorMessage = 'Session expired'
    mockUpdatePassword.mockResolvedValue({ error: { message: errorMessage } })
    
    render(<ResetPasswordForm />)

    fireEvent.change(screen.getByLabelText('Nowe hasło'), {
      target: { value: 'newpassword123' },
    })
    fireEvent.change(screen.getByLabelText('Potwierdź nowe hasło'), {
      target: { value: 'newpassword123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }))

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
    
    expect(mockUpdatePassword).toHaveBeenCalledWith('newpassword123')
  })

  it('toggles password visibility', () => {
    mockLocation.search = '?access_token=valid-token'
    
    render(<ResetPasswordForm />)

    const passwordInput = screen.getByLabelText('Nowe hasło')
    const toggleButtons = screen.getAllByRole('button', { name: '' })
    const toggleButton = toggleButtons.find(btn => btn.querySelector('svg'))

    expect(passwordInput).toHaveAttribute('type', 'password')
    
    if (toggleButton) {
      fireEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')
      
      fireEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    }
  })

  it('shows loading state during password update', async () => {
    mockLocation.search = '?access_token=valid-token'
    mockUpdatePassword.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)))
    
    render(<ResetPasswordForm />)

    fireEvent.change(screen.getByLabelText('Nowe hasło'), {
      target: { value: 'newpassword123' },
    })
    fireEvent.change(screen.getByLabelText('Potwierdź nowe hasło'), {
      target: { value: 'newpassword123' },
    })
    
    const submitButton = screen.getByRole('button', { name: 'Zmień hasło' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Aktualizowanie...')).toBeInTheDocument()
    })
    expect(submitButton).toBeDisabled()

    await waitFor(() => {
      expect(screen.getByText(/Hasło zostało zmienione pomyślnie/)).toBeInTheDocument()
    })
  })
})