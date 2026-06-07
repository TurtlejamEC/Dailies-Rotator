import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import type { Daily, Task } from '../types';
import { createAppStoreSlice } from './useAppStore';
import { getTodayDate } from '../lib/scheduling';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  return { id, name: id, active: true, priority: 1, ...overrides };
}

function makeDaily(overrides: Partial<Daily> = {}): Daily {
  return {
    id: 'd1',
    name: 'Test Daily',
    tasksPerDay: 2,
    ordering: 'sequential',
    tasks: [makeTask('A'), makeTask('B'), makeTask('C')],
    gridPosition: 0,
    ...overrides,
  };
}

function makeStore() {
  return createStore(createAppStoreSlice);
}

// ─── addDaily ────────────────────────────────────────────────────────────────

describe('addDaily', () => {
  it('adds daily and initialises schedule for today', () => {
    const store = makeStore();
    const daily = makeDaily({ id: 'd1' });
    store.getState().addDaily(daily);

    const { dailies, schedules } = store.getState();
    expect(dailies).toHaveLength(1);
    expect(dailies[0].id).toBe('d1');
    expect(schedules['d1']).toBeDefined();
    expect(schedules['d1'].scheduledDate).toBe(getTodayDate());
  });

  it('schedules correct tasks on creation', () => {
    const store = makeStore();
    const daily = makeDaily({ tasksPerDay: 2, ordering: 'sequential' });
    store.getState().addDaily(daily);

    const schedule = store.getState().schedules['d1'];
    expect(schedule.scheduledTaskIds).toHaveLength(2);
    expect(schedule.scheduledTaskIds).toContain('A');
    expect(schedule.scheduledTaskIds).toContain('B');
  });
});

// ─── deleteDaily ─────────────────────────────────────────────────────────────

describe('deleteDaily', () => {
  it('removes daily and its schedule', () => {
    const store = makeStore();
    store.getState().addDaily(makeDaily({ id: 'd1' }));
    store.getState().addDaily(makeDaily({ id: 'd2', gridPosition: 1 }));
    store.getState().deleteDaily('d1');

    const { dailies, schedules } = store.getState();
    expect(dailies).toHaveLength(1);
    expect(dailies[0].id).toBe('d2');
    expect(schedules['d1']).toBeUndefined();
  });

  it('renumbers gridPosition after deletion', () => {
    const store = makeStore();
    store.getState().addDaily(makeDaily({ id: 'd1', gridPosition: 0 }));
    store.getState().addDaily(makeDaily({ id: 'd2', gridPosition: 1 }));
    store.getState().addDaily(makeDaily({ id: 'd3', gridPosition: 2 }));
    store.getState().deleteDaily('d2');

    const positions = store.getState().dailies.map((d) => d.gridPosition);
    expect(positions).toEqual([0, 1]);
  });
});

// ─── reorderDailies ──────────────────────────────────────────────────────────

describe('reorderDailies', () => {
  it('updates gridPosition for all dailies', () => {
    const store = makeStore();
    store.getState().addDaily(makeDaily({ id: 'd1', gridPosition: 0 }));
    store.getState().addDaily(makeDaily({ id: 'd2', gridPosition: 1 }));
    store.getState().addDaily(makeDaily({ id: 'd3', gridPosition: 2 }));

    store.getState().reorderDailies(['d3', 'd1', 'd2']);

    const { dailies } = store.getState();
    const d1 = dailies.find((d) => d.id === 'd1')!;
    const d2 = dailies.find((d) => d.id === 'd2')!;
    const d3 = dailies.find((d) => d.id === 'd3')!;
    expect(d3.gridPosition).toBe(0);
    expect(d1.gridPosition).toBe(1);
    expect(d2.gridPosition).toBe(2);
  });
});

// ─── toggleTask ──────────────────────────────────────────────────────────────

describe('toggleTask', () => {
  it('marks task complete', () => {
    const store = makeStore();
    store.getState().addDaily(makeDaily({ id: 'd1' }));
    const taskId = store.getState().schedules['d1'].scheduledTaskIds[0];

    store.getState().toggleTask('d1', taskId);
    expect(store.getState().schedules['d1'].completedTaskIds).toContain(taskId);
  });

  it('unmarks task if already complete', () => {
    const store = makeStore();
    store.getState().addDaily(makeDaily({ id: 'd1' }));
    const taskId = store.getState().schedules['d1'].scheduledTaskIds[0];

    store.getState().toggleTask('d1', taskId);
    store.getState().toggleTask('d1', taskId);
    expect(store.getState().schedules['d1'].completedTaskIds).not.toContain(taskId);
  });

  it('no-ops for task not in today schedule', () => {
    const store = makeStore();
    store.getState().addDaily(makeDaily({ id: 'd1' }));
    store.getState().toggleTask('d1', 'nonexistent');
    expect(store.getState().schedules['d1'].completedTaskIds).toHaveLength(0);
  });
});

// ─── markAllDone ─────────────────────────────────────────────────────────────

describe('markAllDone', () => {
  it('marks all scheduled tasks complete', () => {
    const store = makeStore();
    store.getState().addDaily(makeDaily({ id: 'd1' }));
    store.getState().markAllDone('d1');

    const { schedules } = store.getState();
    const { scheduledTaskIds, completedTaskIds } = schedules['d1'];
    expect(completedTaskIds).toEqual(scheduledTaskIds);
  });

  it('records only newly-completed tasks in batchCompletedIds (not already-done ones)', () => {
    const store = makeStore();
    store.getState().addDaily(makeDaily({ id: 'd1' }));
    // manually complete one task first
    const scheduled = store.getState().schedules['d1'].scheduledTaskIds;
    store.getState().toggleTask('d1', scheduled[0]);
    store.getState().markAllDone('d1');

    const { batchCompletedIds } = store.getState().schedules['d1'];
    expect(batchCompletedIds).toBeDefined();
    expect(batchCompletedIds).not.toContain(scheduled[0]); // already done — not in batch
    expect(batchCompletedIds).toContain(scheduled[1]);     // newly done — in batch
  });
});

// ─── unmarkBatchDone ─────────────────────────────────────────────────────────

describe('unmarkBatchDone', () => {
  it('removes only batch-completed tasks, preserves manually-completed ones', () => {
    const store = makeStore();
    store.getState().addDaily(makeDaily({ id: 'd1' }));
    const scheduled = store.getState().schedules['d1'].scheduledTaskIds;
    store.getState().toggleTask('d1', scheduled[0]); // manually complete first
    store.getState().markAllDone('d1');               // batch-complete the rest
    store.getState().unmarkBatchDone('d1');           // undo batch

    const { completedTaskIds } = store.getState().schedules['d1'];
    expect(completedTaskIds).toContain(scheduled[0]);    // manual stays
    expect(completedTaskIds).not.toContain(scheduled[1]); // batch removed
  });

  it('clears batchCompletedIds after unmark', () => {
    const store = makeStore();
    store.getState().addDaily(makeDaily({ id: 'd1' }));
    store.getState().markAllDone('d1');
    store.getState().unmarkBatchDone('d1');

    const { batchCompletedIds } = store.getState().schedules['d1'];
    expect(batchCompletedIds ?? []).toHaveLength(0);
  });
});

// ─── tickNewDay ──────────────────────────────────────────────────────────────

describe('tickNewDay', () => {
  it('no-ops when schedule is already for today', () => {
    const store = makeStore();
    store.getState().addDaily(makeDaily({ id: 'd1' }));
    const before = store.getState().schedules['d1'];

    store.getState().tickNewDay('d1');
    expect(store.getState().schedules['d1']).toBe(before); // same reference
  });

  it('recomputes schedule when date is stale', () => {
    const store = makeStore();
    store.getState().addDaily(makeDaily({ id: 'd1' }));

    // Simulate yesterday's schedule: A completed, B not
    store.setState((s) => ({
      schedules: {
        ...s.schedules,
        d1: {
          ...s.schedules['d1'],
          scheduledDate: '2000-01-01',
          scheduledTaskIds: ['A', 'B'],
          completedTaskIds: ['A'],
          sequentialIndex: 2,
        },
      },
    }));

    store.getState().tickNewDay('d1');

    const schedule = store.getState().schedules['d1'];
    expect(schedule.scheduledDate).toBe(getTodayDate());
    // B carried over, C is next sequential
    expect(schedule.scheduledTaskIds).toContain('B');
    expect(schedule.scheduledTaskIds).toContain('C');
  });
});

// ─── updateDaily + reconcileSchedule ─────────────────────────────────────────

describe('updateDaily', () => {
  it('updates daily config', () => {
    const store = makeStore();
    store.getState().addDaily(makeDaily({ id: 'd1', name: 'Old' }));
    store.getState().updateDaily('d1', makeDaily({ id: 'd1', name: 'New' }));
    expect(store.getState().dailies[0].name).toBe('New');
  });

  it('reconciles schedule when priority changes drop eligible tasks', () => {
    const store = makeStore();
    // A,B,C all priority 1
    store.getState().addDaily(makeDaily({ id: 'd1', tasks: ['A', 'B', 'C'].map(makeTask) }));

    // Elevate C to priority 2 — only C should be eligible now
    const updated = makeDaily({
      id: 'd1',
      tasks: [
        makeTask('A', { priority: 1 }),
        makeTask('B', { priority: 1 }),
        makeTask('C', { priority: 2 }),
      ],
    });
    store.getState().updateDaily('d1', updated);

    const { scheduledTaskIds } = store.getState().schedules['d1'];
    expect(scheduledTaskIds).not.toContain('A');
    expect(scheduledTaskIds).not.toContain('B');
    expect(scheduledTaskIds).toContain('C');
  });
});
