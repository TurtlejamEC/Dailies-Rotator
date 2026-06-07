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
          className="p-1 appearance-none bg-transparent border-0 text-slate-400 hover:text-slate-600 transition-colors cursor-grab active:cursor-grabbing touch-none"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M3 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
          </svg>
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
        className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-amber-400"
      />
      <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
        <input
          type="checkbox"
          checked={task.active}
          onChange={(e) => onChange({ ...task, active: e.target.checked })}
          aria-label="Active"
          className="accent-amber-500"
        />
        Active
      </label>
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <span>P</span>
        <input
          type="number"
          value={task.priority}
          min={1}
          onChange={(e) =>
            onChange({ ...task, priority: Math.max(1, parseInt(e.target.value) || 1) })
          }
          aria-label="Priority"
          className="w-12 bg-white border border-slate-200 rounded px-1 py-1 text-sm text-slate-800 focus:outline-none focus:border-amber-400"
        />
      </label>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Remove task"
        className="p-1 appearance-none bg-transparent border-0 text-slate-400 hover:text-rose-500 transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
      </button>
    </div>
  );
}
