import { useEffect } from 'react';
import useAppStore from '../store/useAppStore';

export default function App() {
  const tickAllDailies = useAppStore((s) => s.tickAllDailies);

  useEffect(() => {
    tickAllDailies();
  }, [tickAllDailies]);

  // Dev helpers
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Dailies Rotator</h1>
      <p className="text-gray-400 text-sm">Phase 2 demo — open console, use window.__store</p>
    </div>
  );
}
