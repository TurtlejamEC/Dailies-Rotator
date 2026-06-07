import type { KeyboardEvent, HTMLAttributes } from 'react';

export interface DraftTask {
  id: string;
  name: string;
  active: boolean;
  priority: number;
}

interface Props {
  task: DraftTask;
  onChange: (updated: DraftTask) => void;
  onDelete: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  dragHandleRef?: (el: HTMLButtonElement | null) => void;
  dragHandleListeners?: HTMLAttributes<HTMLButtonElement>;
  dragHandleAttributes?: HTMLAttributes<HTMLButtonElement>;
}

export default function TaskRow({
  task,
  onChange,
  onDelete,
  onKeyDown,
  inputRef,
  dragHandleRef,
  dragHandleListeners,
  dragHandleAttributes,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      {dragHandleRef && (
        <button
          type="button"
          ref={dragHandleRef}
          {...dragHandleListeners}
          {...dragHandleAttributes}
          aria-label="Drag to reorder"
          className="p-1 text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none"
        >
          ⠿
        </button>
      )}
      <input
        type="text"
        value={task.name}
        onChange={(e) => onChange({ ...task, name: e.target.value })}
        onKeyDown={onKeyDown}
        ref={inputRef}
        aria-label="Task name"
        placeholder="Task name"
        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />
      <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={task.active}
          onChange={(e) => onChange({ ...task, active: e.target.checked })}
          aria-label="Active"
          className="accent-blue-500"
        />
        Active
      </label>
      <label className="flex items-center gap-1 text-xs text-gray-400">
        <span>P</span>
        <input
          type="number"
          value={task.priority}
          min={1}
          onChange={(e) =>
            onChange({ ...task, priority: Math.max(1, parseInt(e.target.value) || 1) })
          }
          aria-label="Priority"
          className="w-12 bg-gray-800 border border-gray-700 rounded px-1 py-1 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
        />
      </label>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Remove task"
        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
