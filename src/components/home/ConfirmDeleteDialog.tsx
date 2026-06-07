import * as Dialog from '@radix-ui/react-dialog';

interface Props {
  open: boolean;
  dailyName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteDialog({ open, dailyName, onConfirm, onCancel }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white border border-slate-200 rounded-xl p-6 shadow-xl transition-all duration-200 data-[state=closed]:opacity-0 data-[state=closed]:scale-95 data-[state=open]:opacity-100 data-[state=open]:scale-100"
          aria-describedby="delete-desc"
        >
          <Dialog.Title className="text-base font-semibold text-slate-800 mb-2">
            Delete daily?
          </Dialog.Title>
          <p id="delete-desc" className="text-sm text-slate-500 mb-6">
            <span className="text-slate-700 font-medium">{dailyName}</span> and all its history
            will be permanently removed.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              aria-label="Cancel"
              className="px-4 py-2 text-sm rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              aria-label="Delete"
              className="px-4 py-2 text-sm rounded bg-rose-500 text-white hover:bg-rose-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
