import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';

describe('ConfirmDeleteDialog', () => {
  it('shows the daily name in the confirmation message', () => {
    render(
      <ConfirmDeleteDialog open dailyName="Morning Routine" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByText(/morning routine/i)).toBeInTheDocument();
  });

  it('calls onConfirm when Delete button clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDeleteDialog open dailyName="Test" onConfirm={onConfirm} onCancel={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when Cancel button clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDeleteDialog open dailyName="Test" onConfirm={() => {}} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not call onConfirm when Cancel clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDeleteDialog open dailyName="Test" onConfirm={onConfirm} onCancel={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does not render content when closed', () => {
    render(
      <ConfirmDeleteDialog open={false} dailyName="Morning Routine" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.queryByText(/morning routine/i)).not.toBeInTheDocument();
  });
});
