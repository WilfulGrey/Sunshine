import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskFocusedView } from './TaskFocusedView';
import { Task } from '../types/Task';

// Mock hooks and contexts
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    isLoading: false
  })
}));

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      nextTask: 'Next Task',
      upcomingTasks: 'Upcoming Tasks',
      startNow: 'Start Now',
      postpone: 'Postpone',
      completed: 'Completed',
      matchingContact: 'Matching & Contact',
    }
  })
}));

vi.mock('../contexts/TimezoneContext', () => ({
  useTimezone: () => ({ timezone: 'Europe/Berlin' })
}));

vi.mock('../hooks/useUsers', () => ({
  useUsers: () => ({
    users: [],
    getUserDisplayName: (user: any) => user.name || 'Test User'
  })
}));

vi.mock('../hooks/useAirtable', () => ({
  useAirtable: () => ({
    availableUsers: ['Test User', 'Another User']
  })
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  User: () => <div data-testid="user-icon">User</div>,
  CheckCircle2: () => <div data-testid="check-icon">Check</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>,
  AlertTriangle: () => <div data-testid="alert-icon">Alert</div>,
  ArrowRight: () => <div data-testid="arrow-icon">Arrow</div>,
  ExternalLink: () => <div data-testid="external-icon">External</div>,
  Phone: () => <div data-testid="phone-icon">Phone</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Skull: () => <div data-testid="skull-icon">Skull</div>,
  XCircle: () => <div data-testid="x-circle-icon">XCircle</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>
}));

describe('TaskFocusedView - Wklejka functionality', () => {
  const mockOnUpdateTask = vi.fn();

  const createTaskWithWklejka = (wklejkaUrl?: string, wklejkaDate?: Date, nieudaneWklejki = 0): Task => ({
    id: '1',
    title: 'Test Task - Kontakt telefoniczny',
    type: 'manual',
    priority: 'medium',
    status: 'pending',
    createdAt: new Date('2025-01-01'),
    airtableData: {
      recordId: 'rec123',
      phoneNumber: '+48123456789',
      profileLink: 'https://profile.example.com',
      retellLink: 'https://retell.example.com',
      jobLink: 'https://job.example.com',
      wklejkaUrl,
      wklejkaDate,
      nieudaneWklejki
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Wklejka display and links', () => {
    it('should display wklejka link when URL is available', () => {
      const tasks = [createTaskWithWklejka('https://example.com/wklejka')];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      const wklejkaLink = screen.getByRole('link', { name: /wklejka/i });
      expect(wklejkaLink).toBeInTheDocument();
      expect(wklejkaLink).toHaveAttribute('href', 'https://example.com/wklejka');
      expect(wklejkaLink).toHaveAttribute('target', '_blank');
    });

    it('should not display wklejka link when URL is not available', () => {
      const tasks = [createTaskWithWklejka()];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      const wklejkaLink = screen.queryByRole('link', { name: /wklejka/i });
      expect(wklejkaLink).not.toBeInTheDocument();
    });

    it('should show "Dodaj wklejkę" button when no URL exists', () => {
      const tasks = [createTaskWithWklejka()];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      const addButton = screen.getByRole('button', { name: /dodaj wklejkę/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should show "Edytuj wklejkę" button when URL exists', () => {
      const tasks = [createTaskWithWklejka('https://example.com/wklejka')];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      const editButton = screen.getByRole('button', { name: /edytuj wklejkę/i });
      expect(editButton).toBeInTheDocument();
    });

    it('should show trash button when URL exists', () => {
      const tasks = [createTaskWithWklejka('https://example.com/wklejka')];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      const trashButton = screen.getByRole('button', { name: 'Trash' });
      expect(trashButton).toBeInTheDocument();
      expect(trashButton).toHaveAttribute('title', 'Usuń wklejkę (nieudana)');
    });
  });

  describe('Wklejka age and visual indicators', () => {
    it('should show normal orange styling for fresh wklejka', () => {
      const freshDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const tasks = [createTaskWithWklejka('https://example.com/wklejka', freshDate)];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      const wklejkaLink = screen.getByRole('link', { name: /wklejka/i });
      expect(wklejkaLink).toHaveClass('bg-orange-50', 'text-orange-700');
      expect(wklejkaLink).not.toHaveClass('bg-red-100');
    });

    it('should show red styling and warning for old wklejka (>24h)', () => {
      const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 25); // 25 hours ago
      const tasks = [createTaskWithWklejka('https://example.com/wklejka', oldDate)];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      const wklejkaLink = screen.getByRole('link', { name: /wklejka.*⚠️/i });
      expect(wklejkaLink).toBeInTheDocument();
      expect(wklejkaLink).toHaveClass('bg-red-100', 'text-red-700', 'ring-2', 'ring-red-400');
      expect(wklejkaLink).toHaveAttribute('title', 'Wklejka starsza niż 24h - sprawdź czy przeszła');
    });
  });

  describe('Failed wklejka counter', () => {
    it('should not display counter when no failed attempts', () => {
      const tasks = [createTaskWithWklejka('https://example.com/wklejka', new Date(), 0)];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      const counter = screen.queryByText(/nieudanych wklejek/i);
      expect(counter).not.toBeInTheDocument();
    });

    it('should display counter when there are failed attempts', () => {
      const tasks = [createTaskWithWklejka('https://example.com/wklejka', new Date(), 3)];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      const counter = screen.getByText(/nieudanych wklejek: 3/i);
      expect(counter).toBeInTheDocument();
    });
  });

  describe('Wklejka editing functionality', () => {
    it('should open edit mode when clicking add/edit button', async () => {
      const user = userEvent.setup();
      const tasks = [createTaskWithWklejka()];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      const addButton = screen.getByRole('button', { name: /dodaj wklejkę/i });
      await user.click(addButton);
      
      const urlInput = screen.getByRole('textbox');
      expect(urlInput).toBeInTheDocument();
      expect(urlInput).toHaveAttribute('type', 'url');
      expect(urlInput).toHaveAttribute('placeholder', 'https://...');
    });

    it('should save wklejka when clicking save button', async () => {
      const user = userEvent.setup();
      const tasks = [createTaskWithWklejka()];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      // Open edit mode
      const addButton = screen.getByRole('button', { name: /dodaj wklejkę/i });
      await user.click(addButton);
      
      // Enter URL
      const urlInput = screen.getByRole('textbox');
      await user.type(urlInput, 'https://new.example.com/wklejka');
      
      // Save
      const saveButton = screen.getByRole('button', { name: '✓' });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnUpdateTask).toHaveBeenCalledWith('1', {
          airtableUpdates: {
            'Wklejka': 'https://new.example.com/wklejka',
            'Data wklejki': expect.any(String)
          },
          airtableData: {
            recordId: 'rec123',
            phoneNumber: '+48123456789',
            profileLink: 'https://profile.example.com',
            retellLink: 'https://retell.example.com',
            jobLink: 'https://job.example.com',
            wklejkaUrl: 'https://new.example.com/wklejka',
            wklejkaDate: expect.any(Date),
            nieudaneWklejki: 0
          }
        });
      });
    });

    it('should save wklejka when pressing Enter', async () => {
      const user = userEvent.setup();
      const tasks = [createTaskWithWklejka()];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      // Open edit mode
      const addButton = screen.getByRole('button', { name: /dodaj wklejkę/i });
      await user.click(addButton);
      
      // Enter URL and press Enter
      const urlInput = screen.getByRole('textbox');
      await user.type(urlInput, 'https://enter.example.com/wklejka');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockOnUpdateTask).toHaveBeenCalled();
      });
    });

    it('should cancel editing when clicking cancel button', async () => {
      const user = userEvent.setup();
      const tasks = [createTaskWithWklejka()];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      // Open edit mode
      const addButton = screen.getByRole('button', { name: /dodaj wklejkę/i });
      await user.click(addButton);
      
      // Enter URL
      const urlInput = screen.getByRole('textbox');
      await user.type(urlInput, 'https://cancel.example.com/wklejka');
      
      // Cancel
      const cancelButton = screen.getByRole('button', { name: '✕' });
      await user.click(cancelButton);
      
      // Should not save
      expect(mockOnUpdateTask).not.toHaveBeenCalled();
      
      // Should return to normal view
      const addButtonAgain = screen.getByRole('button', { name: /dodaj wklejkę/i });
      expect(addButtonAgain).toBeInTheDocument();
    });

    it('should cancel editing when pressing Escape', async () => {
      const user = userEvent.setup();
      const tasks = [createTaskWithWklejka()];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      // Open edit mode
      const addButton = screen.getByRole('button', { name: /dodaj wklejkę/i });
      await user.click(addButton);
      
      // Press Escape
      const urlInput = screen.getByRole('textbox');
      await user.keyboard('{Escape}');
      
      // Should return to normal view
      const addButtonAgain = screen.getByRole('button', { name: /dodaj wklejkę/i });
      expect(addButtonAgain).toBeInTheDocument();
    });
  });

  describe('Wklejka removal functionality', () => {
    it('should remove wklejka and increment counter when clicking trash button', async () => {
      const user = userEvent.setup();
      const tasks = [createTaskWithWklejka('https://example.com/wklejka', new Date(), 2)];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      const trashButton = screen.getByRole('button', { name: 'Trash' });
      await user.click(trashButton);
      
      await waitFor(() => {
        expect(mockOnUpdateTask).toHaveBeenCalledWith('1', {
          airtableUpdates: {
            'Wklejka': '',
            'Ile nieudanych wklejek': 3
          },
          airtableData: {
            recordId: 'rec123',
            phoneNumber: '+48123456789',
            profileLink: 'https://profile.example.com',
            retellLink: 'https://retell.example.com',
            jobLink: 'https://job.example.com',
            wklejkaUrl: undefined,
            wklejkaDate: expect.any(Date), // Data zostaje bez zmian
            nieudaneWklejki: 3
          }
        });
      });
    });

    it('should show proper tooltip for trash button', () => {
      const tasks = [createTaskWithWklejka('https://example.com/wklejka')];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      const trashButton = screen.getByRole('button', { name: 'Trash' });
      expect(trashButton).toHaveAttribute('title', 'Usuń wklejkę (nieudana)');
    });
  });

  describe('Integration with existing functionality', () => {
    it('should display wklejka alongside other external links', () => {
      const tasks = [createTaskWithWklejka('https://example.com/wklejka')];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      // Should show all external links
      expect(screen.getByRole('link', { name: /profil w portalu mm/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /dashboard retell/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /link do joba/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /wklejka/i })).toBeInTheDocument();
    });

    it('should work correctly when task has no airtableData', () => {
      const tasks: Task[] = [{
        id: '1',
        title: 'Regular Task',
        type: 'manual',
        priority: 'medium',
        status: 'pending',
        createdAt: new Date('2025-01-01')
      }];
      
      render(<TaskFocusedView tasks={tasks} onUpdateTask={mockOnUpdateTask} />);
      
      // Should not show wklejka section
      const addButton = screen.queryByRole('button', { name: /dodaj wklejkę/i });
      expect(addButton).not.toBeInTheDocument();
    });
  });
});