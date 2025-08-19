import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDialogState } from './useDialogState';
import { Task } from '../types/Task';

describe('useDialogState', () => {
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

  it('should initialize with all dialogs closed', () => {
    const { result } = renderHook(() => useDialogState());

    expect(result.current.showPhoneDialog).toBeNull();
    expect(result.current.showCompletionDialog).toBeNull();
    expect(result.current.showAbandonDialog).toBeNull();
    expect(result.current.showTransferDialog).toBeNull();
    expect(result.current.showPostponeDialog).toBeNull();
  });

  it('should initialize with empty form values', () => {
    const { result } = renderHook(() => useDialogState());

    expect(result.current.completionSummary).toBe('');
    expect(result.current.abandonReason).toBe('');
    expect(result.current.transferToUser).toBe('');
    expect(result.current.transferReason).toBe('');
    expect(result.current.postponeDate).toBe('');
    expect(result.current.postponeTime).toBe('');
    expect(result.current.postponeNotes).toBe('');
  });

  describe('Phone Dialog', () => {
    it('should open phone dialog with task', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.openPhoneDialog(mockTask);
      });

      expect(result.current.showPhoneDialog).toBe(mockTask);
    });

    it('should close phone dialog', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.openPhoneDialog(mockTask);
      });

      act(() => {
        result.current.closePhoneDialog();
      });

      expect(result.current.showPhoneDialog).toBeNull();
    });
  });

  describe('Completion Dialog', () => {
    it('should open completion dialog and reset summary', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setCompletionSummary('old summary');
      });

      act(() => {
        result.current.openCompletionDialog(mockTask);
      });

      expect(result.current.showCompletionDialog).toBe(mockTask);
      expect(result.current.completionSummary).toBe('');
    });

    it('should close completion dialog and reset summary', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.openCompletionDialog(mockTask);
        result.current.setCompletionSummary('test summary');
      });

      act(() => {
        result.current.closeCompletionDialog();
      });

      expect(result.current.showCompletionDialog).toBeNull();
      expect(result.current.completionSummary).toBe('');
    });

    it('should update completion summary', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setCompletionSummary('new summary');
      });

      expect(result.current.completionSummary).toBe('new summary');
    });
  });

  describe('Abandon Dialog', () => {
    it('should open abandon dialog and reset reason', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setAbandonReason('old reason');
      });

      act(() => {
        result.current.openAbandonDialog(mockTask);
      });

      expect(result.current.showAbandonDialog).toBe(mockTask);
      expect(result.current.abandonReason).toBe('');
    });

    it('should close abandon dialog and reset reason', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.openAbandonDialog(mockTask);
        result.current.setAbandonReason('test reason');
      });

      act(() => {
        result.current.closeAbandonDialog();
      });

      expect(result.current.showAbandonDialog).toBeNull();
      expect(result.current.abandonReason).toBe('');
    });
  });

  describe('Transfer Dialog', () => {
    it('should open transfer dialog and reset form', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setTransferToUser('old user');
        result.current.setTransferReason('old reason');
      });

      act(() => {
        result.current.openTransferDialog(mockTask);
      });

      expect(result.current.showTransferDialog).toBe(mockTask);
      expect(result.current.transferToUser).toBe('');
      expect(result.current.transferReason).toBe('');
    });

    it('should close transfer dialog and reset form', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.openTransferDialog(mockTask);
        result.current.setTransferToUser('test user');
        result.current.setTransferReason('test reason');
      });

      act(() => {
        result.current.closeTransferDialog();
      });

      expect(result.current.showTransferDialog).toBeNull();
      expect(result.current.transferToUser).toBe('');
      expect(result.current.transferReason).toBe('');
    });
  });

  describe('Postpone Dialog', () => {
    it('should open postpone dialog with default values', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.openPostponeDialog('task-id');
      });

      expect(result.current.showPostponeDialog).toBe('task-id');
      expect(result.current.postponeNotes).toBe('');
      expect(result.current.postponeTime).toBe('09:00');
      
      // Check that postponeDate is set to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expectedDate = tomorrow.toISOString().slice(0, 10);
      expect(result.current.postponeDate).toBe(expectedDate);
    });

    it('should close postpone dialog and reset form', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.openPostponeDialog('task-id');
        result.current.setPostponeNotes('test notes');
        result.current.setPostponeDate('2024-01-15');
        result.current.setPostponeTime('14:30');
      });

      act(() => {
        result.current.closePostponeDialog();
      });

      expect(result.current.showPostponeDialog).toBeNull();
      expect(result.current.postponeDate).toBe('');
      expect(result.current.postponeTime).toBe('');
      expect(result.current.postponeNotes).toBe('');
    });

    it('should update postpone form values', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setPostponeDate('2024-01-15');
        result.current.setPostponeTime('14:30');
        result.current.setPostponeNotes('meeting notes');
      });

      expect(result.current.postponeDate).toBe('2024-01-15');
      expect(result.current.postponeTime).toBe('14:30');
      expect(result.current.postponeNotes).toBe('meeting notes');
    });
  });
});