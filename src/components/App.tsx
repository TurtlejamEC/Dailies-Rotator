import { useEffect, useState } from 'react';
import useAppStore from '../store/useAppStore';
import HomePage from './home/HomePage';
import ConfigDialog from './config/ConfigDialog';
import ConfirmDeleteDialog from './home/ConfirmDeleteDialog';

interface DialogState {
  open: boolean;
  mode: 'add' | 'edit' | 'duplicate';
  dailyId?: string;
  insertAtIndex?: number;
}

interface DeleteState {
  open: boolean;
  dailyId?: string;
}

export default function App() {
  const tickAllDailies = useAppStore((s) => s.tickAllDailies);
  const dailies = useAppStore((s) => s.dailies);
  const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'add' });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });

  useEffect(() => {
    tickAllDailies();
  }, [tickAllDailies]);

  if (import.meta.env.DEV) {
    (window as any).__store = useAppStore;
    (window as any).__simulateDay = (dailyId: string) => {
      useAppStore.setState((s) => ({
        schedules: {
          ...s.schedules,
          [dailyId]: s.schedules[dailyId]
            ? { ...s.schedules[dailyId], scheduledDate: '2000-01-01' }
            : s.schedules[dailyId],
        },
      }));
      useAppStore.getState().tickNewDay(dailyId);
    };
  }

  const openAdd = (insertAtIndex?: number) => setDialog({ open: true, mode: 'add', insertAtIndex });
  const openEdit = (id: string) => setDialog({ open: true, mode: 'edit', dailyId: id });
  const openDuplicate = (id: string) => setDialog({ open: true, mode: 'duplicate', dailyId: id });
  const closeDialog = () => setDialog((d) => ({ ...d, open: false }));

  const openDelete = (id: string) => setDeleteState({ open: true, dailyId: id });
  const closeDelete = () => setDeleteState({ open: false });
  const confirmDelete = () => {
    if (deleteState.dailyId) useAppStore.getState().deleteDaily(deleteState.dailyId);
    closeDelete();
  };

  const seedDemoData = () => {
    const store = useAppStore.getState();
    store.addDaily({
      name: 'Morning Routine',
      tasksPerDay: 2,
      ordering: 'sequential',
      tasks: [
        { id: 'mr-1', name: 'Exercise 30 min', active: true, priority: 1 },
        { id: 'mr-2', name: 'Cold shower', active: true, priority: 1 },
        { id: 'mr-3', name: 'Meditate', active: true, priority: 1 },
        { id: 'mr-4', name: 'Journal', active: true, priority: 1 },
      ],
    });
    store.addDaily({
      name: 'Coding Practice',
      tasksPerDay: 1,
      ordering: 'random',
      tasks: [
        { id: 'cp-1', name: 'LeetCode problem', active: true, priority: 1 },
        { id: 'cp-2', name: 'Read docs', active: true, priority: 1 },
        { id: 'cp-3', name: 'Side project', active: true, priority: 1 },
      ],
    });
    store.addDaily({
      name: 'Evening Wind-down',
      tasksPerDay: 3,
      ordering: 'sequential',
      tasks: [
        { id: 'ew-1', name: 'No screens 30 min', active: true, priority: 1 },
        { id: 'ew-2', name: 'Read book', active: true, priority: 1 },
        { id: 'ew-3', name: 'Stretch', active: true, priority: 1 },
      ],
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 text-slate-800">
      <header className="sticky top-0 z-20 bg-violet-600 shadow-md">
        <div className="px-6 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white tracking-tight">Dailies Rotator</h1>
          {import.meta.env.DEV && (
            <button
              onClick={seedDemoData}
              className="px-3 py-1 text-xs rounded bg-violet-500 text-white/70 hover:text-white border border-violet-400"
            >
              Seed demo data
            </button>
          )}
        </div>
      </header>
      <main className="p-6">
        <HomePage
          onAddDaily={openAdd}
          onEditDaily={openEdit}
          onDuplicateDaily={openDuplicate}
          onDeleteDaily={openDelete}
        />
      </main>
      <button
        onClick={() => openAdd()}
        aria-label="Add daily"
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-violet-500 text-white shadow-lg hover:bg-violet-600 hover:shadow-xl transition-all flex items-center justify-center"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
          <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
        </svg>
      </button>
      <ConfigDialog
        open={dialog.open}
        mode={dialog.mode}
        dailyId={dialog.dailyId}
        insertAtIndex={dialog.insertAtIndex}
        onClose={closeDialog}
      />
      <ConfirmDeleteDialog
        open={deleteState.open}
        dailyName={dailies.find((d) => d.id === deleteState.dailyId)?.name ?? ''}
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      />
    </div>
  );
}
