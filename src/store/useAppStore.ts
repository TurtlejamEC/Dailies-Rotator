import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StateCreator } from 'zustand';
import type { Daily, DailySchedule } from '../types';
import {
  computeNewSchedule,
  getEligibleTasks,
  isNewDay,
  reconcileSchedule,
} from '../lib/scheduling';
import { generateId } from '../lib/id';

export interface AppStore {
  dailies: Daily[];
  schedules: Record<string, DailySchedule>;

  /** id and gridPosition are optional — store generates id if omitted, appends to end if gridPosition omitted */
  addDaily: (daily: Partial<Pick<Daily, 'id' | 'gridPosition'>> & Omit<Daily, 'id' | 'gridPosition'>) => void;
  updateDaily: (id: string, daily: Daily) => void;
  deleteDaily: (id: string) => void;
  reorderDailies: (orderedIds: string[]) => void;
  toggleTask: (dailyId: string, taskId: string) => void;
  markAllDone: (dailyId: string) => void;
  unmarkBatchDone: (dailyId: string) => void;
  tickNewDay: (dailyId: string) => void;
  tickAllDailies: () => void;
}

export const createAppStoreSlice: StateCreator<AppStore> = (set, get) => ({
  dailies: [],
  schedules: {},

  addDaily: (dailyInput) => {
    const { dailies } = get();
    const daily: Daily = {
      id: generateId(),
      gridPosition: dailies.length,
      ...dailyInput,
    };
    const schedule = computeNewSchedule(daily, null);
    set((s) => ({
      dailies: [...s.dailies, daily],
      schedules: { ...s.schedules, [daily.id]: schedule },
    }));
  },

  updateDaily: (id, newDaily) => {
    const { dailies, schedules } = get();
    const oldDaily = dailies.find((d) => d.id === id);
    if (!oldDaily) return;

    const prevEligible = getEligibleTasks(oldDaily);
    const currentSchedule = schedules[id];

    const reconciledSchedule = currentSchedule
      ? reconcileSchedule(newDaily, currentSchedule, prevEligible)
      : computeNewSchedule(newDaily, null);

    set((s) => ({
      dailies: s.dailies.map((d) => (d.id === id ? { ...newDaily, id } : d)),
      schedules: { ...s.schedules, [id]: reconciledSchedule },
    }));
  },

  deleteDaily: (id) => {
    set((s) => {
      const remaining = s.dailies
        .filter((d) => d.id !== id)
        .map((d, i) => ({ ...d, gridPosition: i }));
      const { [id]: _removed, ...rest } = s.schedules;
      return { dailies: remaining, schedules: rest };
    });
  },

  reorderDailies: (orderedIds) => {
    set((s) => ({
      dailies: s.dailies.map((d) => ({
        ...d,
        gridPosition: orderedIds.indexOf(d.id),
      })),
    }));
  },

  toggleTask: (dailyId, taskId) => {
    const { schedules } = get();
    const schedule = schedules[dailyId];
    if (!schedule || !schedule.scheduledTaskIds.includes(taskId)) return;

    const completed = schedule.completedTaskIds.includes(taskId)
      ? schedule.completedTaskIds.filter((id) => id !== taskId)
      : [...schedule.completedTaskIds, taskId];

    set((s) => ({
      schedules: {
        ...s.schedules,
        [dailyId]: { ...s.schedules[dailyId], completedTaskIds: completed },
      },
    }));
  },

  markAllDone: (dailyId) => {
    const { schedules } = get();
    const schedule = schedules[dailyId];
    if (!schedule) return;

    const alreadyDone = new Set(schedule.completedTaskIds);
    const batchCompletedIds = schedule.scheduledTaskIds.filter((id) => !alreadyDone.has(id));

    set((s) => ({
      schedules: {
        ...s.schedules,
        [dailyId]: {
          ...s.schedules[dailyId],
          completedTaskIds: [...s.schedules[dailyId].scheduledTaskIds],
          batchCompletedIds,
        },
      },
    }));
  },

  unmarkBatchDone: (dailyId) => {
    const { schedules } = get();
    const schedule = schedules[dailyId];
    if (!schedule) return;

    const batch = new Set(schedule.batchCompletedIds ?? []);
    const completedTaskIds = schedule.completedTaskIds.filter((id) => !batch.has(id));

    set((s) => ({
      schedules: {
        ...s.schedules,
        [dailyId]: {
          ...s.schedules[dailyId],
          completedTaskIds,
          batchCompletedIds: [],
        },
      },
    }));
  },

  tickNewDay: (dailyId) => {
    const { dailies, schedules } = get();
    const daily = dailies.find((d) => d.id === dailyId);
    if (!daily) return;

    const current = schedules[dailyId] ?? null;
    if (!isNewDay(current)) return;

    const newSchedule = computeNewSchedule(daily, current);
    set((s) => ({
      schedules: { ...s.schedules, [dailyId]: newSchedule },
    }));
  },

  tickAllDailies: () => {
    get().dailies.forEach((d) => get().tickNewDay(d.id));
  },
});

const useAppStore = create<AppStore>()(
  persist(createAppStoreSlice, {
    name: 'dailies-rotator-state',
    version: 1,
    // Use window.localStorage explicitly — avoids Node.js 22's broken globalThis.localStorage
    storage: createJSONStorage(() =>
      typeof window !== 'undefined' ? window.localStorage : undefined,
    ),
    migrate: (state) => state as AppStore,
  }),
);

export default useAppStore;
