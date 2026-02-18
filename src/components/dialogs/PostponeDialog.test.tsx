import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostponeDialog } from './PostponeDialog';

// Mock the language context
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      setPostpone: 'Set Postpone',
      quickSelection: 'Quick Selection',
      in1Hour: 'In 1 Hour',
      in2Hours: 'In 2 Hours',
      tomorrow9: 'Tomorrow 9 AM',
      tomorrow14: 'Tomorrow 2 PM',
      nextWeek: 'Next Week',
      in1Week: 'In 1 Week',
      orSelectCustomTime: 'Or Select Custom Time',
      cancel: 'Cancel',
      confirm: 'Confirm'
    }
  })
}));

describe('PostponeDialog', () => {
  const defaultProps = {
    postponeDate: '2024-01-15',
    setPostponeDate: vi.fn(),
    postponeTime: '14:30',
    setPostponeTime: vi.fn(),
    postponeNotes: '',
    setPostponeNotes: vi.fn(),
    onConfirm: vi.fn(),
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with title', () => {
    render(<PostponeDialog {...defaultProps} />);
    
    expect(screen.getByText('Set Postpone')).toBeInTheDocument();
  });

  it('should render notes textarea', () => {
    render(<PostponeDialog {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText(/Opisz powód przełożenia/);
    expect(textarea).toBeInTheDocument();
  });

  it('should call setPostponeNotes when notes change', () => {
    const setPostponeNotes = vi.fn();
    render(
      <PostponeDialog 
        {...defaultProps} 
        setPostponeNotes={setPostponeNotes}
      />
    );
    
    const textarea = screen.getByPlaceholderText(/Opisz powód przełożenia/);
    fireEvent.change(textarea, { target: { value: 'Need more time' } });
    
    expect(setPostponeNotes).toHaveBeenCalledWith('Need more time');
  });

  it('should render quick selection buttons', () => {
    render(<PostponeDialog {...defaultProps} />);
    
    expect(screen.getByText('In 1 Hour')).toBeInTheDocument();
    expect(screen.getByText('In 2 Hours')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow 9 AM')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow 2 PM')).toBeInTheDocument();
    expect(screen.getByText('Next Week')).toBeInTheDocument();
    expect(screen.getByText('In 1 Week')).toBeInTheDocument();
  });

  it('should call setPostponeDate and setPostponeTime when quick selection button is clicked', () => {
    const setPostponeDate = vi.fn();
    const setPostponeTime = vi.fn();
    
    render(
      <PostponeDialog 
        {...defaultProps} 
        setPostponeDate={setPostponeDate}
        setPostponeTime={setPostponeTime}
      />
    );
    
    const oneHourButton = screen.getByText('In 1 Hour');
    fireEvent.click(oneHourButton);
    
    expect(setPostponeDate).toHaveBeenCalled();
    expect(setPostponeTime).toHaveBeenCalled();
  });

  it('should render date and time inputs', () => {
    render(<PostponeDialog {...defaultProps} />);
    
    const dateInput = screen.getByDisplayValue('2024-01-15');
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toHaveAttribute('type', 'date');
  });

  it('should render time selectors', () => {
    render(<PostponeDialog {...defaultProps} />);
    
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2); // hours and minutes
    
    // Check if current time values are selected
    expect(screen.getByDisplayValue('14')).toBeInTheDocument(); // hours
    expect(screen.getByDisplayValue('30')).toBeInTheDocument(); // minutes
  });

  it('should call setPostponeDate when date input changes', () => {
    const setPostponeDate = vi.fn();
    render(
      <PostponeDialog 
        {...defaultProps} 
        setPostponeDate={setPostponeDate}
      />
    );
    
    const dateInput = screen.getByDisplayValue('2024-01-15');
    fireEvent.change(dateInput, { target: { value: '2024-01-16' } });
    
    expect(setPostponeDate).toHaveBeenCalledWith('2024-01-16');
  });

  it('should call setPostponeTime when time selectors change', () => {
    const setPostponeTime = vi.fn();
    render(
      <PostponeDialog 
        {...defaultProps} 
        setPostponeTime={setPostponeTime}
      />
    );
    
    const hourSelect = screen.getByDisplayValue('14');
    fireEvent.change(hourSelect, { target: { value: '15' } });
    
    expect(setPostponeTime).toHaveBeenCalledWith('15:30');
  });

  it('should call onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<PostponeDialog {...defaultProps} onConfirm={onConfirm} />);
    
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<PostponeDialog {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should disable confirm button when date or time is missing', () => {
    render(
      <PostponeDialog 
        {...defaultProps} 
        postponeDate=""
        postponeTime=""
      />
    );
    
    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toBeDisabled();
  });

  it('should enable confirm button when both date and time are provided', () => {
    render(<PostponeDialog {...defaultProps} />);
    
    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).not.toBeDisabled();
  });

  it('should show save information note', () => {
    render(<PostponeDialog {...defaultProps} />);

    expect(screen.getByText(/Ta notatka zostanie zapisana jako notatka w systemie/)).toBeInTheDocument();
  });

  it('should display current notes value', () => {
    render(
      <PostponeDialog 
        {...defaultProps} 
        postponeNotes={'Current notes'}
      />
    );
    
    const textarea = screen.getByDisplayValue('Current notes');
    expect(textarea).toBeInTheDocument();
  });

  it('should highlight selected quick option button', () => {
    render(
      <PostponeDialog
        {...defaultProps}
        setPostponeDate={vi.fn()}
        setPostponeTime={vi.fn()}
      />
    );

    const tomorrowBtn = screen.getByText('Tomorrow 2 PM');
    expect(tomorrowBtn.className).toContain('bg-gray-100');

    fireEvent.click(tomorrowBtn);
    expect(tomorrowBtn.style.backgroundColor).toBe('rgb(171, 77, 149)');
    expect(tomorrowBtn.style.color).toBe('white');

    // Other buttons should remain unselected
    const oneHourBtn = screen.getByText('In 1 Hour');
    expect(oneHourBtn.className).toContain('bg-gray-100');
  });

  it('should clear quick selection highlight when manual date is changed', () => {
    const setPostponeDate = vi.fn();
    render(
      <PostponeDialog
        {...defaultProps}
        setPostponeDate={setPostponeDate}
        setPostponeTime={vi.fn()}
      />
    );

    // Select a quick option first
    const tomorrowBtn = screen.getByText('Tomorrow 2 PM');
    fireEvent.click(tomorrowBtn);
    expect(tomorrowBtn.style.backgroundColor).toBe('rgb(171, 77, 149)');

    // Manually change date
    const dateInput = screen.getByDisplayValue('2024-01-15');
    fireEvent.change(dateInput, { target: { value: '2024-01-20' } });

    // Quick selection should be cleared
    expect(tomorrowBtn.className).toContain('bg-gray-100');
  });

  it('should have proper form structure with all 24 hours and 60 minutes options', () => {
    render(<PostponeDialog {...defaultProps} />);
    
    const selects = screen.getAllByRole('combobox');
    const hourSelect = selects[0];
    const minuteSelect = selects[1];
    
    // Check that hour select has 24 options (0-23)
    const hourOptions = hourSelect.querySelectorAll('option');
    expect(hourOptions).toHaveLength(24);
    
    // Check that minute select has 60 options (0-59)
    const minuteOptions = minuteSelect.querySelectorAll('option');
    expect(minuteOptions).toHaveLength(60);
  });
});