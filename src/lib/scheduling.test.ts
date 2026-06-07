import { describe, it, expect } from 'vitest';
import type { Daily, DailySchedule, Task } from '../types';
import {
  getEligibleTasks,
  computeNewSchedule,
  reconcileSchedule,
  adjustSequentialIndex,
  getTodayDate,
  isNewDay,
} from './scheduling';

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
    tasks: [],
    gridPosition: 0,
    ...overrides,
  };
}

function makeSchedule(overrides: Partial<DailySchedule> = {}): DailySchedule {
  return {
    dailyId: 'd1',
    scheduledDate: '2026-01-01',
    scheduledTaskIds: [],
    completedTaskIds: [],
    sequentialIndex: 0,
    randomPool: [],
    cyclePickedIds: [],
    ...overrides,
  };
}

// ─── getEligibleTasks ─────────────────────────────────────────────────────────

describe('getEligibleTasks', () => {
  it('returns empty array when no tasks', () => {
    expect(getEligibleTasks(makeDaily())).toEqual([]);
  });

  it('returns only highest-priority active tasks', () => {
    const daily = makeDaily({
      tasks: [
        makeTask('A', { priority: 1 }),
        makeTask('B', { priority: 2 }),
        makeTask('C', { priority: 2 }),
        makeTask('D', { priority: 1 }),
      ],
    });
    const eligible = getEligibleTasks(daily);
    expect(eligible.map((t) => t.id)).toEqual(['B', 'C']);
  });

  it('ignores inactive tasks when computing max priority', () => {
    const daily = makeDaily({
      tasks: [
        makeTask('A', { priority: 3, active: false }),
        makeTask('B', { priority: 2 }),
        makeTask('C', { priority: 1 }),
      ],
    });
    const eligible = getEligibleTasks(daily);
    expect(eligible.map((t) => t.id)).toEqual(['B']);
  });

  it('returns all tasks when all have equal priority', () => {
    const daily = makeDaily({
      tasks: [makeTask('A'), makeTask('B'), makeTask('C')],
    });
    expect(getEligibleTasks(daily)).toHaveLength(3);
  });

  it('excludes inactive tasks', () => {
    const daily = makeDaily({
      tasks: [makeTask('A'), makeTask('B', { active: false }), makeTask('C')],
    });
    const eligible = getEligibleTasks(daily);
    expect(eligible.map((t) => t.id)).toEqual(['A', 'C']);
  });
});

// ─── isNewDay / getTodayDate ──────────────────────────────────────────────────

describe('isNewDay', () => {
  it('returns true when no previous schedule', () => {
    expect(isNewDay(null)).toBe(true);
  });

  it('returns true when scheduledDate differs from today', () => {
    expect(isNewDay(makeSchedule({ scheduledDate: '2000-01-01' }))).toBe(true);
  });

  it('returns false when scheduledDate matches today', () => {
    expect(isNewDay(makeSchedule({ scheduledDate: getTodayDate() }))).toBe(false);
  });
});

// ─── computeNewSchedule — sequential ─────────────────────────────────────────

describe('computeNewSchedule — sequential', () => {
  const tasks = ['A', 'B', 'C', 'D', 'E'].map((id) => makeTask(id));

  const daily = makeDaily({
    ordering: 'sequential',
    tasksPerDay: 2,
    tasks,
  });

  it('first schedule (no previous): picks A, B', () => {
    const s = computeNewSchedule(daily, null);
    expect(s.scheduledTaskIds).toEqual(['A', 'B']);
    expect(s.completedTaskIds).toEqual([]);
    expect(s.sequentialIndex).toBe(2);
  });

  it('Day2: complete A+B → shows C, D', () => {
    const prev = makeSchedule({
      scheduledTaskIds: ['A', 'B'],
      completedTaskIds: ['A', 'B'],
      sequentialIndex: 2,
    });
    const s = computeNewSchedule(daily, prev);
    expect(s.scheduledTaskIds).toEqual(['C', 'D']);
    expect(s.sequentialIndex).toBe(4);
  });

  it('Day3: complete only C → shows D (carried) + E', () => {
    const prev = makeSchedule({
      scheduledTaskIds: ['C', 'D'],
      completedTaskIds: ['C'],
      sequentialIndex: 4,
    });
    const s = computeNewSchedule(daily, prev);
    expect(s.scheduledTaskIds).toEqual(['D', 'E']);
    expect(s.sequentialIndex).toBe(0); // 5 % 5 = 0, wraps to A next
  });

  it('Day4: complete only E → shows D (carried) + A (wrap)', () => {
    const prev = makeSchedule({
      scheduledTaskIds: ['D', 'E'],
      completedTaskIds: ['E'],
      sequentialIndex: 5,
    });
    const s = computeNewSchedule(daily, prev);
    expect(s.scheduledTaskIds).toEqual(['D', 'A']);
    expect(s.sequentialIndex).toBe(1);
  });

  it('caps at eligible tasks when tasksPerDay > eligible count', () => {
    const smallDaily = makeDaily({
      ordering: 'sequential',
      tasksPerDay: 10,
      tasks: [makeTask('X'), makeTask('Y')],
    });
    const s = computeNewSchedule(smallDaily, null);
    expect(s.scheduledTaskIds).toHaveLength(2);
    expect(s.scheduledTaskIds).toContain('X');
    expect(s.scheduledTaskIds).toContain('Y');
  });

  it('returns empty schedule when no eligible tasks', () => {
    const emptyDaily = makeDaily({
      ordering: 'sequential',
      tasks: [makeTask('A', { active: false })],
    });
    const s = computeNewSchedule(emptyDaily, null);
    expect(s.scheduledTaskIds).toEqual([]);
  });
});

// ─── computeNewSchedule — random ─────────────────────────────────────────────

describe('computeNewSchedule — random', () => {
  const tasks = ['A', 'B', 'C', 'D', 'E'].map((id) => makeTask(id));

  const daily = makeDaily({
    ordering: 'random',
    tasksPerDay: 2,
    tasks,
  });

  it('first schedule: picks 2 distinct tasks from pool', () => {
    const s = computeNewSchedule(daily, null);
    expect(s.scheduledTaskIds).toHaveLength(2);
    expect(new Set(s.scheduledTaskIds).size).toBe(2);
    // remaining pool has 3 tasks
    expect(s.randomPool).toHaveLength(3);
    // picked tasks not in pool
    for (const id of s.scheduledTaskIds) {
      expect(s.randomPool).not.toContain(id);
    }
  });

  it('Day2: complete both → picks 2 from remaining pool', () => {
    // Day1 scheduled D, B (both fresh picks). Pool remaining = {A,C,E}.
    const prev = makeSchedule({
      scheduledTaskIds: ['D', 'B'],
      completedTaskIds: ['D', 'B'],
      randomPool: ['A', 'C', 'E'],
      cyclePickedIds: ['D', 'B'], // D and B were fresh picks
    });
    const s = computeNewSchedule(daily, prev);
    expect(s.scheduledTaskIds).toHaveLength(2);
    // must be from remaining pool {A,C,E}
    for (const id of s.scheduledTaskIds) {
      expect(['A', 'C', 'E']).toContain(id);
    }
  });

  it('Day3: complete only 1 of 2 → carryover + 1 from pool', () => {
    // Day2 scheduled A (fresh pick), C (fresh pick); completed only A. Pool = {E}.
    const prev = makeSchedule({
      scheduledTaskIds: ['A', 'C'],
      completedTaskIds: ['A'],
      randomPool: ['E'],
      cyclePickedIds: ['D', 'B', 'A', 'C'], // accumulated fresh picks this cycle
    });
    const s = computeNewSchedule(daily, prev);
    expect(s.scheduledTaskIds).toContain('C'); // carried
    expect(s.scheduledTaskIds).toContain('E'); // from pool
    expect(s.randomPool).toHaveLength(0);
  });

  it('Day4: pool empty → refresh pool excluding carried, then pick', () => {
    // Day3 scheduled C, E; completed only E. Pool = {} (exhausted).
    // C is carried. Refresh pool = {A,B,D} (all active except C).
    // Need 1 slot (C carried + 1 = 2). Pick from refreshed pool.
    const prev = makeSchedule({
      scheduledTaskIds: ['C', 'E'],
      completedTaskIds: ['E'],
      randomPool: [],
    });
    const s = computeNewSchedule(daily, prev);
    expect(s.scheduledTaskIds).toContain('C'); // carried
    expect(s.scheduledTaskIds).toHaveLength(2);
    const newPick = s.scheduledTaskIds.find((id) => id !== 'C')!;
    // Spec: fresh pool = all tasks except currently-carried C → {A,B,D,E} all valid
    expect(['A', 'B', 'D', 'E']).toContain(newPick);
  });

  it('refreshed pool does not include currently carried task', () => {
    const prev = makeSchedule({
      scheduledTaskIds: ['C', 'E'],
      completedTaskIds: ['E'],
      randomPool: [],
    });
    const s = computeNewSchedule(daily, prev);
    // C should NOT appear in the remaining pool either
    expect(s.randomPool).not.toContain('C');
  });

  it('never duplicates a carried task even if it appears in the pool (defensive)', () => {
    // Simulates corrupted state where E is both carried AND in the pool.
    // The scheduler must strip it from the pool before picking.
    const prev = makeSchedule({
      scheduledTaskIds: ['E'],     // E was scheduled
      completedTaskIds: [],        // E not completed → E is carried
      randomPool: ['E', 'A', 'B'], // E also somehow in pool (invariant violation)
    });
    const s = computeNewSchedule(daily, prev);
    const eCount = s.scheduledTaskIds.filter((id) => id === 'E').length;
    expect(eCount).toBe(1); // E appears exactly once
  });

  it('excludes carried task from pool refresh when pool is exhausted', () => {
    // E carried, pool empty → refresh must exclude E
    const prev = makeSchedule({
      scheduledTaskIds: ['E'],
      completedTaskIds: [],
      randomPool: [],
    });
    const s = computeNewSchedule(daily, prev);
    // E must be carried, not duplicated
    expect(s.scheduledTaskIds).toContain('E');
    const eCount = s.scheduledTaskIds.filter((id) => id === 'E').length;
    expect(eCount).toBe(1);
    // The new pick must come from {A,B,C,D}, not E
    const newPick = s.scheduledTaskIds.find((id) => id !== 'E')!;
    expect(['A', 'B', 'C', 'D']).toContain(newPick);
  });

  it('strips stale task IDs from randomPool when tasks change', () => {
    const prev = makeSchedule({
      scheduledTaskIds: ['A'],
      completedTaskIds: ['A'],
      randomPool: ['Z', 'B', 'C'],
    });
    const s = computeNewSchedule(daily, prev);
    expect(s.randomPool).not.toContain('Z');
  });

  // ── completed carry rejoins pool ─────────────────────────────────────────

  it('completed carry rejoins pool for current cycle (not fresh-pick carry)', () => {
    // Scenario from spec: C was carried from old cycle. New cycle has pool [A, D].
    // Day N: scheduled [C (carry), B (fresh pick)], pool = [A, D], complete only C.
    // Day N+1: C completed its carry obligation → C should rejoin pool.
    const prev = makeSchedule({
      scheduledTaskIds: ['C', 'B'],
      completedTaskIds: ['C'],      // C completed, B not
      randomPool: ['A', 'D'],       // B was the fresh pick, not C
      cyclePickedIds: ['B'],        // B was the fresh pick this cycle
    });
    const s = computeNewSchedule(daily, prev);
    // B is carried (not completed)
    expect(s.scheduledTaskIds).toContain('B');
    // C should now be in the pool or picked as today's new slot
    expect([...s.scheduledTaskIds, ...s.randomPool]).toContain('C');
  });

  it('fresh-cycle pick that completes does NOT rejoin mid-cycle pool', () => {
    // D was picked fresh from the pool (cyclePickedIds includes D) and completed.
    // D should NOT be added back to the pool — it's done for this cycle.
    const prev = makeSchedule({
      scheduledTaskIds: ['D', 'A'],
      completedTaskIds: ['D', 'A'], // both completed
      randomPool: ['B', 'C'],
      cyclePickedIds: ['D', 'A'],   // both were fresh picks this cycle
    });
    const s = computeNewSchedule(daily, prev);
    // D and A should NOT be injected back into pool mid-cycle
    expect(s.randomPool).not.toContain('D');
    expect(s.randomPool).not.toContain('A');
  });

  it('cyclePickedIds resets when pool refreshes (new cycle)', () => {
    // Pool exhausted, cycle resets. cyclePickedIds should start fresh.
    const prev = makeSchedule({
      scheduledTaskIds: ['A', 'B'],
      completedTaskIds: ['A', 'B'],
      randomPool: [],
      cyclePickedIds: ['C', 'D', 'E', 'A', 'B'], // full cycle done
    });
    const s = computeNewSchedule(daily, prev);
    // New cycle: cyclePickedIds should only contain today's fresh picks
    expect(s.cyclePickedIds).toHaveLength(2);
    // Should not carry over the old cycle picks
    expect(s.cyclePickedIds).not.toContain('C');
  });
});

// ─── priority filtering in scheduling ────────────────────────────────────────

describe('priority filtering in scheduling', () => {
  it('sequential: only schedules highest-priority active tasks', () => {
    const daily = makeDaily({
      ordering: 'sequential',
      tasksPerDay: 2,
      tasks: [
        makeTask('Low1', { priority: 1 }),
        makeTask('High1', { priority: 3 }),
        makeTask('High2', { priority: 3 }),
        makeTask('Low2', { priority: 1 }),
      ],
    });
    const s = computeNewSchedule(daily, null);
    expect(s.scheduledTaskIds).toEqual(['High1', 'High2']);
    expect(s.scheduledTaskIds).not.toContain('Low1');
    expect(s.scheduledTaskIds).not.toContain('Low2');
  });

  it('random: only schedules highest-priority active tasks', () => {
    const daily = makeDaily({
      ordering: 'random',
      tasksPerDay: 2,
      tasks: [
        makeTask('Low1', { priority: 1 }),
        makeTask('High1', { priority: 2 }),
        makeTask('High2', { priority: 2 }),
      ],
    });
    const s = computeNewSchedule(daily, null);
    for (const id of s.scheduledTaskIds) {
      expect(['High1', 'High2']).toContain(id);
    }
  });
});

// ─── adjustSequentialIndex ───────────────────────────────────────────────────

describe('adjustSequentialIndex', () => {
  const A = makeTask('A');
  const B = makeTask('B');
  const C = makeTask('C');
  const D = makeTask('D');
  const E = makeTask('E');

  it('keeps same index when task list unchanged', () => {
    expect(adjustSequentialIndex([A, B, C, D, E], [A, B, C, D, E], 2)).toBe(2);
  });

  it('adjusts index when task removed before current position', () => {
    // Old: [A,B,C,D,E] index=4 (next=E). Remove D (index 3, before 4).
    // New: [A,B,C,E]. E is at index 3.
    expect(adjustSequentialIndex([A, B, C, D, E], [A, B, C, E], 4)).toBe(3);
  });

  it('advances to next surviving task when "next" task itself is removed', () => {
    // Old: [A,B,C,D,E] index=2 (next=C). Remove C.
    // New: [A,B,D,E]. Next surviving after C's position is D at index 2.
    expect(adjustSequentialIndex([A, B, C, D, E], [A, B, D, E], 2)).toBe(2);
  });

  it('wraps to 0 when all tasks at-or-after current position are removed', () => {
    // Old: [A,B,C,D,E] index=3 (next=D). Remove D and E.
    // No survivors at or after D's position → wrap to 0.
    expect(adjustSequentialIndex([A, B, C, D, E], [A, B, C], 3)).toBe(0);
  });

  it('unchanged when removed task is after current position', () => {
    // Old: [A,B,C,D,E] index=1 (next=B). Remove E (after B).
    // New: [A,B,C,D]. B still at index 1.
    expect(adjustSequentialIndex([A, B, C, D, E], [A, B, C, D], 1)).toBe(1);
  });

  it('handles empty new list', () => {
    expect(adjustSequentialIndex([A, B, C], [], 1)).toBe(0);
  });
});

// ─── reconcileSchedule ───────────────────────────────────────────────────────

describe('reconcileSchedule', () => {
  it('drops scheduled tasks that are no longer eligible after priority change', () => {
    // Before edit: A, B, D all priority 1. After edit: D elevated to priority 2.
    const prevEligible = [makeTask('A'), makeTask('B'), makeTask('D')];
    const daily = makeDaily({
      ordering: 'sequential',
      tasksPerDay: 2,
      tasks: [
        makeTask('A', { priority: 1 }),
        makeTask('B', { priority: 1 }),
        makeTask('D', { priority: 2 }),
      ],
    });
    const currentSchedule = makeSchedule({
      scheduledDate: getTodayDate(),
      scheduledTaskIds: ['A', 'B'],
      completedTaskIds: ['A'],
      sequentialIndex: 2,
    });
    const s = reconcileSchedule(daily, currentSchedule, prevEligible);
    expect(s.scheduledTaskIds).not.toContain('A');
    expect(s.scheduledTaskIds).not.toContain('B');
    expect(s.scheduledTaskIds).toContain('D');
    expect(s.scheduledDate).toBe(getTodayDate());
  });

  it('keeps completed tasks that are still eligible', () => {
    const tasks = [makeTask('A'), makeTask('B'), makeTask('C')];
    const daily = makeDaily({ ordering: 'sequential', tasksPerDay: 2, tasks });
    const currentSchedule = makeSchedule({
      scheduledDate: getTodayDate(),
      scheduledTaskIds: ['A', 'B'],
      completedTaskIds: ['A'],
      sequentialIndex: 2,
    });
    const s = reconcileSchedule(daily, currentSchedule, tasks);
    expect(s.completedTaskIds).toContain('A');
  });

  it('rebuilds random pool to only include eligible tasks', () => {
    // Before: A, C eligible (p1). After: B elevated to p2, only B eligible.
    const prevEligible = [makeTask('A'), makeTask('C')];
    const daily = makeDaily({
      ordering: 'random',
      tasksPerDay: 2,
      tasks: [
        makeTask('A', { priority: 1 }),
        makeTask('B', { priority: 2 }),
        makeTask('C', { priority: 1 }),
      ],
    });
    const currentSchedule = makeSchedule({
      scheduledDate: getTodayDate(),
      scheduledTaskIds: ['A'],
      completedTaskIds: [],
      randomPool: ['C'],
    });
    const s = reconcileSchedule(daily, currentSchedule, prevEligible);
    expect(s.randomPool).not.toContain('C');
  });

  // ── sequential: index preservation when task list shrinks ──

  it('sequential: preserves rotation progress when task removed before index', () => {
    // Old eligible: [A,B,C,D,E] index=4 (next=E). Remove D.
    // New eligible: [A,B,C,E]. E should still be next → index=3.
    const prevEligible = ['A', 'B', 'C', 'D', 'E'].map((id) => makeTask(id));
    const daily = makeDaily({
      ordering: 'sequential',
      tasksPerDay: 1,
      tasks: ['A', 'B', 'C', 'E'].map((id) => makeTask(id)), // D removed
    });
    const currentSchedule = makeSchedule({
      scheduledDate: getTodayDate(),
      scheduledTaskIds: [],
      completedTaskIds: [],
      sequentialIndex: 4,
    });
    const s = reconcileSchedule(daily, currentSchedule, prevEligible);
    // Should schedule E (not A) because index maps to E after D removed
    expect(s.scheduledTaskIds).toContain('E');
    expect(s.scheduledTaskIds).not.toContain('A');
  });

  it('sequential: today\'s already-scheduled tasks remain if not deleted', () => {
    // B is scheduled today (incomplete). User removes C (not today's task).
    // B should stay scheduled.
    const prevEligible = ['A', 'B', 'C', 'D'].map((id) => makeTask(id));
    const daily = makeDaily({
      ordering: 'sequential',
      tasksPerDay: 2,
      tasks: ['A', 'B', 'D'].map((id) => makeTask(id)), // C removed
    });
    const currentSchedule = makeSchedule({
      scheduledDate: getTodayDate(),
      scheduledTaskIds: ['A', 'B'],
      completedTaskIds: ['A'],
      sequentialIndex: 2,
    });
    const s = reconcileSchedule(daily, currentSchedule, prevEligible);
    expect(s.scheduledTaskIds).toContain('B'); // still assigned
    expect(s.completedTaskIds).toContain('A'); // still done
  });

  it('sequential: completed tasks not rescheduled after task removal', () => {
    // A was completed today. Even after list shrinks, A should not reappear as new slot.
    const prevEligible = ['A', 'B', 'C'].map((id) => makeTask(id));
    const daily = makeDaily({
      ordering: 'sequential',
      tasksPerDay: 2,
      tasks: ['A', 'B'].map((id) => makeTask(id)), // C removed
    });
    const currentSchedule = makeSchedule({
      scheduledDate: getTodayDate(),
      scheduledTaskIds: ['A', 'B'],
      completedTaskIds: ['A', 'B'],
      sequentialIndex: 2,
    });
    const s = reconcileSchedule(daily, currentSchedule, prevEligible);
    // A and B already scheduled+completed; no new slots needed (tasksPerDay=2, 2 already scheduled)
    expect(s.scheduledTaskIds).toHaveLength(2);
  });

  // ── random: newly-eligible tasks join pool ──

  it('random: newly-eligible task added to pool when task activated', () => {
    // Before: only A and B eligible. After: C activated (newly eligible).
    // C should join the remaining pool.
    const prevEligible = [makeTask('A'), makeTask('B')];
    const daily = makeDaily({
      ordering: 'random',
      tasksPerDay: 2,
      tasks: [makeTask('A'), makeTask('B'), makeTask('C')],
    });
    const currentSchedule = makeSchedule({
      scheduledDate: getTodayDate(),
      scheduledTaskIds: ['A'],
      completedTaskIds: ['A'],
      randomPool: ['B'],
    });
    const s = reconcileSchedule(daily, currentSchedule, prevEligible);
    // C newly eligible and not yet scheduled → joins pool
    expect([...s.randomPool, ...s.scheduledTaskIds]).toContain('C');
  });

  it('random: newly-eligible task not added if already scheduled today', () => {
    // C becomes eligible but is already in today's schedule
    const prevEligible = [makeTask('A'), makeTask('B')];
    const daily = makeDaily({
      ordering: 'random',
      tasksPerDay: 2,
      tasks: [makeTask('A'), makeTask('B'), makeTask('C')],
    });
    const currentSchedule = makeSchedule({
      scheduledDate: getTodayDate(),
      scheduledTaskIds: ['A', 'C'],
      completedTaskIds: [],
      randomPool: ['B'],
    });
    const s = reconcileSchedule(daily, currentSchedule, prevEligible);
    // C should not be double-added to pool
    expect(s.randomPool.filter((id) => id === 'C')).toHaveLength(0);
  });
});
