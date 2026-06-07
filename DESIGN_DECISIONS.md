# Design Decisions

## Phase 1

### Priority filtering uses max-of-active, not max-of-all
`getEligibleTasks` computes max priority only from **active** tasks. An inactive high-priority task does not shadow lower-priority active tasks. This means deactivating a high-priority task can promote lower-priority tasks into eligibility.

### Random pool is pre-shuffled once, picks from front
The pool is shuffled using Fisher-Yates when created/refreshed. Subsequent picks just slice from the front. This avoids repeated shuffling while preserving uniform random distribution across a cycle.

### `cyclePickedIds` distinguishes fresh picks from old-cycle carries
Without extra state, completed tasks look identical whether they were (a) picked fresh from the current cycle's pool or (b) carried from the old cycle and completed. Only case (b) should rejoin the pool immediately — case (a) is done for the cycle.

`cyclePickedIds` accumulates task IDs picked as **fresh slots** (from pool, not as carries) in the current cycle. Resets when the pool refreshes (new cycle starts). **Completed carries** = `prevCompleted - cyclePickedIds` → these are injected back into the remaining pool so they're available before the cycle resets. This enables the specified behavior: as soon as a carry completes, it becomes eligible for the current cycle (not just the next one).

`cyclePickedIds` only needs to track `...picked` (fresh slots today). It does NOT need to include completed carries or newly-eligible tasks — those can't appear in `prevCompleted` before being freshly scheduled, which naturally adds them via `...picked` first.

### Carried tasks are always excluded from pool (invariant: `pool ∩ scheduledTaskIds = ∅`)
A task picked from the pool enters `scheduledTaskIds` and leaves the pool. Carried tasks are always from `scheduledTaskIds`, so they can never appear in the pool simultaneously. This prevents a carried E from being duplicated on the same day. The pool filter enforces this defensively at every compute step — on both pool refresh AND when reading the existing pool. When a cycle resets (pool empty), the fresh pool is all eligible tasks **except currently-carried ones**; carried tasks re-enter the pool only after they are completed.

### `sequentialIndex` is remapped on task list changes via `adjustSequentialIndex`
The index is stored modulo eligible-task-count for safe array access. When `reconcileSchedule` runs after a config edit, `adjustSequentialIndex(oldEligible, newEligible, oldIndex)` remaps the index to preserve rotation progress:
1. Find the task that was "next" in the old list.
2. If it still exists in the new list, point to it directly.
3. If it was removed, walk forward in the old list to find the first surviving task in the new list.
4. If nothing survives at or after the old position, wrap to 0.

This means: tasks already completed this cycle are not revisited; today's assigned tasks remain if not deleted; the rotation continues from the closest surviving position.

### Random pool preserves cycle progress across edits
`reconcileSchedule` receives the old eligible task list (`prevEligibleTasks`). Tasks removed from eligibility are stripped from the pool. Tasks newly added to eligibility are shuffled into the remaining pool so they appear before the cycle resets — they don't wait until the next full cycle.

### `DailySchedule` is separate from `Daily`
Config edits (name, task list, ordering, tasksPerDay) do not reset the schedule automatically. Only `reconcileSchedule` adjusts the in-flight schedule when eligibility changes. This prevents accidental schedule resets from cosmetic edits like renaming a daily.

### `tasksPerDay` is capped at `eligibleTasks.length`
No duplicates, no blank slots. If the user configures more tasks per day than exist, all eligible tasks are shown and the rotation resets each day (all tasks are always scheduled).

### Tailwind v4 via `@tailwindcss/vite` (not `@astrojs/tailwind`)
`@astrojs/tailwind` is the legacy v3 adapter. Tailwind v4 uses a Vite plugin directly. Added as `vite.plugins` in `astro.config.mjs`.
