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
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with task title', () => {
    render(<CompletionDialog {...defaultProps} />);
    
    expect(screen.getByText('Complete Task')).toBeInTheDocument();
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

  it('should call onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<CompletionDialog {...defaultProps} onConfirm={onConfirm} />);
    
    const confirmButton = screen.getByText('Zakończ zadanie');
    fireEvent.click(confirmButton);
    
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<CompletionDialog {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Anuluj');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should show status change information', () => {
    render(<CompletionDialog {...defaultProps} />);
    
    expect(screen.getByText(/Status zostanie zmieniony na "kontakt udany"/)).toBeInTheDocument();
  });

  it('should show information about Airtable save', () => {
    render(<CompletionDialog {...defaultProps} />);
    
    expect(screen.getByText(/Ten komentarz zostanie zapisany w polu "Następne kroki" w Airtable/)).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<CompletionDialog {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '4');
    
    const confirmButton = screen.getByRole('button', { name: /Zakończ zadanie/ });
    expect(confirmButton).toBeInTheDocument();
    
    const cancelButton = screen.getByRole('button', { name: /Anuluj/ });
    expect(cancelButton).toBeInTheDocument();
  });
});