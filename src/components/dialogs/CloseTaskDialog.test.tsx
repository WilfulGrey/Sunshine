import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CloseTaskDialog } from './CloseTaskDialog';
import { Task } from '../../types/Task';

describe('CloseTaskDialog', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Anna Kowalska - Kontakt telefoniczny',
    status: 'in_progress',
    priority: 'medium',
    type: 'manual',
    createdAt: new Date(),
    history: [],
  };

  const defaultProps = {
    task: mockTask,
    onConfirm: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with title and task name', () => {
    render(<CloseTaskDialog {...defaultProps} />);

    // Header title
    const headings = screen.getAllByText('Zamknij zadanie');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(mockTask.title)).toBeInTheDocument();
  });

  it('should render three reason options', () => {
    render(<CloseTaskDialog {...defaultProps} />);

    expect(screen.getByText('Zrobiono wklejkę')).toBeInTheDocument();
    expect(screen.getByText('Ustawiono alert')).toBeInTheDocument();
    expect(screen.getByText('Dostępna później')).toBeInTheDocument();
  });

  it('should render notes textarea', () => {
    render(<CloseTaskDialog {...defaultProps} />);

    expect(screen.getByPlaceholderText('Dodatkowe informacje...')).toBeInTheDocument();
  });

  it('should disable confirm button when no reason selected', () => {
    render(<CloseTaskDialog {...defaultProps} />);

    const confirmButton = screen.getByTestId('close-task-confirm');
    expect(confirmButton).toBeDisabled();
  });

  it('should enable confirm button after selecting a reason', () => {
    render(<CloseTaskDialog {...defaultProps} />);

    fireEvent.click(screen.getByTestId('reason-wklejka'));

    const confirmButton = screen.getByTestId('close-task-confirm');
    expect(confirmButton).not.toBeDisabled();
  });

  it('should highlight selected reason', () => {
    render(<CloseTaskDialog {...defaultProps} />);

    const button = screen.getByTestId('reason-alert');
    fireEvent.click(button);

    expect(button).toHaveClass('border-purple-500');
  });

  it('should call onConfirm with reason and notes', () => {
    const onConfirm = vi.fn();
    render(<CloseTaskDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByTestId('reason-wklejka'));
    fireEvent.change(screen.getByPlaceholderText('Dodatkowe informacje...'), {
      target: { value: 'Wklejka do rodziny Müller' },
    });
    fireEvent.click(screen.getByTestId('close-task-confirm'));

    expect(onConfirm).toHaveBeenCalledWith('Zrobiono wklejkę', 'Wklejka do rodziny Müller');
  });

  it('should call onConfirm with empty notes when none provided', () => {
    const onConfirm = vi.fn();
    render(<CloseTaskDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByTestId('reason-later'));
    fireEvent.click(screen.getByTestId('close-task-confirm'));

    expect(onConfirm).toHaveBeenCalledWith('Dostępna później', '');
  });

  it('should call onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<CloseTaskDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Anuluj'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when X button is clicked', () => {
    const onClose = vi.fn();
    render(<CloseTaskDialog {...defaultProps} onClose={onClose} />);

    const buttons = screen.getAllByRole('button');
    // X button is the first one (in header)
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
