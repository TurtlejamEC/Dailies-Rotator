import * as Dialog from '@radix-ui/react-dialog';
import useAppStore from '../../store/useAppStore';
import { projectSchedules, getTodayDate } from '../../lib/scheduling';

interface Props {
  open: boolean;
  dailyId: string;
  onClose: () => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${DAY_LABELS[d.getDay()]}, ${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
}

export default function CalendarDialog({ open, dailyId, onClose }: Props) {
  const daily = useAppStore((s) => s.dailies.find((d) => d.id === dailyId));
  const schedule = useAppStore((s) => s.schedules[dailyId]);

  if (!daily || !schedule) return null;

  const taskMap = new Map(daily.tasks.map((t) => [t.id, t.name]));
  const today = getTodayDate();
  const projected = projectSchedules(daily, schedule, 14);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl transition-all duration-200 data-[state=closed]:opacity-0 data-[state=closed]:scale-95 data-[state=open]:opacity-100 data-[state=open]:scale-100 max-h-[80vh] flex flex-col"
          aria-describedby={undefined}
        >
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-4 shrink-0">
            {daily.name} — upcoming
          </Dialog.Title>
          <div className="overflow-y-auto flex flex-col gap-1">
            {projected.map(({ date, taskIds }) => {
              const isToday = date === today;
              return (
                <div
                  key={date}
                  className={`flex gap-3 px-3 py-2 rounded-lg text-sm ${isToday ? 'bg-amber-50 border border-amber-200' : 'border border-transparent'}`}
                >
                  <span className={`w-28 shrink-0 font-medium ${isToday ? 'text-amber-700' : 'text-slate-500'}`}>
                    {formatDate(date)}{isToday ? ' · today' : ''}
                  </span>
                  <span className="text-slate-700">
                    {taskIds.map((id) => taskMap.get(id) ?? id).join(', ') || '—'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="pt-4 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
