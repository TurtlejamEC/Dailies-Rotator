import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { generateId } from '../../lib/id';
import TaskRow, { type DraftTask } from './TaskRow';

export interface ConfigFormData {
  name: string;
  tasksPerDay: number;
  ordering: 'sequential' | 'random';
  tasks: DraftTask[];
}

interface Props {
  initialData: ConfigFormData;
  onSave: (data: ConfigFormData) => void;
  onCancel: () => void;
}

// ─── sortable task row ────────────────────────────────────────────────────────

interface SortableTaskRowProps {
  task: DraftTask;
  onChange: (updated: DraftTask) => void;
  onDelete: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  inputRef: (el: HTMLInputElement | null) => void;
}

function SortableTaskRow({ task, onChange, onDelete, onKeyDown, inputRef }: SortableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <TaskRow
        task={task}
        onChange={onChange}
        onDelete={onDelete}
        onKeyDown={onKeyDown}
        inputRef={inputRef}
        dragHandleRef={setActivatorNodeRef as (el: HTMLButtonElement | null) => void}
        dragHandleListeners={listeners as any}
        dragHandleAttributes={attributes as any}
      />
    </div>
  );
}

// ─── config form ─────────────────────────────────────────────────────────────

export default function ConfigForm({ initialData, onSave, onCancel }: Props) {
  const [name, setName] = useState(initialData.name);
  const [tasksPerDay, setTasksPerDay] = useState(initialData.tasksPerDay);
  const [ordering, setOrdering] = useState<'sequential' | 'random'>(initialData.ordering);
  const [tasks, setTasks] = useState<DraftTask[]>(initialData.tasks);

  const [focusIndex, setFocusIndex] = useState(-1);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (focusIndex >= 0 && inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex]!.focus();
      setFocusIndex(-1);
    }
  }, [focusIndex, tasks.length]);

  const addTask = (afterIndex = tasks.length - 1) => {
    const newTask: DraftTask = { id: generateId(), name: '', active: true, priority: 1 };
    setTasks((prev) => [
      ...prev.slice(0, afterIndex + 1),
      newTask,
      ...prev.slice(afterIndex + 1),
    ]);
    setFocusIndex(afterIndex + 1);
  };

  const handleTaskKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTask(index);
    }
    if (e.key === 'Backspace' && tasks[index].name === '') {
      e.preventDefault();
      setTasks((prev) => prev.filter((_, i) => i !== index));
      setFocusIndex(Math.max(0, index - 1));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    setTasks((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const handleSave = () => {
    onSave({ name, tasksPerDay, ordering, tasks });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="daily-name" className="text-sm font-medium text-gray-300">
          Daily name
        </label>
        <input
          id="daily-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Daily name"
          placeholder="e.g. Morning Routine"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Tasks per day */}
      <div className="flex flex-col gap-1">
        <label htmlFor="tasks-per-day" className="text-sm font-medium text-gray-300">
          Tasks per day
        </label>
        <input
          id="tasks-per-day"
          type="number"
          min={1}
          value={tasksPerDay}
          onChange={(e) => setTasksPerDay(Math.max(1, parseInt(e.target.value) || 1))}
          aria-label="Tasks per day"
          className="w-24 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Ordering */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-300">Rotation order</span>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input
              type="radio"
              name="ordering"
              value="sequential"
              checked={ordering === 'sequential'}
              onChange={() => setOrdering('sequential')}
              aria-label="Sequential"
              className="accent-blue-500"
            />
            Sequential
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input
              type="radio"
              name="ordering"
              value="random"
              checked={ordering === 'random'}
              onChange={() => setOrdering('random')}
              aria-label="Random"
              className="accent-blue-500"
            />
            Random
          </label>
        </div>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-300">Tasks</span>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {tasks.map((task, index) => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  onChange={(updated) =>
                    setTasks((prev) => prev.map((t, i) => (i === index ? updated : t)))
                  }
                  onDelete={() => setTasks((prev) => prev.filter((_, i) => i !== index))}
                  onKeyDown={(e) => handleTaskKeyDown(e, index)}
                  inputRef={(el) => {
                    inputRefs.current[index] = el;
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <button
          type="button"
          onClick={() => addTask()}
          aria-label="Add task"
          className="self-start px-3 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-100 border border-gray-700 hover:border-gray-500 transition-colors"
        >
          + Add task
        </button>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="px-4 py-2 text-sm rounded text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          aria-label="Save"
          className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}
