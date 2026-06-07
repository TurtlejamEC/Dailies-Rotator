import { useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import HomePage from './home/HomePage';

export default function App() {
  const tickAllDailies = useAppStore((s) => s.tickAllDailies);

  useEffect(() => {
    tickAllDailies();
  }, [tickAllDailies]);

  if (import.meta.env.DEV) {
    (window as any).__store = useAppStore;
    (window as any).__simulateDay = (dailyId: string) => {
      useAppStore.setState((s) => ({
        schedules: {
          ...s.schedules,
          [dailyId]: s.schedules[dailyId]
            ? { ...s.schedules[dailyId], scheduledDate: '2000-01-01' }
            : s.schedules[dailyId],
        },
      }));
      useAppStore.getState().tickNewDay(dailyId);
    };
  }

  const handleAddDaily = () => {
    // placeholder — Config dialog wired in Phase 4
    alert('Config dialog coming in Phase 4');
  };

  const seedDemoData = () => {
    const store = useAppStore.getState();
    store.addDaily({
      name: 'Morning Routine',
      tasksPerDay: 2,
      ordering: 'sequential',
      tasks: [
        { id: 'mr-1', name: 'Exercise 30 min', active: true, priority: 1 },
        { id: 'mr-2', name: 'Cold shower', active: true, priority: 1 },
        { id: 'mr-3', name: 'Meditate', active: true, priority: 1 },
        { id: 'mr-4', name: 'Journal', active: true, priority: 1 },
      ],
    });
    store.addDaily({
      name: 'Coding Practice',
      tasksPerDay: 1,
      ordering: 'random',
      tasks: [
        { id: 'cp-1', name: 'LeetCode problem', active: true, priority: 1 },
        { id: 'cp-2', name: 'Read docs', active: true, priority: 1 },
        { id: 'cp-3', name: 'Side project', active: true, priority: 1 },
      ],
    });
    store.addDaily({
      name: 'Evening Wind-down',
      tasksPerDay: 3,
      ordering: 'sequential',
      tasks: [
        { id: 'ew-1', name: 'No screens 30 min', active: true, priority: 1 },
        { id: 'ew-2', name: 'Read book', active: true, priority: 1 },
        { id: 'ew-3', name: 'Stretch', active: true, priority: 1 },
      ],
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Dailies Rotator</h1>
        {import.meta.env.DEV && (
          <button
            onClick={seedDemoData}
            className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-100 border border-gray-700"
          >
            Seed demo data
          </button>
        )}
      </header>
      <main>
        <HomePage
          onAddDaily={handleAddDaily}
          onEditDaily={() => alert('Config dialog coming in Phase 4')}
          onDuplicateDaily={() => alert('Config dialog coming in Phase 4')}
          onDeleteDaily={(id) => useAppStore.getState().deleteDaily(id)}
        />
      </main>
    </div>
  );
}
