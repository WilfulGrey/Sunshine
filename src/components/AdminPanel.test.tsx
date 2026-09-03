import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminPanel } from './AdminPanel';

// Zachowania pod testem: gate hasła (nic nie widać bez hasła), 401 = komunikat
// o złym haśle, poprawne hasło = tabela użytkowników z danymi z list_users.

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const usersPayload = {
  users: [
    { name: 'Jan Testowy', email: 'jan@vitanas.pl', employeeId: 100, role: 'Rekruter', team: 'Orły', active: true, hasAccount: true },
    { name: 'Bez Konta', email: 'bez.konta@vitanas.pl', employeeId: 200, role: 'Rekruter', team: 'Sowy', active: true, hasAccount: false },
  ],
};

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bez autoryzacji pokazuje tylko formularz hasła, bez danych', () => {
    render(<AdminPanel />);
    expect(screen.getByTestId('admin-password-input')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-users-table')).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('złe hasło → 401 → komunikat, dalej brak tabeli', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Nieprawidłowe hasło administratora' }),
    });
    const user = userEvent.setup();
    render(<AdminPanel />);

    await user.type(screen.getByTestId('admin-password-input'), 'zle-haslo');
    await user.click(screen.getByTestId('admin-login-button'));

    await waitFor(() => {
      expect(screen.getByTestId('admin-error')).toHaveTextContent('Nieprawidłowe hasło administratora');
    });
    expect(screen.queryByTestId('admin-users-table')).not.toBeInTheDocument();
  });

  it('dobre hasło → tabela z użytkownikami i flagą konta', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => usersPayload,
    });
    const user = userEvent.setup();
    render(<AdminPanel />);

    await user.type(screen.getByTestId('admin-password-input'), 'dobre-haslo');
    await user.click(screen.getByTestId('admin-login-button'));

    await waitFor(() => {
      expect(screen.getByTestId('admin-users-table')).toBeInTheDocument();
    });
    expect(screen.getByText('Jan Testowy')).toBeInTheDocument();
    expect(screen.getByText('Bez Konta')).toBeInTheDocument();
    expect(screen.getByText('Utwórz konto')).toBeInTheDocument(); // wiersz bez konta ma akcję
    expect(screen.getByText('Reset hasła')).toBeInTheDocument(); // wiersz z kontem ma reset

    // hasło poszło w nagłówku do Edge Function
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/admin-users'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-admin-password': 'dobre-haslo' }),
      })
    );
  });
});
