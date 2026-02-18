import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompletionDialog } from './CompletionDialog';
import { Task } from '../../types/Task';

// Mock the language context
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      completeTask: 'Complete Task'
    }
  })
}));

describe('CompletionDialog', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'pending',
    priority: 'medium',
    type: 'manual',
    createdAt: new Date(),
    history: []
  };

  const defaultProps = {
    task: mockTask,
    completionSummary: '',
    setCompletionSummary: vi.fn(),
    onConfirm: vi.fn(),
    onBack: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with task title', () => {
    render(<CompletionDialog {...defaultProps} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should render completion summary textarea', () => {
    render(<CompletionDialog {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/Opisz wynik rozmowy/);
    expect(textarea).toBeInTheDocument();
  });

  it('should call setCompletionSummary when textarea value changes', () => {
    const setCompletionSummary = vi.fn();
    render(
      <CompletionDialog
        {...defaultProps}
        setCompletionSummary={setCompletionSummary}
      />
    );

    const textarea = screen.getByPlaceholderText(/Opisz wynik rozmowy/);
    fireEvent.change(textarea, { target: { value: 'Test summary' } });

    expect(setCompletionSummary).toHaveBeenCalledWith('Test summary');
  });

  it('should display current completion summary value', () => {
    render(
      <CompletionDialog
        {...defaultProps}
        completionSummary={'Current summary'}
      />
    );

    const textarea = screen.getByDisplayValue('Current summary');
    expect(textarea).toBeInTheDocument();
  });

  it('should call onConfirm when save button is clicked with summary', () => {
    const onConfirm = vi.fn();
    render(<CompletionDialog {...defaultProps} completionSummary="Call went well" onConfirm={onConfirm} />);

    const saveButton = screen.getByText('Zapisz');
    fireEvent.click(saveButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should disable save button when summary is empty', () => {
    render(<CompletionDialog {...defaultProps} completionSummary="" />);

    const saveButton = screen.getByRole('button', { name: /Zapisz/ });
    expect(saveButton).toBeDisabled();
  });

  it('should call onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<CompletionDialog {...defaultProps} onBack={onBack} />);

    const backButton = screen.getByText('Wróć');
    fireEvent.click(backButton);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should show information about save', () => {
    render(<CompletionDialog {...defaultProps} />);

    expect(screen.getByText(/Ten komentarz zostanie zapisany jako notatka w systemie/)).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<CompletionDialog {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '4');

    const saveButton = screen.getByRole('button', { name: /Zapisz/ });
    expect(saveButton).toBeInTheDocument();

    const backButton = screen.getByRole('button', { name: /Wróć/ });
    expect(backButton).toBeInTheDocument();
  });
});
