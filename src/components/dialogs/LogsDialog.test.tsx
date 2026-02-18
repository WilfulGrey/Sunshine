import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LogsDialog } from './LogsDialog';
import { SunshineLog } from '../../services/sunshineService';

const makeMockLog = (overrides: Partial<SunshineLog> = {}): SunshineLog => ({
  id: 1,
  created_at: '2025-02-17T10:30:00Z',
  data: null,
  title: 'Successfully',
  content: 'Rozmowa przebiegła pomyślnie',
  custom_author_name: null,
  logable_type: null,
  logable_id: null,
  job_offer_id: null,
  author: {
    id: 1,
    name: 'Jan Kowalski',
    first_name: 'Jan',
    last_name: 'Kowalski',
  },
  updated_at: '2025-02-17T10:30:00Z',
  ...overrides,
});

describe('LogsDialog', () => {
  const defaultProps = {
    logs: [] as SunshineLog[],
    loading: false,
    onClose: vi.fn(),
    onLoadMore: vi.fn(),
    hasMore: false,
    loadingMore: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with title', () => {
    render(<LogsDialog {...defaultProps} />);

    expect(screen.getByText('Historia notatek')).toBeInTheDocument();
  });

  it('should show loading spinner when loading', () => {
    render(<LogsDialog {...defaultProps} loading={true} />);

    expect(screen.queryByText('Brak notatek')).not.toBeInTheDocument();
  });

  it('should show empty message when no logs', () => {
    render(<LogsDialog {...defaultProps} logs={[]} />);

    expect(screen.getByText('Brak notatek')).toBeInTheDocument();
  });

  it('should render note entries with content', () => {
    const logs = [
      makeMockLog({ id: 1, content: 'Pierwsza notatka', title: 'Successfully' }),
      makeMockLog({ id: 2, content: 'Druga notatka', title: 'Not Successfully' }),
    ];

    render(<LogsDialog {...defaultProps} logs={logs} />);

    expect(screen.getByText('Pierwsza notatka')).toBeInTheDocument();
    expect(screen.getByText('Druga notatka')).toBeInTheDocument();
  });

  it('should not render tags/badges for log entries', () => {
    const logs = [
      makeMockLog({ id: 1, title: 'Successfully' }),
      makeMockLog({ id: 2, title: 'Not Successfully' }),
      makeMockLog({ id: 3, title: 'Note Only' }),
    ];

    render(<LogsDialog {...defaultProps} logs={logs} />);

    expect(screen.queryByText('Udany kontakt')).not.toBeInTheDocument();
    expect(screen.queryByText('Nieudany kontakt')).not.toBeInTheDocument();
    expect(screen.queryByText('Notatka')).not.toBeInTheDocument();
  });

  it('should show author name from author object', () => {
    const logs = [makeMockLog({ custom_author_name: null })];

    render(<LogsDialog {...defaultProps} logs={logs} />);

    expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
  });

  it('should prefer custom_author_name over author object', () => {
    const logs = [makeMockLog({ custom_author_name: 'Custom Author' })];

    render(<LogsDialog {...defaultProps} logs={logs} />);

    expect(screen.getByText('Custom Author')).toBeInTheDocument();
    expect(screen.queryByText('Jan Kowalski')).not.toBeInTheDocument();
  });

  it('should show "Załaduj więcej" button when hasMore is true', () => {
    const logs = [makeMockLog()];

    render(<LogsDialog {...defaultProps} logs={logs} hasMore={true} />);

    expect(screen.getByText('Załaduj więcej')).toBeInTheDocument();
  });

  it('should not show "Załaduj więcej" when hasMore is false', () => {
    const logs = [makeMockLog()];

    render(<LogsDialog {...defaultProps} logs={logs} hasMore={false} />);

    expect(screen.queryByText('Załaduj więcej')).not.toBeInTheDocument();
  });

  it('should call onLoadMore when "Załaduj więcej" is clicked', () => {
    const onLoadMore = vi.fn();
    const logs = [makeMockLog()];

    render(<LogsDialog {...defaultProps} logs={logs} hasMore={true} onLoadMore={onLoadMore} />);

    fireEvent.click(screen.getByText('Załaduj więcej'));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('should show loading state for loadMore button', () => {
    const logs = [makeMockLog()];

    render(<LogsDialog {...defaultProps} logs={logs} hasMore={true} loadingMore={true} />);

    expect(screen.getByText('Ładowanie...')).toBeInTheDocument();
    expect(screen.queryByText('Załaduj więcej')).not.toBeInTheDocument();
  });

  it('should call onClose when Zamknij button is clicked', () => {
    const onClose = vi.fn();

    render(<LogsDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Zamknij'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when X button is clicked', () => {
    const onClose = vi.fn();

    render(<LogsDialog {...defaultProps} onClose={onClose} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // X button
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('Filter toggle', () => {
    it('should default to "Tylko notatki" mode', () => {
      render(<LogsDialog {...defaultProps} />);

      const toggle = screen.getByTestId('logs-filter-toggle');
      const notesButton = toggle.querySelector('button:first-child');
      expect(notesButton).toHaveClass('bg-purple-100');
    });

    it('should filter out non-note entries by default', () => {
      const logs = [
        makeMockLog({ id: 1, title: 'Successfully', content: 'Rozmowa OK' }),
        makeMockLog({ id: 2, title: 'callback_updated', content: 'Callback zmieniony' }),
        makeMockLog({ id: 3, title: 'Note Only', content: 'Zwykła notatka' }),
      ];

      render(<LogsDialog {...defaultProps} logs={logs} />);

      expect(screen.getByText('Rozmowa OK')).toBeInTheDocument();
      expect(screen.getByText('Zwykła notatka')).toBeInTheDocument();
      expect(screen.queryByText('Callback zmieniony')).not.toBeInTheDocument();
    });

    it('should show all entries when "Wszystkie wpisy" is clicked', () => {
      const logs = [
        makeMockLog({ id: 1, title: 'Successfully', content: 'Rozmowa OK' }),
        makeMockLog({ id: 2, title: 'callback_updated', content: 'Callback zmieniony' }),
        makeMockLog({ id: 3, title: 'caregiver_employee_updated', content: 'Rekruter przypisany' }),
      ];

      render(<LogsDialog {...defaultProps} logs={logs} />);

      // Switch to all entries
      fireEvent.click(screen.getByText('Wszystkie wpisy'));

      expect(screen.getByText('Rozmowa OK')).toBeInTheDocument();
      expect(screen.getByText('Callback zmieniony')).toBeInTheDocument();
      expect(screen.getByText('Rekruter przypisany')).toBeInTheDocument();
    });

    it('should switch back to notes only', () => {
      const logs = [
        makeMockLog({ id: 1, title: 'Successfully', content: 'Rozmowa OK' }),
        makeMockLog({ id: 2, title: 'callback_updated', content: 'Callback zmieniony' }),
      ];

      render(<LogsDialog {...defaultProps} logs={logs} />);

      // Switch to all
      fireEvent.click(screen.getByText('Wszystkie wpisy'));
      expect(screen.getByText('Callback zmieniony')).toBeInTheDocument();

      // Switch back to notes only
      fireEvent.click(screen.getByText('Tylko notatki'));
      expect(screen.queryByText('Callback zmieniony')).not.toBeInTheDocument();
      expect(screen.getByText('Rozmowa OK')).toBeInTheDocument();
    });

    it('should include interest entries in "Tylko notatki" filter', () => {
      const logs = [
        makeMockLog({ id: 1, title: 'interest', content: '' }),
        makeMockLog({ id: 2, title: 'callback_updated', content: 'Callback zmieniony' }),
      ];

      render(<LogsDialog {...defaultProps} logs={logs} />);

      // Interest entry visible in notes-only mode (default)
      expect(screen.getByText('Zainteresowanie zleceniem')).toBeInTheDocument();
      // Non-note entry hidden
      expect(screen.queryByText('Callback zmieniony')).not.toBeInTheDocument();
    });
  });

  describe('Interest entries', () => {
    it('should show heart icon and label for interest logs', () => {
      const logs = [
        makeMockLog({ id: 1, title: 'interest', content: '' }),
      ];

      render(<LogsDialog {...defaultProps} logs={logs} />);

      expect(screen.getByText('Zainteresowanie zleceniem')).toBeInTheDocument();
    });

    it('should show job offer link when job_offer_id is present', () => {
      const logs = [
        makeMockLog({ id: 10, title: 'interest', content: '', job_offer_id: 5678 }),
      ];

      render(<LogsDialog {...defaultProps} logs={logs} />);

      const link = screen.getByTestId('job-offer-link-10');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://portal.mamamia.app/caregiver-agency/job-market/5678');
      expect(link).toHaveAttribute('target', '_blank');
      expect(screen.getByText('Zlecenie #5678')).toBeInTheDocument();
    });

    it('should not show job offer link when job_offer_id is null', () => {
      const logs = [
        makeMockLog({ id: 10, title: 'interest', content: '', job_offer_id: null }),
      ];

      render(<LogsDialog {...defaultProps} logs={logs} />);

      expect(screen.getByText('Zainteresowanie zleceniem')).toBeInTheDocument();
      expect(screen.queryByTestId('job-offer-link-10')).not.toBeInTheDocument();
    });
  });
});
