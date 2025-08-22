import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransferDialog } from './TransferDialog';
import { Task } from '../../types/Task';

// Mock useUsers hook
vi.mock('../../hooks/useUsers', () => ({
  useUsers: () => ({
    users: [
      { id: '1', full_name: 'Supabase User 1', email: 'user1@test.com' },
      { id: '2', full_name: 'Supabase User 2', email: 'user2@test.com' }
    ],
    getUserDisplayName: (user: any) => user.full_name
  })
}));

describe('TransferDialog', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test description',
    status: 'pending',
    priority: 'medium',
    type: 'contact',
    dueDate: new Date(),
    assignedTo: 'Current User',
    history: []
  };

  const defaultProps = {
    task: mockTask,
    transferToUser: '',
    setTransferToUser: vi.fn(),
    transferReason: '',
    setTransferReason: vi.fn(),
    currentUserName: 'Current User',
    onConfirm: vi.fn(),
    onUnassign: vi.fn(),
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User selection source', () => {
    it('should use availableUsers from Airtable when provided', () => {
      const airtableUsers = [
        'Michał Kępiński',
        'Dominika Grabowska',
        'Małgorzata Łuksin',
        'Alex Nowek',
        'Administator Mamamia'
      ];

      render(
        <TransferDialog
          {...defaultProps}
          availableUsers={airtableUsers}
        />
      );

      // Check if Airtable users are shown (excluding current user)
      const dropdown = screen.getByRole('combobox');
      fireEvent.click(dropdown);

      // Should show Airtable users, not Supabase users
      expect(screen.getByText('Michał Kępiński')).toBeInTheDocument();
      expect(screen.getByText('Dominika Grabowska')).toBeInTheDocument();
      expect(screen.getByText('Małgorzata Łuksin')).toBeInTheDocument();
      expect(screen.getByText('Alex Nowek')).toBeInTheDocument();
      expect(screen.getByText('Administator Mamamia')).toBeInTheDocument();

      // Should NOT show Supabase users
      expect(screen.queryByText('Supabase User 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Supabase User 2')).not.toBeInTheDocument();
    });

    it('should fallback to Supabase users when availableUsers not provided', () => {
      render(
        <TransferDialog
          {...defaultProps}
          // No availableUsers prop
        />
      );

      const dropdown = screen.getByRole('combobox');
      fireEvent.click(dropdown);

      // Should show Supabase users
      expect(screen.getByText('Supabase User 1')).toBeInTheDocument();
      expect(screen.getByText('Supabase User 2')).toBeInTheDocument();
    });

    it('should exclude current user from available options', () => {
      const airtableUsers = [
        'Current User',
        'Michał Kępiński',
        'Dominika Grabowska'
      ];

      render(
        <TransferDialog
          {...defaultProps}
          availableUsers={airtableUsers}
        />
      );

      const dropdown = screen.getByRole('combobox');
      fireEvent.click(dropdown);

      // Current user should be excluded
      expect(screen.queryByText('Current User')).not.toBeInTheDocument();
      
      // Other users should be shown
      expect(screen.getByText('Michał Kępiński')).toBeInTheDocument();
      expect(screen.getByText('Dominika Grabowska')).toBeInTheDocument();
    });
  });

  describe('Transfer functionality', () => {
    it('should call setTransferToUser when user is selected', () => {
      const setTransferToUser = vi.fn();
      const airtableUsers = ['Michał Kępiński', 'Dominika Grabowska'];

      render(
        <TransferDialog
          {...defaultProps}
          setTransferToUser={setTransferToUser}
          availableUsers={airtableUsers}
        />
      );

      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'Michał Kępiński' } });

      expect(setTransferToUser).toHaveBeenCalledWith('Michał Kępiński');
    });

    it('should enable transfer button when user is selected', () => {
      render(
        <TransferDialog
          {...defaultProps}
          transferToUser="Michał Kępiński"
          availableUsers={['Michał Kępiński', 'Dominika Grabowska']}
        />
      );

      const transferButton = screen.getByRole('button', { name: /przekaż zadanie/i });
      expect(transferButton).not.toBeDisabled();
    });

    it('should disable transfer button when no user is selected', () => {
      render(
        <TransferDialog
          {...defaultProps}
          transferToUser=""
          availableUsers={['Michał Kępiński', 'Dominika Grabowska']}
        />
      );

      const transferButton = screen.getByRole('button', { name: /przekaż zadanie/i });
      expect(transferButton).toBeDisabled();
    });

    it('should call onConfirm when transfer button is clicked', () => {
      const onConfirm = vi.fn();

      render(
        <TransferDialog
          {...defaultProps}
          onConfirm={onConfirm}
          transferToUser="Michał Kępiński"
          availableUsers={['Michał Kępiński']}
        />
      );

      const transferButton = screen.getByText('Przekaż zadanie');
      fireEvent.click(transferButton);

      expect(onConfirm).toHaveBeenCalled();
    });

    it('should call onUnassign when unassign button is clicked', () => {
      const onUnassign = vi.fn();

      render(
        <TransferDialog
          {...defaultProps}
          onUnassign={onUnassign}
          availableUsers={['Michał Kępiński']}
        />
      );

      const unassignButton = screen.getByText('Odpiąć się');
      fireEvent.click(unassignButton);

      expect(onUnassign).toHaveBeenCalled();
    });

    it('should call onClose when cancel button is clicked', () => {
      const onClose = vi.fn();

      render(
        <TransferDialog
          {...defaultProps}
          onClose={onClose}
          availableUsers={['Michał Kępiński']}
        />
      );

      const cancelButton = screen.getByText('Anuluj');
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('UI behavior', () => {
    it('should show transfer preview when user is selected', () => {
      render(
        <TransferDialog
          {...defaultProps}
          transferToUser="Michał Kępiński"
          availableUsers={['Michał Kępiński']}
        />
      );

      expect(screen.getByText(/Zadanie zostanie przekazane do:/)).toBeInTheDocument();
      // Use more specific selector to avoid multiple matches
      expect(screen.getByRole('combobox')).toHaveValue('Michał Kępiński');
    });

    it('should not show transfer preview when no user is selected', () => {
      render(
        <TransferDialog
          {...defaultProps}
          transferToUser=""
          availableUsers={['Michał Kępiński']}
        />
      );

      expect(screen.queryByText(/Zadanie zostanie przekazane do:/)).not.toBeInTheDocument();
    });

    it('should display task title', () => {
      render(
        <TransferDialog
          {...defaultProps}
          availableUsers={['Michał Kępiński']}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('should allow entering transfer reason', () => {
      const setTransferReason = vi.fn();

      render(
        <TransferDialog
          {...defaultProps}
          setTransferReason={setTransferReason}
          availableUsers={['Michał Kępiński']}
        />
      );

      const reasonTextarea = screen.getByPlaceholderText('Opisz dlaczego przekazujesz to zadanie...');
      fireEvent.change(reasonTextarea, { target: { value: 'Need expertise' } });

      expect(setTransferReason).toHaveBeenCalledWith('Need expertise');
    });
  });

  describe('Error cases', () => {
    it('should handle empty availableUsers array', () => {
      render(
        <TransferDialog
          {...defaultProps}
          availableUsers={[]}
        />
      );

      const dropdown = screen.getByRole('combobox');
      const options = dropdown.querySelectorAll('option');
      
      // Should only have the placeholder option
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Wybierz użytkownika...');
    });

    it('should handle undefined availableUsers and fallback to Supabase', () => {
      render(
        <TransferDialog
          {...defaultProps}
          availableUsers={undefined}
        />
      );

      const dropdown = screen.getByRole('combobox');
      fireEvent.click(dropdown);

      // Should show Supabase users as fallback
      expect(screen.getByText('Supabase User 1')).toBeInTheDocument();
      expect(screen.getByText('Supabase User 2')).toBeInTheDocument();
    });
  });
});