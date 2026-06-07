import type { Task } from '../../types';

interface Props {
  task: Task;
  isCompleted: boolean;
  onToggle: () => void;
}

export default function TaskCheckItem({ task, isCompleted, onToggle }: Props) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={onToggle}
        aria-label={task.name}
        className="h-4 w-4 shrink-0 rounded border-gray-600 bg-gray-800 text-blue-500 accent-blue-500 cursor-pointer"
      />
      <span
        className={`text-sm transition-colors ${
          isCompleted ? 'line-through text-gray-500' : 'text-gray-200'
        }`}
      >
        {task.name}
      </span>
    </label>
  );
}
