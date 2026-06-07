import * as Dialog from '@radix-ui/react-dialog';

interface Props {
  open: boolean;
  dailyName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmResetDialog({ open, dailyName, onConfirm, onCancel }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white border border-slate-200 rounded-xl p-6 shadow-xl transition-all duration-200 data-[state=closed]:opacity-0 data-[state=closed]:scale-95 data-[state=open]:opacity-100 data-[state=open]:scale-100"
          aria-describedby="reset-desc"
        >
          <Dialog.Title className="text-base font-semibold text-slate-800 mb-2">
            Reset schedule?
          </Dialog.Title>
          <p id="reset-desc" className="text-sm text-slate-500 mb-6">
            The schedule for <span className="text-slate-700 font-medium">{dailyName}</span> will
            restart from the beginning. Completed tasks will be cleared.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              aria-label="Cancel"
              className="px-4 py-2 text-sm rounded border-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              aria-label="Reset"
              className="px-4 py-2 text-sm rounded border-0 bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              Reset
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
