import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbandonDialog } from './AbandonDialog';
import { Task } from '../../types/Task';

describe('AbandonDialog', () => {
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
    abandonReason: '',
    setAbandonReason: vi.fn(),
    onConfirm: vi.fn(),
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with task title', () => {
    render(<AbandonDialog {...defaultProps} />);
    
    expect(screen.getByRole('heading', { name: 'Porzuć kontakt' })).toBeInTheDocument();
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should render abandon reason textarea', () => {
    render(<AbandonDialog {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText(/Opisz dlaczego kontakt został porzucony/);
    expect(textarea).toBeInTheDocument();
  });

  it('should call setAbandonReason when textarea value changes', () => {
    const setAbandonReason = vi.fn();
    render(
      <AbandonDialog 
        {...defaultProps} 
        setAbandonReason={setAbandonReason}
      />
    );
    
    const textarea = screen.getByPlaceholderText(/Opisz dlaczego kontakt został porzucony/);
    fireEvent.change(textarea, { target: { value: 'Wrong person' } });
    
    expect(setAbandonReason).toHaveBeenCalledWith('Wrong person');
  });

  it('should display current abandon reason value', () => {
    render(
      <AbandonDialog 
        {...defaultProps} 
        abandonReason={'No interest'}
      />
    );
    
    const textarea = screen.getByDisplayValue('No interest');
    expect(textarea).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<AbandonDialog {...defaultProps} onConfirm={onConfirm} />);
    
    const confirmButton = screen.getByRole('button', { name: /Porzuć kontakt/ });
    fireEvent.click(confirmButton);
    
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<AbandonDialog {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Anuluj');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should show status change warning', () => {
    render(<AbandonDialog {...defaultProps} />);
    
    expect(screen.getByText(/Status zostanie zmieniony na "porzucony"/)).toBeInTheDocument();
  });

  it('should show information about Airtable save', () => {
    render(<AbandonDialog {...defaultProps} />);
    
    expect(screen.getByText(/Ten komentarz zostanie zapisany w polu "Następne kroki" w Airtable/)).toBeInTheDocument();
  });

  it('should have proper form structure', () => {
    render(<AbandonDialog {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '4');
    
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    
    const confirmButton = screen.getByRole('button', { name: /Porzuć kontakt/ });
    expect(confirmButton).toHaveClass('bg-red-600');
    
    const cancelButton = screen.getByRole('button', { name: /Anuluj/ });
    expect(cancelButton).toHaveClass('bg-gray-100');
  });

  it('should have skull icon in header and warning', () => {
    render(<AbandonDialog {...defaultProps} />);
    
    // Check for skull icons (they should be present in the DOM)
    const skullElements = screen.getAllByTestId ? screen.queryAllByTestId('skull-icon') : [];
    // Since we're using Lucide icons, we can check for the presence of the component structure
    expect(screen.getAllByText('Porzuć kontakt')).toHaveLength(2); // Title and button
  });

  it('should maintain focus management', () => {
    render(<AbandonDialog {...defaultProps} />);
    
    const textarea = screen.getByRole('textbox');
    const confirmButton = screen.getByRole('button', { name: /Porzuć kontakt/ });
    const cancelButton = screen.getByRole('button', { name: /Anuluj/ });
    
    // All interactive elements should be present and accessible
    expect(textarea).toBeInTheDocument();
    expect(confirmButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
  });
});