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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dailyId });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <DailyCard
        dailyId={dailyId}
        onEdit={onEditDaily}
        onDuplicate={onDuplicateDaily}
        onDelete={onDeleteDaily}
        dragHandleRef={setActivatorNodeRef as (el: HTMLButtonElement | null) => void}
        dragHandleListeners={listeners as any}
        dragHandleAttributes={attributes as any}
      />
    </div>
  );
}

// ─── home page ────────────────────────────────────────────────────────────────

export default function HomePage({ onAddDaily, onEditDaily, onDuplicateDaily, onDeleteDaily }: Props) {
  const rawDailies = useAppStore((s) => s.dailies);
  const reorderDailies = useAppStore((s) => s.reorderDailies);
  const dailies = [...rawDailies].sort((a, b) => a.gridPosition - b.gridPosition);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
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
        <p className="text-gray-400">No dailies yet. Add one to get started.</p>
        <button
          onClick={onAddDaily}
          aria-label="Add daily"
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
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
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          Add daily
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
      </DndContext>
    </div>
  );
}
