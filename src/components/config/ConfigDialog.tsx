import * as Dialog from '@radix-ui/react-dialog';
import useAppStore from '../../store/useAppStore';
import ConfigForm, { type ConfigFormData } from './ConfigForm';

interface Props {
  open: boolean;
  mode: 'add' | 'edit' | 'duplicate';
  dailyId?: string;
  onClose: () => void;
}

export default function ConfigDialog({ open, mode, dailyId, onClose }: Props) {
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
      addDaily({
        name: data.name,
        tasksPerDay: data.tasksPerDay,
        ordering: data.ordering,
        tasks: data.tasks,
      });
    }
    onClose();
  };

  const title =
    mode === 'add' ? 'New daily' : mode === 'duplicate' ? 'Duplicate daily' : 'Edit daily';

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl"
          aria-describedby={undefined}
        >
          <Dialog.Title className="text-lg font-semibold text-gray-100 mb-5">
            {title}
          </Dialog.Title>
          <ConfigForm initialData={initialData} onSave={handleSave} onCancel={onClose} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
