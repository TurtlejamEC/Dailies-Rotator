import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Daily, DailySchedule } from '../../types';

const mockStore = vi.hoisted(() => ({
  dailies: [] as Daily[],
  schedules: {} as Record<string, DailySchedule>,
  toggleTask: vi.fn(),
  markAllDone: vi.fn(),
  reorderDailies: vi.fn(),
}));

vi.mock('../../store/useAppStore', () => ({
  default: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

import HomePage from './HomePage';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeDaily(id: string, name: string, gridPosition: number): Daily {
  return {
    id,
    name,
    tasksPerDay: 1,
    ordering: 'sequential',
    tasks: [{ id: `${id}-T1`, name: 'Task 1', active: true, priority: 1 }],
    gridPosition,
  };
}

function makeSchedule(dailyId: string): DailySchedule {
  return {
    dailyId,
    scheduledDate: '2099-01-01',
    scheduledTaskIds: [`${dailyId}-T1`],
    completedTaskIds: [],
    sequentialIndex: 1,
    randomPool: [],
    cyclePickedIds: [`${dailyId}-T1`],
  };
}

const noop = () => {};

beforeEach(() => {
  mockStore.dailies = [];
  mockStore.schedules = {};
  mockStore.toggleTask.mockClear();
  mockStore.markAllDone.mockClear();
  mockStore.reorderDailies.mockClear();
});

// ─── tests ───────────────────────────────────────────────────────────────────

describe('HomePage', () => {
  it('shows empty-state message when no dailies', () => {
    render(<HomePage onAddDaily={noop} onEditDaily={noop} onDuplicateDaily={noop} onDeleteDaily={noop} />);
    expect(screen.getByText(/no dailies/i)).toBeInTheDocument();
  });

  it('shows Add Daily button in empty state', () => {
    const onAdd = vi.fn();
    render(<HomePage onAddDaily={onAdd} onEditDaily={noop} onDuplicateDaily={noop} onDeleteDaily={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /add.*daily/i }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('renders one card per daily', () => {
    mockStore.dailies = [makeDaily('d1', 'Morning', 0), makeDaily('d2', 'Evening', 1)];
    mockStore.schedules = { d1: makeSchedule('d1'), d2: makeSchedule('d2') };
    render(<HomePage onAddDaily={noop} onEditDaily={noop} onDuplicateDaily={noop} onDeleteDaily={noop} />);

    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('renders cards in gridPosition order regardless of store array order', () => {
    // store has them reversed, should render Morning (pos 0) first
    mockStore.dailies = [makeDaily('d2', 'Evening', 1), makeDaily('d1', 'Morning', 0)];
    mockStore.schedules = { d1: makeSchedule('d1'), d2: makeSchedule('d2') };
    render(<HomePage onAddDaily={noop} onEditDaily={noop} onDuplicateDaily={noop} onDeleteDaily={noop} />);

    const cards = screen.getAllByRole('article');
    expect(cards[0]).toHaveTextContent('Morning');
    expect(cards[1]).toHaveTextContent('Evening');
  });

  it('forwards onEditDaily to card Edit button', () => {
    mockStore.dailies = [makeDaily('d1', 'Test', 0)];
    mockStore.schedules = { d1: makeSchedule('d1') };
    const onEdit = vi.fn();
    render(<HomePage onAddDaily={noop} onEditDaily={onEdit} onDuplicateDaily={noop} onDeleteDaily={noop} />);

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledWith('d1');
  });

  it('forwards onDeleteDaily to card Delete button', () => {
    mockStore.dailies = [makeDaily('d1', 'Test', 0)];
    mockStore.schedules = { d1: makeSchedule('d1') };
    const onDelete = vi.fn();
    render(<HomePage onAddDaily={noop} onEditDaily={noop} onDuplicateDaily={noop} onDeleteDaily={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith('d1');
  });

  it('shows Add Daily button when dailies exist', () => {
    mockStore.dailies = [makeDaily('d1', 'Test', 0)];
    mockStore.schedules = { d1: makeSchedule('d1') };
    const onAdd = vi.fn();
    render(<HomePage onAddDaily={onAdd} onEditDaily={noop} onDuplicateDaily={noop} onDeleteDaily={noop} />);

    fireEvent.click(screen.getByRole('button', { name: /add.*daily/i }));

    expect(onAdd).toHaveBeenCalled();
  });

  it('renders a drag handle on each card', () => {
    mockStore.dailies = [makeDaily('d1', 'Morning', 0), makeDaily('d2', 'Evening', 1)];
    mockStore.schedules = { d1: makeSchedule('d1'), d2: makeSchedule('d2') };
    render(<HomePage onAddDaily={noop} onEditDaily={noop} onDuplicateDaily={noop} onDeleteDaily={noop} />);

    expect(screen.getAllByRole('button', { name: /drag/i })).toHaveLength(2);
  });
});
