import type { HTMLAttributes } from 'react';
import useAppStore from '../../store/useAppStore';
import type { Task } from '../../types';
import TaskCheckItem from './TaskCheckItem';

interface Props {
  dailyId: string;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandleRef?: (el: HTMLButtonElement | null) => void;
  dragHandleListeners?: HTMLAttributes<HTMLButtonElement>;
  dragHandleAttributes?: HTMLAttributes<HTMLButtonElement>;
}

export default function DailyCard({
  dailyId,
  onEdit,
  onDuplicate,
  onDelete,
  dragHandleRef,
  dragHandleListeners,
  dragHandleAttributes,
}: Props) {
  const daily = useAppStore((s) => s.dailies.find((d) => d.id === dailyId));
  const schedule = useAppStore((s) => s.schedules[dailyId]);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const markAllDone = useAppStore((s) => s.markAllDone);

  if (!daily || !schedule) return null;

  const scheduledTasks = schedule.scheduledTaskIds
    .map((id) => daily.tasks.find((t) => t.id === id))
    .filter((t): t is Task => t !== undefined);

  const allDone =
    scheduledTasks.length > 0 &&
    scheduledTasks.every((t) => schedule.completedTaskIds.includes(t.id));

  return (
    <article className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3 border border-gray-800">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {dragHandleRef && (
            <button
              type="button"
              ref={dragHandleRef}
              {...dragHandleListeners}
              {...dragHandleAttributes}
              aria-label="Drag to reorder"
              className="text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none shrink-0"
            >
              ⠿
            </button>
          )}
          <h2 className="text-base font-semibold text-gray-100 leading-snug truncate">
            {daily.name}
          </h2>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(dailyId)}
            aria-label="Edit"
            className="px-2 py-1 text-xs rounded text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDuplicate(dailyId)}
            aria-label="Duplicate"
            className="px-2 py-1 text-xs rounded text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
          >
            Duplicate
          </button>
          <button
            onClick={() => onDelete(dailyId)}
            aria-label="Delete"
            className="px-2 py-1 text-xs rounded text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Task list */}
      {scheduledTasks.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No tasks scheduled</p>
      ) : (
        <>
          {allDone && (
            <p className="text-sm font-medium text-green-400">All done!</p>
          )}
          <ul className="flex flex-col gap-2">
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
          {!allDone && (
            <button
              onClick={() => markAllDone(dailyId)}
              aria-label="Mark all done"
              className="mt-1 self-start px-3 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-100 transition-colors"
            >
              Mark all done
            </button>
          )}
        </>
      )}
    </article>
  );
}
