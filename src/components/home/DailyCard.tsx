import { useState } from 'react';
import type React from 'react';
import useAppStore from '../../store/useAppStore';
import type { Task } from '../../types';
import TaskCheckItem from './TaskCheckItem';
import CalendarDialog from './CalendarDialog';

interface Props {
  dailyId: string;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function DailyCard({ dailyId, onEdit, onDuplicate, onDelete }: Props) {
  const daily = useAppStore((s) => s.dailies.find((d) => d.id === dailyId));
  const schedule = useAppStore((s) => s.schedules[dailyId]);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const markAllDone = useAppStore((s) => s.markAllDone);
  const unmarkBatchDone = useAppStore((s) => s.unmarkBatchDone);
  const [showCalendar, setShowCalendar] = useState(false);

  if (!daily || !schedule) return null;

  const scheduledTasks = schedule.scheduledTaskIds
    .map((id) => daily.tasks.find((t) => t.id === id))
    .filter((t): t is Task => t !== undefined);

  const allDone =
    scheduledTasks.length > 0 &&
    scheduledTasks.every((t) => schedule.completedTaskIds.includes(t.id));

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button, input, label, a')) return;
    if (allDone) {
      unmarkBatchDone(dailyId);
    } else {
      markAllDone(dailyId);
    }
  };

  return (
    <>
      <article
        data-done={allDone ? 'true' : undefined}
        onClick={handleCardClick}
        className={`flex-1 bg-white rounded-xl p-4 flex flex-col gap-3 border shadow-sm transition-colors cursor-pointer ${
          allDone ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-800 leading-snug truncate">
            {daily.name}
          </h2>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setShowCalendar(true)}
              aria-label="View schedule"
              className="p-1.5 appearance-none bg-transparent border-0 text-slate-400 hover:text-amber-600 transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
              </svg>
            </button>
            <button
              onClick={() => onEdit(dailyId)}
              aria-label="Edit"
              className="p-1.5 appearance-none bg-transparent border-0 text-slate-400 hover:text-amber-600 transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-10 10A2 2 0 015 17H3v-2a2 2 0 01.586-1.414l10-10z"/>
              </svg>
            </button>
            <button
              onClick={() => onDuplicate(dailyId)}
              aria-label="Duplicate"
              className="p-1.5 appearance-none bg-transparent border-0 text-slate-400 hover:text-amber-600 transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z"/>
                <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z"/>
              </svg>
            </button>
            <button
              onClick={() => onDelete(dailyId)}
              aria-label="Delete"
              className="p-1.5 appearance-none bg-transparent border-0 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Task list */}
        {scheduledTasks.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No tasks scheduled</p>
        ) : (
          <>
            {allDone && (
              <p className="text-sm font-medium text-emerald-600">All done!</p>
            )}
            <ul className="flex flex-col gap-2 list-none p-0 m-0">
              {scheduledTasks.map((task) => (
                <li key={task.id}>
                  <TaskCheckItem
                    task={task}
                    isCompleted={schedule.completedTaskIds.includes(task.id)}
                    onToggle={() => toggleTask(dailyId, task.id)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
      <CalendarDialog
        open={showCalendar}
        dailyId={dailyId}
        onClose={() => setShowCalendar(false)}
      />
    </>
  );
}
