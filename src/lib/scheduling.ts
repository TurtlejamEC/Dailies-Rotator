import type { Daily, DailySchedule, Task } from '../types';

export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isNewDay(schedule: DailySchedule | null): boolean {
  if (!schedule) return true;
  return schedule.scheduledDate !== getTodayDate();
}

/** Returns only the highest-priority active tasks. */
export function getEligibleTasks(daily: Daily): Task[] {
  const active = daily.tasks.filter((t) => t.active);
  if (active.length === 0) return [];
  const maxPriority = Math.max(...active.map((t) => t.priority));
  return active.filter((t) => t.priority === maxPriority);
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function advanceSequential(
  eligibleTasks: Task[],
  startIdx: number,
  excludeIds: string[],
  slotsNeeded: number,
): { newIds: string[]; nextIndex: number } {
  if (eligibleTasks.length === 0) return { newIds: [], nextIndex: 0 };

  const newIds: string[] = [];
  let idx = startIdx;
  let safety = 0;

  while (newIds.length < slotsNeeded && safety < eligibleTasks.length) {
    const task = eligibleTasks[idx % eligibleTasks.length];
    if (!excludeIds.includes(task.id)) {
      newIds.push(task.id);
    }
    idx++;
    safety++;
  }

  return { newIds, nextIndex: idx % eligibleTasks.length };
}

/**
 * Remaps sequentialIndex from the old eligible list to the new eligible list.
 * Finds the task that was "next" and locates it (or the closest successor) in the new list.
 */
export function adjustSequentialIndex(
  oldEligible: Task[],
  newEligible: Task[],
  oldIndex: number,
): number {
  if (newEligible.length === 0) return 0;
  if (oldEligible.length === 0) return 0;

  const wrappedOld = oldIndex % oldEligible.length;
  const nextOldTask = oldEligible[wrappedOld];

  const directMatch = newEligible.findIndex((t) => t.id === nextOldTask.id);
  if (directMatch !== -1) return directMatch;

  // Walk forward in old list to find first surviving task
  for (let i = wrappedOld + 1; i < oldEligible.length; i++) {
    const idx = newEligible.findIndex((t) => t.id === oldEligible[i].id);
    if (idx !== -1) return idx;
  }

  return 0;
}

export function computeNewSchedule(
  daily: Daily,
  prevSchedule: DailySchedule | null,
): DailySchedule {
  const today = getTodayDate();
  const eligibleTasks = getEligibleTasks(daily);
  const eligibleIds = eligibleTasks.map((t) => t.id);

  const carriedIds: string[] = prevSchedule
    ? prevSchedule.scheduledTaskIds.filter(
        (id) =>
          !prevSchedule.completedTaskIds.includes(id) &&
          eligibleIds.includes(id),
      )
    : [];

  const maxSchedulable = eligibleTasks.length;
  const effectiveTasksPerDay = Math.min(daily.tasksPerDay, maxSchedulable);
  const slotsNeeded = Math.max(0, effectiveTasksPerDay - carriedIds.length);

  if (daily.ordering === 'sequential') {
    const startIdx = prevSchedule?.sequentialIndex ?? 0;
    const { newIds, nextIndex } = advanceSequential(
      eligibleTasks,
      startIdx,
      carriedIds,
      slotsNeeded,
    );
    return {
      dailyId: daily.id,
      scheduledDate: today,
      scheduledTaskIds: [...carriedIds, ...newIds],
      completedTaskIds: [],
      sequentialIndex: nextIndex,
      randomPool: [],
      cyclePickedIds: [],
    };
  } else {
    const prevCyclePickedIds = prevSchedule?.cyclePickedIds ?? [];

    // Completed carries: tasks completed yesterday that were carries (not fresh picks this cycle).
    // Once a carry completes, it rejoins the pool for the current cycle immediately.
    const completedCarries = prevSchedule
      ? eligibleIds.filter(
          (id) =>
            prevSchedule.completedTaskIds.includes(id) &&
            !prevCyclePickedIds.includes(id) &&
            !carriedIds.includes(id),
        )
      : [];

    // Strip stale IDs and any carried IDs (defensive invariant)
    let pool = (prevSchedule?.randomPool ?? []).filter(
      (id) => eligibleIds.includes(id) && !carriedIds.includes(id),
    );

    // Inject completed carries into the current cycle's pool
    if (completedCarries.length > 0) {
      pool = shuffleArray([...pool, ...completedCarries]);
    }

    // Track whether a pool refresh happens (new cycle)
    let cycleReset = false;
    if (pool.length === 0 && slotsNeeded > 0) {
      pool = shuffleArray(eligibleIds.filter((id) => !carriedIds.includes(id)));
      cycleReset = true;
    }

    const picked = pool.slice(0, slotsNeeded);
    const remaining = pool.slice(slotsNeeded);

    // cyclePickedIds resets on a new cycle; otherwise accumulates fresh picks only
    const newCyclePickedIds = cycleReset
      ? [...picked]
      : [...prevCyclePickedIds, ...picked];

    return {
      dailyId: daily.id,
      scheduledDate: today,
      scheduledTaskIds: [...carriedIds, ...picked],
      completedTaskIds: [],
      sequentialIndex: prevSchedule?.sequentialIndex ?? 0,
      randomPool: remaining,
      cyclePickedIds: newCyclePickedIds,
    };
  }
}

/**
 * Called after editing a daily's config.
 * - Drops tasks no longer eligible; fills vacated slots
 * - Sequential: remaps index to preserve rotation progress
 * - Random: injects newly-eligible tasks into pool; filters cyclePickedIds
 */
export function reconcileSchedule(
  daily: Daily,
  currentSchedule: DailySchedule,
  prevEligibleTasks: Task[],
): DailySchedule {
  const eligibleTasks = getEligibleTasks(daily);
  const eligibleIds = eligibleTasks.map((t) => t.id);
  const prevEligibleIds = prevEligibleTasks.map((t) => t.id);

  const newScheduled = currentSchedule.scheduledTaskIds.filter((id) =>
    eligibleIds.includes(id),
  );
  const newCompleted = currentSchedule.completedTaskIds.filter((id) =>
    eligibleIds.includes(id),
  );

  const maxSchedulable = eligibleTasks.length;
  const effectiveTasksPerDay = Math.min(daily.tasksPerDay, maxSchedulable);
  const slotsNeeded = Math.max(0, effectiveTasksPerDay - newScheduled.length);

  if (daily.ordering === 'sequential') {
    const adjustedIndex = adjustSequentialIndex(
      prevEligibleTasks,
      eligibleTasks,
      currentSchedule.sequentialIndex,
    );
    const { newIds, nextIndex } = advanceSequential(
      eligibleTasks,
      adjustedIndex,
      newScheduled,
      slotsNeeded,
    );
    return {
      ...currentSchedule,
      scheduledTaskIds: [...newScheduled, ...newIds],
      completedTaskIds: newCompleted,
      sequentialIndex: nextIndex,
      randomPool: [],
      cyclePickedIds: [],
    };
  } else {
    // Strip ineligible IDs; also strip already-scheduled (defensive)
    let pool = currentSchedule.randomPool.filter(
      (id) => eligibleIds.includes(id) && !newScheduled.includes(id),
    );

    // Inject newly-eligible tasks (weren't eligible before → not yet in pool or scheduled this cycle)
    const newlyEligible = eligibleIds.filter(
      (id) =>
        !prevEligibleIds.includes(id) &&
        !newScheduled.includes(id) &&
        !newCompleted.includes(id) &&
        !pool.includes(id),
    );
    if (newlyEligible.length > 0) {
      pool = shuffleArray([...pool, ...newlyEligible]);
    }

    if (pool.length === 0 && slotsNeeded > 0) {
      const carriedIds = newScheduled.filter((id) => !newCompleted.includes(id));
      pool = shuffleArray(
        eligibleIds.filter(
          (id) => !carriedIds.includes(id) && !newCompleted.includes(id),
        ),
      );
    }

    const picked = pool.slice(0, slotsNeeded);
    const remaining = pool.slice(slotsNeeded);

    const newCyclePickedIds = [
      ...currentSchedule.cyclePickedIds.filter((id) => eligibleIds.includes(id)),
      ...picked,
    ];

    return {
      ...currentSchedule,
      scheduledTaskIds: [...newScheduled, ...picked],
      completedTaskIds: newCompleted,
      randomPool: remaining,
      cyclePickedIds: newCyclePickedIds,
    };
  }
}
