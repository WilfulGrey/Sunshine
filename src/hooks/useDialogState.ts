import { useState } from 'react';
import { Task } from '../types/Task';

export const useDialogState = () => {
  const [showCompletionDialog, setShowCompletionDialog] = useState<Task | null>(null);
  const [completionSummary, setCompletionSummary] = useState('');
  const [showAbandonDialog, setShowAbandonDialog] = useState<Task | null>(null);
  const [abandonReason, setAbandonReason] = useState('');
  const [showTransferDialog, setShowTransferDialog] = useState<Task | null>(null);
  const [transferToUser, setTransferToUser] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [showCloseTaskDialog, setShowCloseTaskDialog] = useState<Task | null>(null);
  const [showPostponeDialog, setShowPostponeDialog] = useState<string | null>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeTime, setPostponeTime] = useState('');
  const [postponeNotes, setPostponeNotes] = useState('');
  // New dialogs for callback type-specific flows
  const [showPreArrivalDialog, setShowPreArrivalDialog] = useState<Task | null>(null);
  const [showPostArrivalDialog, setShowPostArrivalDialog] = useState<Task | null>(null);
  const [showPreDepartureDialog, setShowPreDepartureDialog] = useState<Task | null>(null);

  const openCompletionDialog = (task: Task) => {
    setShowCompletionDialog(task);
    setCompletionSummary('');
  };

  const closeCompletionDialog = () => {
    setShowCompletionDialog(null);
    setCompletionSummary('');
  };

  const openAbandonDialog = (task: Task) => {
    setShowAbandonDialog(task);
    setAbandonReason('');
  };

  const closeAbandonDialog = () => {
    setShowAbandonDialog(null);
    setAbandonReason('');
  };

  const openTransferDialog = (task: Task) => {
    setShowTransferDialog(task);
    setTransferToUser('');
    setTransferReason('');
  };

  const closeTransferDialog = () => {
    setShowTransferDialog(null);
    setTransferToUser('');
    setTransferReason('');
  };

  const openCloseTaskDialog = (task: Task) => {
    setShowCloseTaskDialog(task);
  };

  const closeCloseTaskDialog = () => {
    setShowCloseTaskDialog(null);
  };

  const openPostponeDialog = (taskId: string) => {
    setShowPostponeDialog(taskId);
    setPostponeNotes('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    setPostponeDate(tomorrow.toISOString().slice(0, 10));
    setPostponeTime('09:00');
  };

  const closePostponeDialog = () => {
    setShowPostponeDialog(null);
    setPostponeDate('');
    setPostponeTime('');
    setPostponeNotes('');
  };

  const openPreArrivalDialog = (task: Task) => setShowPreArrivalDialog(task);
  const closePreArrivalDialog = () => setShowPreArrivalDialog(null);

  const openPostArrivalDialog = (task: Task) => setShowPostArrivalDialog(task);
  const closePostArrivalDialog = () => setShowPostArrivalDialog(null);

  const openPreDepartureDialog = (task: Task) => setShowPreDepartureDialog(task);
  const closePreDepartureDialog = () => setShowPreDepartureDialog(null);

  return {
    showCompletionDialog,
    completionSummary,
    setCompletionSummary,
    openCompletionDialog,
    closeCompletionDialog,

    showAbandonDialog,
    abandonReason,
    setAbandonReason,
    openAbandonDialog,
    closeAbandonDialog,

    showCloseTaskDialog,
    openCloseTaskDialog,
    closeCloseTaskDialog,

    showTransferDialog,
    transferToUser,
    setTransferToUser,
    transferReason,
    setTransferReason,
    openTransferDialog,
    closeTransferDialog,

    showPostponeDialog,
    postponeDate,
    setPostponeDate,
    postponeTime,
    setPostponeTime,
    postponeNotes,
    setPostponeNotes,
    openPostponeDialog,
    closePostponeDialog,

    showPreArrivalDialog,
    openPreArrivalDialog,
    closePreArrivalDialog,

    showPostArrivalDialog,
    openPostArrivalDialog,
    closePostArrivalDialog,

    showPreDepartureDialog,
    openPreDepartureDialog,
    closePreDepartureDialog,
  };
};
