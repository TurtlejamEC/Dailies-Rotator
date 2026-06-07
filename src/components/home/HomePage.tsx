import useAppStore from '../../store/useAppStore';
import DailyCard from './DailyCard';

interface Props {
  onAddDaily: () => void;
  onEditDaily: (id: string) => void;
  onDuplicateDaily: (id: string) => void;
  onDeleteDaily: (id: string) => void;
}

export default function HomePage({ onAddDaily, onEditDaily, onDuplicateDaily, onDeleteDaily }: Props) {
  const rawDailies = useAppStore((s) => s.dailies);
  const dailies = [...rawDailies].sort((a, b) => a.gridPosition - b.gridPosition);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dailies.map((d) => (
          <DailyCard
            key={d.id}
            dailyId={d.id}
            onEdit={onEditDaily}
            onDuplicate={onDuplicateDaily}
            onDelete={onDeleteDaily}
          />
        ))}
      </div>
    </div>
  );
}
