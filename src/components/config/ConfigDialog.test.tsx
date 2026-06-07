import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Daily, DailySchedule } from '../../types';

const mockStore = vi.hoisted(() => ({
  dailies: [] as Daily[],
  schedules: {} as Record<string, DailySchedule>,
  addDaily: vi.fn(),
  updateDaily: vi.fn(),
}));

vi.mock('../../store/useAppStore', () => ({
  default: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

import ConfigDialog from './ConfigDialog';

function makeDaily(id: string): Daily {
  return {
    id,
    name: 'Morning Routine',
    tasksPerDay: 2,
    ordering: 'sequential',
    tasks: [{ id: 'T1', name: 'Exercise', active: true, priority: 1 }],
    gridPosition: 0,
  };
}

beforeEach(() => {
  mockStore.dailies = [];
  mockStore.schedules = {};
  mockStore.addDaily.mockClear();
  mockStore.updateDaily.mockClear();
});

describe('ConfigDialog', () => {
  it('renders empty form in add mode', () => {
    render(<ConfigDialog open mode="add" onClose={() => {}} />);
    expect(screen.getByRole('textbox', { name: /daily name/i })).toHaveValue('');
  });

  it('pre-fills form with daily data in edit mode', () => {
    mockStore.dailies = [makeDaily('d1')];
    render(<ConfigDialog open mode="edit" dailyId="d1" onClose={() => {}} />);
    expect(screen.getByRole('textbox', { name: /daily name/i })).toHaveValue('Morning Routine');
  });

  it('pre-fills form with daily data and "(copy)" suffix in duplicate mode', () => {
    mockStore.dailies = [makeDaily('d1')];
    render(<ConfigDialog open mode="duplicate" dailyId="d1" onClose={() => {}} />);
    expect(screen.getByRole('textbox', { name: /daily name/i })).toHaveValue(
      'Morning Routine (copy)',
    );
  });

  it('calls addDaily on save in add mode', () => {
    render(<ConfigDialog open mode="add" onClose={() => {}} />);
    fireEvent.change(screen.getByRole('textbox', { name: /daily name/i }), {
      target: { value: 'New Daily' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(mockStore.addDaily).toHaveBeenCalledOnce();
    expect(mockStore.addDaily.mock.calls[0][0].name).toBe('New Daily');
  });

  it('calls updateDaily on save in edit mode', () => {
    mockStore.dailies = [makeDaily('d1')];
    render(<ConfigDialog open mode="edit" dailyId="d1" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(mockStore.updateDaily).toHaveBeenCalledOnce();
    expect(mockStore.updateDaily.mock.calls[0][0]).toBe('d1');
  });

  it('calls addDaily on save in duplicate mode', () => {
    mockStore.dailies = [makeDaily('d1')];
    render(<ConfigDialog open mode="duplicate" dailyId="d1" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(mockStore.addDaily).toHaveBeenCalledOnce();
  });

  it('calls onClose after save', () => {
    const onClose = vi.fn();
    render(<ConfigDialog open mode="add" onClose={onClose} />);
    fireEvent.change(screen.getByRole('textbox', { name: /daily name/i }), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Cancel clicked without saving', () => {
    const onClose = vi.fn();
    render(<ConfigDialog open mode="add" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockStore.addDaily).not.toHaveBeenCalled();
  });
});
