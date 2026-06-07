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
import { useState, useRef } from 'react';
import useAppStore from '../../store/useAppStore';
import DailyCard from './DailyCard';

interface Props {
  onAddDaily: (insertAtIndex?: number) => void;
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
      data-card
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
  const [hoverInsertIndex, setHoverInsertIndex] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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

  const computeInsertIndex = (clientX: number, clientY: number) => {
    if (!gridRef.current) return dailies.length;
    const cardEls = Array.from(gridRef.current.querySelectorAll('[data-card]')) as HTMLElement[];
    let insertAtIndex = dailies.length;
    cardEls.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      if (
        rect.bottom < clientY ||
        (rect.top <= clientY && clientY <= rect.bottom && rect.left + rect.width / 2 < clientX)
      ) {
        insertAtIndex = i + 1;
      }
    });
    return insertAtIndex;
  };


  if (dailies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-slate-300">No dailies yet. Tap + to add one.</p>
      </div>
    );
  }

  const getGapRect = (index: number) => {
    if (!gridRef.current || index <= 0 || index >= dailies.length) return null;
    const cardEls = Array.from(gridRef.current.querySelectorAll('[data-card]')) as HTMLElement[];
    const prev = cardEls[index - 1]?.getBoundingClientRect();
    const curr = cardEls[index]?.getBoundingClientRect();
    if (!prev || !curr) return null;
    const sameRow = Math.abs(prev.top - curr.top) < 10;
    if (sameRow) {
      return { left: prev.right, top: prev.top, width: curr.left - prev.right, height: prev.height };
    }
    const gridRect = gridRef.current.getBoundingClientRect();
    return { left: gridRect.left, top: prev.bottom, width: gridRect.width, height: curr.top - prev.bottom };
  };

  const gapRect = hoverInsertIndex !== null ? getGapRect(hoverInsertIndex) : null;

  return (
    <div className="flex flex-col gap-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={dailies.map((d) => d.id)} strategy={rectSortingStrategy}>
          <div
            ref={gridRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            onMouseMove={(e) => {
              if (e.target !== e.currentTarget) { setHoverInsertIndex(null); return; }
              setHoverInsertIndex(computeInsertIndex(e.clientX, e.clientY));
            }}
            onMouseLeave={() => setHoverInsertIndex(null)}
            onClick={(e) => {
              if (e.target !== e.currentTarget) return;
              const idx = computeInsertIndex(e.clientX, e.clientY);
              onAddDaily(idx < dailies.length ? idx : undefined);
            }}
          >
            {dailies.map((d) => (
              <SortableCard
                key={d.id}
                dailyId={d.id}
                onEditDaily={onEditDaily}
                onDuplicateDaily={onDuplicateDaily}
                onDeleteDaily={onDeleteDaily}
              />
            ))}
            <button
              onClick={onAddDaily}
              aria-label="Add daily"
              className="min-h-32 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-300 hover:border-amber-400 hover:text-amber-500 transition-colors appearance-none bg-transparent cursor-pointer"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
              </svg>
            </button>
          </div>
        {gapRect && (
          <div
            className="fixed pointer-events-none z-10 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300"
            style={{ left: gapRect.left, top: gapRect.top, width: gapRect.width, height: gapRect.height }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
            </svg>
          </div>
        )}
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
