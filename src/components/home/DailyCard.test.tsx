import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Daily, DailySchedule } from '../../types';

// Mutable store state shared by all tests — mutated in beforeEach
const mockStore = vi.hoisted(() => ({
  dailies: [] as Daily[],
  schedules: {} as Record<string, DailySchedule>,
  toggleTask: vi.fn(),
  markAllDone: vi.fn(),
}));

vi.mock('../../store/useAppStore', () => ({
  default: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

import DailyCard from './DailyCard';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeDaily(id: string): Daily {
  return {
    id,
    name: 'Morning Routine',
    tasksPerDay: 2,
    ordering: 'sequential',
    tasks: [
      { id: 'T1', name: 'Exercise', active: true, priority: 1 },
      { id: 'T2', name: 'Meditate', active: true, priority: 1 },
      { id: 'T3', name: 'Journal', active: true, priority: 1 },
    ],
    gridPosition: 0,
  };
}

function makeSchedule(dailyId: string, overrides: Partial<DailySchedule> = {}): DailySchedule {
  return {
    dailyId,
    scheduledDate: '2099-01-01',
    scheduledTaskIds: ['T1', 'T2'],
    completedTaskIds: [],
    sequentialIndex: 2,
    randomPool: [],
    cyclePickedIds: ['T1', 'T2'],
    ...overrides,
  };
}

const noop = () => {};

beforeEach(() => {
  mockStore.dailies = [];
  mockStore.schedules = {};
  mockStore.toggleTask.mockClear();
  mockStore.markAllDone.mockClear();
});

// ─── tests ───────────────────────────────────────────────────────────────────

describe('DailyCard', () => {
  it('renders daily name', () => {
    mockStore.dailies = [makeDaily('d1')];
    mockStore.schedules = { d1: makeSchedule('d1') };
    render(<DailyCard dailyId="d1" onEdit={noop} onDuplicate={noop} onDelete={noop} />);
    expect(screen.getByText('Morning Routine')).toBeInTheDocument();
  });

  it('renders only scheduled tasks, not unscheduled ones', () => {
    mockStore.dailies = [makeDaily('d1')];
    mockStore.schedules = { d1: makeSchedule('d1') };
    render(<DailyCard dailyId="d1" onEdit={noop} onDuplicate={noop} onDelete={noop} />);
    expect(screen.getByText('Exercise')).toBeInTheDocument();
    expect(screen.getByText('Meditate')).toBeInTheDocument();
    expect(screen.queryByText('Journal')).not.toBeInTheDocument();
  });

  it('calls toggleTask with dailyId and taskId on checkbox click', () => {
    mockStore.dailies = [makeDaily('d1')];
    mockStore.schedules = { d1: makeSchedule('d1') };
    render(<DailyCard dailyId="d1" onEdit={noop} onDuplicate={noop} onDelete={noop} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Exercise' }));

    expect(mockStore.toggleTask).toHaveBeenCalledWith('d1', 'T1');
  });

  it('renders task as checked when already completed', () => {
    mockStore.dailies = [makeDaily('d1')];
    mockStore.schedules = { d1: makeSchedule('d1', { completedTaskIds: ['T1'] }) };
    render(<DailyCard dailyId="d1" onEdit={noop} onDuplicate={noop} onDelete={noop} />);

    expect(screen.getByRole('checkbox', { name: 'Exercise' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Meditate' })).not.toBeChecked();
  });

  it('calls markAllDone with dailyId when "Mark all done" clicked', () => {
    mockStore.dailies = [makeDaily('d1')];
    mockStore.schedules = { d1: makeSchedule('d1') };
    render(<DailyCard dailyId="d1" onEdit={noop} onDuplicate={noop} onDelete={noop} />);

    fireEvent.click(screen.getByRole('button', { name: /mark all done/i }));

    expect(mockStore.markAllDone).toHaveBeenCalledWith('d1');
  });

  it('shows "all done" banner when all tasks completed', () => {
    mockStore.dailies = [makeDaily('d1')];
    mockStore.schedules = { d1: makeSchedule('d1', { completedTaskIds: ['T1', 'T2'] }) };
    render(<DailyCard dailyId="d1" onEdit={noop} onDuplicate={noop} onDelete={noop} />);

    expect(screen.getByText(/all done/i)).toBeInTheDocument();
  });

  it('shows "no tasks" message when no tasks scheduled', () => {
    mockStore.dailies = [makeDaily('d1')];
    mockStore.schedules = { d1: makeSchedule('d1', { scheduledTaskIds: [] }) };
    render(<DailyCard dailyId="d1" onEdit={noop} onDuplicate={noop} onDelete={noop} />);

    expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
  });

  it('calls onEdit with dailyId when Edit clicked', () => {
    mockStore.dailies = [makeDaily('d1')];
    mockStore.schedules = { d1: makeSchedule('d1') };
    const onEdit = vi.fn();
    render(<DailyCard dailyId="d1" onEdit={onEdit} onDuplicate={noop} onDelete={noop} />);

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledWith('d1');
  });

  it('calls onDelete with dailyId when Delete clicked', () => {
    mockStore.dailies = [makeDaily('d1')];
    mockStore.schedules = { d1: makeSchedule('d1') };
    const onDelete = vi.fn();
    render(<DailyCard dailyId="d1" onEdit={noop} onDuplicate={noop} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith('d1');
  });

  it('calls onDuplicate with dailyId when Duplicate clicked', () => {
    mockStore.dailies = [makeDaily('d1')];
    mockStore.schedules = { d1: makeSchedule('d1') };
    const onDuplicate = vi.fn();
    render(<DailyCard dailyId="d1" onEdit={noop} onDuplicate={onDuplicate} onDelete={noop} />);

    fireEvent.click(screen.getByRole('button', { name: /duplicate/i }));

    expect(onDuplicate).toHaveBeenCalledWith('d1');
  });
});
