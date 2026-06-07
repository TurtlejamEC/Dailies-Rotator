import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import DailyCard from './DailyCard';

interface Props {
  onAddDaily: () => void;
  onEditDaily: (id: string) => void;
  onDuplicateDaily: (id: string) => void;
  onDeleteDaily: (id: string) => void;
}

// ─── sortable card wrapper ────────────────────────────────────────────────────

interface SortableCardProps extends Omit<Props, 'onAddDaily'> {
  dailyId: string;
}

function SortableCard({ dailyId, onEditDaily, onDuplicateDaily, onDeleteDaily }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dailyId });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="touch-none flex flex-col"
    >
      <DailyCard
        dailyId={dailyId}
        onEdit={onEditDaily}
        onDuplicate={onDuplicateDaily}
        onDelete={onDeleteDaily}
      />
    </div>
  );
}

// ─── home page ────────────────────────────────────────────────────────────────

export default function HomePage({ onAddDaily, onEditDaily, onDuplicateDaily, onDeleteDaily }: Props) {
  const rawDailies = useAppStore((s) => s.dailies);
  const reorderDailies = useAppStore((s) => s.reorderDailies);
  const dailies = [...rawDailies].sort((a, b) => a.gridPosition - b.gridPosition);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = dailies.map((d) => d.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    reorderDailies(arrayMove(ids, oldIndex, newIndex));
  };

  if (dailies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-slate-400">No dailies yet. Add one to get started.</p>
        <button
          onClick={onAddDaily}
          aria-label="Add daily"
          className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-colors shadow-sm"
        >
          Add daily
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <button
          onClick={onAddDaily}
          aria-label="Add daily"
          className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-colors shadow-sm"
        >
          Add daily
        </button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={dailies.map((d) => d.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dailies.map((d) => (
              <SortableCard
                key={d.id}
                dailyId={d.id}
                onEditDaily={onEditDaily}
                onDuplicateDaily={onDuplicateDaily}
                onDeleteDaily={onDeleteDaily}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <div className="opacity-90 rotate-1 shadow-2xl">
              <DailyCard
                dailyId={activeId}
                onEdit={() => {}}
                onDuplicate={() => {}}
                onDelete={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
