export interface Task {
  id: string;
  name: string;
  active: boolean;
  /** Only highest-priority active tasks are eligible for scheduling. Default: 1. */
  priority: number;
}

export interface Daily {
  id: string;
  name: string;
  tasksPerDay: number;
  ordering: 'sequential' | 'random';
  tasks: Task[];
  /** Card order in the grid (0-indexed). */
  gridPosition: number;
}

export interface DailySchedule {
  dailyId: string;
  /** YYYY-MM-DD */
  scheduledDate: string;
  /** Task IDs scheduled for today (carried-over + new slots). */
  scheduledTaskIds: string[];
  /** Subset of scheduledTaskIds the user has checked off today. */
  completedTaskIds: string[];
  /** Sequential mode: index into eligible tasks array for next new-slot pick. */
  sequentialIndex: number;
  /** Random mode: task IDs remaining in current cycle pool (excludes carried-over). */
  randomPool: string[];
  /**
   * Random mode: task IDs picked as FRESH slots (from the pool, not as carry-overs) in the current cycle.
   * Resets when the cycle pool refreshes. Used to detect "completed carries" that should rejoin the pool.
   */
  cyclePickedIds: string[];
  /** Task IDs that were completed via the "mark all done" card click (not manually checked). Used to undo the batch. */
  batchCompletedIds?: string[];
}

export interface AppState {
  dailies: Daily[];
  schedules: Record<string, DailySchedule>;
}
