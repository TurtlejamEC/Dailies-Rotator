import * as Dialog from '@radix-ui/react-dialog';
import useAppStore from '../../store/useAppStore';
import ConfigForm, { type ConfigFormData } from './ConfigForm';

interface Props {
  open: boolean;
  mode: 'add' | 'edit' | 'duplicate';
  dailyId?: string;
  insertAtIndex?: number;
  onClose: () => void;
  onReset?: () => void;
}

export default function ConfigDialog({ open, mode, dailyId, insertAtIndex, onClose, onReset }: Props) {
  const dailies = useAppStore((s) => s.dailies);
  const addDaily = useAppStore((s) => s.addDaily);
  const updateDaily = useAppStore((s) => s.updateDaily);

  const existing = dailyId ? dailies.find((d) => d.id === dailyId) : undefined;

  const initialData: ConfigFormData = (() => {
    if (mode === 'add' || !existing) {
      return { name: '', tasksPerDay: 1, ordering: 'sequential', tasks: [] };
    }
    if (mode === 'duplicate') {
      return {
        name: `${existing.name} (copy)`,
        tasksPerDay: existing.tasksPerDay,
        ordering: existing.ordering,
        tasks: existing.tasks.map((t) => ({ ...t })),
      };
    }
    // edit
    return {
      name: existing.name,
      tasksPerDay: existing.tasksPerDay,
      ordering: existing.ordering,
      tasks: existing.tasks.map((t) => ({ ...t })),
    };
  })();

  const handleSave = (data: ConfigFormData) => {
    if (mode === 'edit' && existing) {
      updateDaily(existing.id, {
        ...existing,
        name: data.name,
        tasksPerDay: data.tasksPerDay,
        ordering: data.ordering,
        tasks: data.tasks,
      });
    } else {
      const idx = mode === 'duplicate' && existing !== undefined
        ? existing.gridPosition + 1
        : insertAtIndex;
      addDaily({
        name: data.name,
        tasksPerDay: data.tasksPerDay,
        ordering: data.ordering,
        tasks: data.tasks,
      }, ...(idx !== undefined ? [idx] : []));
    }
    onClose();
  };

  const title =
    mode === 'add' ? 'New daily' : mode === 'duplicate' ? 'Duplicate daily' : 'Edit daily';

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl transition-all duration-200 data-[state=closed]:opacity-0 data-[state=closed]:scale-95 data-[state=open]:opacity-100 data-[state=open]:scale-100"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-slate-800">
              {title}
            </Dialog.Title>
            {mode === 'edit' && onReset && (
              <button
                type="button"
                onClick={onReset}
                aria-label="Reset schedule"
                className="p-1.5 appearance-none bg-transparent border-0 text-slate-400 hover:text-amber-600 transition-colors"
                title="Reset schedule"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                </svg>
              </button>
            )}
          </div>
          <ConfigForm initialData={initialData} onSave={handleSave} onCancel={onClose} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
