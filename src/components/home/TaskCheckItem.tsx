import type { Task } from '../../types';

interface Props {
  task: Task;
  isCompleted: boolean;
  onToggle: () => void;
}

export default function TaskCheckItem({ task, isCompleted, onToggle }: Props) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group rounded-lg px-2 py-1 -mx-2 hover:bg-slate-100 transition-colors">
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={onToggle}
        aria-label={task.name}
        className="h-4 w-4 shrink-0 rounded accent-amber-500 cursor-pointer"
      />
      <span
        className={`text-sm transition-colors ${
          isCompleted ? 'line-through text-slate-300' : 'text-slate-700'
        }`}
      >
        {task.name}
      </span>
    </label>
  );
}
