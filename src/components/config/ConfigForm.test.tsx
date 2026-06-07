import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfigForm from './ConfigForm';
import type { ConfigFormData } from './ConfigForm';

// ─── helpers ─────────────────────────────────────────────────────────────────

const emptyData: ConfigFormData = {
  name: '',
  tasksPerDay: 1,
  ordering: 'sequential',
  tasks: [],
};

function makeData(overrides: Partial<ConfigFormData> = {}): ConfigFormData {
  return {
    name: 'Morning Routine',
    tasksPerDay: 2,
    ordering: 'sequential',
    tasks: [
      { id: 'T1', name: 'Exercise', active: true, priority: 1 },
      { id: 'T2', name: 'Meditate', active: true, priority: 1 },
    ],
    ...overrides,
  };
}

const noop = () => {};

// ─── render ──────────────────────────────────────────────────────────────────

describe('ConfigForm — render', () => {
  it('renders empty form in add mode', () => {
    render(<ConfigForm initialData={emptyData} onSave={noop} onCancel={noop} />);
    expect(screen.getByRole('textbox', { name: /daily name/i })).toHaveValue('');
    expect(screen.queryAllByRole('textbox', { name: /task name/i })).toHaveLength(0);
  });

  it('renders populated form in edit mode', () => {
    render(<ConfigForm initialData={makeData()} onSave={noop} onCancel={noop} />);
    expect(screen.getByRole('textbox', { name: /daily name/i })).toHaveValue('Morning Routine');
    expect(screen.getAllByRole('textbox', { name: /task name/i })).toHaveLength(2);
    expect(screen.getByDisplayValue('Exercise')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Meditate')).toBeInTheDocument();
  });

  it('renders tasksPerDay input with correct value', () => {
    render(<ConfigForm initialData={makeData()} onSave={noop} onCancel={noop} />);
    expect(screen.getByRole('spinbutton', { name: /tasks per day/i })).toHaveValue(2);
  });

  it('renders ordering options with sequential selected', () => {
    render(<ConfigForm initialData={makeData({ ordering: 'sequential' })} onSave={noop} onCancel={noop} />);
    expect(screen.getByRole('radio', { name: /sequential/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /random/i })).not.toBeChecked();
  });
});

// ─── field edits ─────────────────────────────────────────────────────────────

describe('ConfigForm — field edits', () => {
  it('updates name field', () => {
    render(<ConfigForm initialData={emptyData} onSave={noop} onCancel={noop} />);
    fireEvent.change(screen.getByRole('textbox', { name: /daily name/i }), {
      target: { value: 'Evening' },
    });
    expect(screen.getByRole('textbox', { name: /daily name/i })).toHaveValue('Evening');
  });

  it('updates tasksPerDay field', () => {
    render(<ConfigForm initialData={emptyData} onSave={noop} onCancel={noop} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: /tasks per day/i }), {
      target: { value: '3' },
    });
    expect(screen.getByRole('spinbutton', { name: /tasks per day/i })).toHaveValue(3);
  });

  it('switches ordering to random', () => {
    render(<ConfigForm initialData={emptyData} onSave={noop} onCancel={noop} />);
    fireEvent.click(screen.getByRole('radio', { name: /random/i }));
    expect(screen.getByRole('radio', { name: /random/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /sequential/i })).not.toBeChecked();
  });
});

// ─── task management ─────────────────────────────────────────────────────────

describe('ConfigForm — task management', () => {
  it('adds empty task row when "Add task" clicked', () => {
    render(<ConfigForm initialData={emptyData} onSave={noop} onCancel={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /add task/i }));
    expect(screen.getAllByRole('textbox', { name: /task name/i })).toHaveLength(1);
    expect(screen.getAllByRole('textbox', { name: /task name/i })[0]).toHaveValue('');
  });

  it('adds task after current when Enter pressed in task name input', async () => {
    const user = userEvent.setup();
    render(<ConfigForm initialData={makeData()} onSave={noop} onCancel={noop} />);
    const firstInput = screen.getAllByRole('textbox', { name: /task name/i })[0];
    await user.click(firstInput);
    await user.keyboard('{Enter}');
    expect(screen.getAllByRole('textbox', { name: /task name/i })).toHaveLength(3);
    // new row should be the second one (after T1, before T2)
    expect(screen.getAllByRole('textbox', { name: /task name/i })[1]).toHaveValue('');
  });

  it('removes task when Backspace pressed on empty task name', async () => {
    const user = userEvent.setup();
    render(<ConfigForm initialData={makeData()} onSave={noop} onCancel={noop} />);
    const inputs = screen.getAllByRole('textbox', { name: /task name/i });
    // clear first input then press Backspace
    await user.clear(inputs[0]);
    await user.keyboard('{Backspace}');
    expect(screen.getAllByRole('textbox', { name: /task name/i })).toHaveLength(1);
  });

  it('updates task name inline', () => {
    render(<ConfigForm initialData={makeData()} onSave={noop} onCancel={noop} />);
    const input = screen.getByDisplayValue('Exercise');
    fireEvent.change(input, { target: { value: 'Run' } });
    expect(screen.getByDisplayValue('Run')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Exercise')).not.toBeInTheDocument();
  });

  it('toggles task active state', () => {
    render(<ConfigForm initialData={makeData()} onSave={noop} onCancel={noop} />);
    const toggles = screen.getAllByRole('checkbox', { name: /active/i });
    expect(toggles[0]).toBeChecked();
    fireEvent.click(toggles[0]);
    expect(toggles[0]).not.toBeChecked();
  });

  it('removes task when Delete button clicked', () => {
    render(<ConfigForm initialData={makeData()} onSave={noop} onCancel={noop} />);
    const deleteButtons = screen.getAllByRole('button', { name: /remove task/i });
    fireEvent.click(deleteButtons[0]);
    expect(screen.getAllByRole('textbox', { name: /task name/i })).toHaveLength(1);
    expect(screen.queryByDisplayValue('Exercise')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Meditate')).toBeInTheDocument();
  });
});

// ─── save / cancel ───────────────────────────────────────────────────────────

describe('ConfigForm — save / cancel', () => {
  it('calls onSave with current draft data when Save clicked', () => {
    const onSave = vi.fn();
    render(<ConfigForm initialData={makeData()} onSave={onSave} onCancel={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledOnce();
    const saved = onSave.mock.calls[0][0] as ConfigFormData;
    expect(saved.name).toBe('Morning Routine');
    expect(saved.tasksPerDay).toBe(2);
    expect(saved.tasks).toHaveLength(2);
  });

  it('calls onSave with edited data, not initial data', () => {
    const onSave = vi.fn();
    render(<ConfigForm initialData={makeData()} onSave={onSave} onCancel={noop} />);
    fireEvent.change(screen.getByRole('textbox', { name: /daily name/i }), {
      target: { value: 'Edited Name' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave.mock.calls[0][0].name).toBe('Edited Name');
  });

  it('calls onCancel when Cancel clicked', () => {
    const onCancel = vi.fn();
    render(<ConfigForm initialData={makeData()} onSave={noop} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not call onSave when Cancel clicked', () => {
    const onSave = vi.fn();
    render(<ConfigForm initialData={makeData()} onSave={onSave} onCancel={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
