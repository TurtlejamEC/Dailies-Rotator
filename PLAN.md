# Dailies Rotator — Implementation Plan

## Context

Greenfield build on bare Astro 6.4.4. User wants a browser-persisted daily task manager: a grid of "dailies" (recurring task sets), each scheduling a configurable number of tasks per day using sequential or random rotation with carry-over logic.

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| UI framework | React via `@astrojs/react` | @dnd-kit and Radix UI are React-native |
| Drag-and-drop | `@dnd-kit/sortable` | Covers both card grid and task list; rbd deprecated |
| State | Zustand + `persist` middleware | localStorage sync zero-boilerplate; context awkward with async scheduling |
| Styling | Tailwind v4 via `@tailwindcss/vite` | Fast iteration; `data-[state=open]` dialog animations |
| Dialog | `@radix-ui/react-dialog` | Focus trap, Escape, portal — all zero-config |
| Date | Native `Date` API | Only need YYYY-MM-DD string comparison |
| IDs | `nanoid` | Tiny, URL-safe unique IDs |

---

## TypeScript Data Model

```typescript
// src/types/index.ts

export interface Task {
  id: string;
  name: string;
  active: boolean;
  priority: number; // only highest-priority active tasks are scheduled; default 1
}

export interface Daily {
  id: string;
  name: string;
  tasksPerDay: number;
  ordering: 'sequential' | 'random';
  tasks: Task[];
  gridPosition: number; // card order in grid
}

export interface DailySchedule {
  dailyId: string;
  scheduledDate: string;       // YYYY-MM-DD
  scheduledTaskIds: string[];  // carried-over + new slots
  completedTaskIds: string[];
  sequentialIndex: number;     // next index to pick from (sequential mode)
  randomPool: string[];        // remaining unscheduled IDs (random mode)
}

export interface AppState {
  dailies: Daily[];
  schedules: Record<string, DailySchedule>; // keyed by dailyId
}
```

---

## File Structure

```
src/
  types/index.ts               # All interfaces
  lib/
    scheduling.ts              # Pure scheduling functions (no React)
    id.ts                      # nanoid wrapper
  store/
    useAppStore.ts             # Zustand store + persist + tickNewDay
  components/
    App.tsx                    # Root React island
    home/
      HomePage.tsx             # SortableContext grid + Add button
      DailyCard.tsx            # Card: name, checklist, edit/dup/delete buttons
      TaskCheckItem.tsx        # Individual task checkbox row
      ConfirmDeleteDialog.tsx  # Radix Dialog for delete confirmation
    config/
      ConfigDialog.tsx         # Radix Dialog wrapper
      ConfigForm.tsx           # Local draft state; name/tasksPerDay/ordering/tasks
      TaskRow.tsx              # Task row: name, active toggle, priority, DnD handle
  pages/
    index.astro                # Mounts <App client:only="react" />
```

---

## Scheduling Algorithm

### Eligible task selection (used everywhere)

```
getEligibleTasks(daily):
  activeTasks = daily.tasks.filter(t => t.active)
  if activeTasks is empty: return []
  maxPriority = max(activeTasks.map(t => t.priority))
  return activeTasks.filter(t => t.priority === maxPriority)
```

All scheduling uses `eligibleTasks` — not raw `activeTasks`. Lower-priority tasks are invisible to the scheduler regardless of active state.

### Entry point — called when `scheduledDate != today`

```
computeNewSchedule(daily, prevSchedule):
  eligibleTasks = getEligibleTasks(daily)
  carriedIds = prevSchedule
    ? prevSchedule.scheduledTaskIds - prevSchedule.completedTaskIds
    : []
  slotsNeeded = max(0, daily.tasksPerDay - carriedIds.length)

  if sequential:
    { newIds, nextIndex } = advanceSequential(eligibleTasks, prevSchedule.sequentialIndex, carriedIds, slotsNeeded)
    newPool = []

  if random:
    pool = prevSchedule.randomPool.filter(id => eligibleTasks.ids.includes(id)) // strip stale IDs
    if pool is empty:
      pool = shuffle(eligibleTasks.ids - carriedIds)
    { picked: newIds, remaining: newPool } = pool.split(slotsNeeded)
    nextIndex = prevSchedule.sequentialIndex (unchanged)

  return { scheduledDate: today, scheduledTaskIds: [...carriedIds, ...newIds],
           completedTaskIds: [], sequentialIndex: nextIndex, randomPool: newPool }
```

### Sequential advance

```
advanceSequential(eligibleTasks, startIdx, carriedIds, slotsNeeded):
  idx = startIdx; newIds = []
  while newIds.length < slotsNeeded and safety < eligibleTasks.length:
    task = eligibleTasks[idx % eligibleTasks.length]
    if task.id not in carriedIds: newIds.push(task.id)
    idx++
  return { newIds, nextIndex: idx % eligibleTasks.length }
```

### Random pool

```
refreshRandomPool(eligibleTasks, carriedIds):
  return shuffle(eligibleTasks.ids.filter(id => id not in carriedIds))

pickFromPool(pool, count):
  return { picked: pool.slice(0, count), remaining: pool.slice(count) }
```

Pool is shuffled once on creation; picks take from the front. No re-shuffle per pick.

### Edge cases

- **Sequential order**: rotation order = task list position (not priority number). Priority only filters eligibility.
- **tasksPerDay > eligible tasks**: cap scheduled count at `eligibleTasks.length`. No duplicates, no blank slots.
- **No eligible tasks** (all deactivated or none at max priority): card shows empty task list.

### Priority change reconciliation — called after any config save

When the user saves edits to a daily's task list (priority/active/name/add/remove), the eligible set may have changed. The in-flight schedule needs reconciliation before the next render:

```
reconcileSchedule(daily, currentSchedule):
  eligibleIds = getEligibleTasks(daily).map(t => t.id)

  // Drop carried-over tasks that are no longer eligible
  newScheduled = currentSchedule.scheduledTaskIds.filter(id => eligibleIds.includes(id))
  newCompleted = currentSchedule.completedTaskIds.filter(id => eligibleIds.includes(id))

  // Fill vacated slots
  carriedIds = newScheduled.filter(id => !newCompleted.includes(id))
  slotsNeeded = max(0, daily.tasksPerDay - carriedIds.length)
  // ... same fill logic as computeNewSchedule but keep scheduledDate = today

  // Rebuild random pool: strip non-eligible IDs, refresh if empty
  newPool = currentSchedule.randomPool.filter(id => eligibleIds.includes(id))
  if newPool is empty and daily.ordering === 'random':
    newPool = refreshRandomPool(getEligibleTasks(daily), carriedIds)

  return { ...newSchedule, scheduledDate: currentSchedule.scheduledDate }
```

`reconcileSchedule` is called in the store's `updateDaily` action immediately after writing the new config.

---

## localStorage Schema

Single key: `dailies-rotator-state` (managed by Zustand persist)

```json
{
  "version": 1,
  "state": {
    "dailies": [...],
    "schedules": { "dailyId": { ...DailySchedule } }
  }
}
```

Include `version: 1` + empty `migrate` function for future schema changes.

---

## Implementation Order

**Each phase: write tests first, then implement. Each phase ends with a demoable milestone. Check in with user before starting the next phase.**

Design decisions made during implementation must be documented in `DESIGN_DECISIONS.md` at the project root.

Test stack: `vitest` + `@testing-library/react` + `jsdom`.

---

**Phase 1 — Foundation + Scheduling**
1. Install all deps: `@astrojs/react react react-dom zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @radix-ui/react-dialog nanoid tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/user-event jsdom @vitest/coverage-v8`
2. Update `astro.config.mjs`: React integration + Tailwind Vite plugin; add `vitest.config.ts`
3. Write `src/types/index.ts`
4. **Write tests first** (`src/lib/scheduling.test.ts`): spec examples for sequential carry-over, random pool exhaustion + refresh, priority filtering, `reconcileSchedule`
5. Write `src/lib/id.ts` and `src/lib/scheduling.ts` until all tests pass
6. **Demo**: `pnpm test` — all scheduling unit tests green

**Phase 2 — State layer**
1. **Write tests first** (`src/store/useAppStore.test.ts`): CRUD actions, `tickNewDay`, `reconcileSchedule` on `updateDaily`, localStorage round-trip
2. Write `src/store/useAppStore.ts` (Zustand + persist)
3. Bare `App.tsx` + update `index.astro`; expose `window.__store` and `window.__simulateDay(dailyId)` in dev
4. **Demo**: `pnpm dev` → blank page; console `__store.getState().addDaily(...)` → reload → card data persists in localStorage

**Phase 3 — Home page (read + check)**
1. **Write tests first** (`DailyCard.test.tsx`, `HomePage.test.tsx`): render tasks, toggle task, mark-all-done, empty state
2. Write `HomePage.tsx`, `DailyCard.tsx`, `TaskCheckItem.tsx`; wire `toggleTask` and `markAllDone`
3. **Demo**: `pnpm dev` → grid of cards; check tasks; reload — state persists

**Phase 4 — Config dialog**
1. **Write tests first** (`ConfigForm.test.tsx`): draft state isolates from store until Save; Cancel discards; keyboard: Enter adds task, Backspace on empty removes task
2. Write `ConfigDialog.tsx`, `ConfigForm.tsx`, `TaskRow.tsx`; wire Add/Edit/Duplicate on cards
3. **Demo**: `pnpm dev` → full create/edit/duplicate flow; keyboard-only task entry; Cancel → no changes

**Phase 5 — Drag and drop**
1. **Write tests first** (store additions): `reorderDailies` updates all `gridPosition` values; task reorder in ConfigForm draft state
2. `DndContext + SortableContext` in `HomePage`; `useSortable` on `DailyCard`; `onDragEnd` → `reorderDailies`
3. `SortableContext` in `ConfigForm`; drag handles on `TaskRow`
4. **Demo**: `pnpm dev` → drag cards to reorder (order persists on reload); drag tasks in config dialog

**Phase 6 — Delete confirmation**
1. **Write tests first** (`ConfirmDeleteDialog.test.tsx`): Cancel does not call delete; Confirm calls delete
2. Write `ConfirmDeleteDialog.tsx`; wire to `DailyCard` delete button
3. **Demo**: `pnpm dev` → Delete → confirm dialog; Cancel preserves card; Confirm removes it

**Phase 7 — Polish**
1. Responsive Tailwind grid (1-col mobile → 2–3-col desktop)
2. `DragOverlay` for drag shadow
3. Done-state styling (opacity, strikethrough) on completed tasks/cards
4. Dialog open/close CSS animations via `data-[state=open]`
5. ARIA labels on icon-only buttons; `aria-labelledby` / `aria-describedby` on dialogs
6. **Demo**: Full app on mobile and desktop viewport; keyboard-only navigation works

---

## Verification

**Scheduling (manual via `simulateDay` helper):**
- Sequential: 5 tasks A–E, 2/day. Day1=A,B (complete both) → Day2=C,D (complete C) → Day3=D+E (complete E) → Day4=D+A ✓
- Random: 5 tasks, 2/day. Day1=2 random (complete both) → Day2=2 from remaining pool (complete 1) → Day3=carried+1 from remaining → pool empties → Day4=carried+1 from refreshed pool (excluding carried) ✓

**Feature checklist:**
- [ ] Create / Edit / Duplicate / Delete (with confirm) all work
- [ ] Task checkbox state persists on reload
- [ ] Mark-all-done works
- [ ] Grid drag reorder persists on reload
- [ ] Task drag reorder in config persists after save
- [ ] Keyboard flow in config: Enter/Tab/Backspace
- [ ] New day detection triggers schedule recompute
- [ ] Empty state shows Add button; first daily appears in grid after save
- [ ] Cancel on config dialog makes no changes
