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
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl"
          aria-describedby="delete-desc"
        >
          <Dialog.Title className="text-base font-semibold text-gray-100 mb-2">
            Delete daily?
          </Dialog.Title>
          <p id="delete-desc" className="text-sm text-gray-400 mb-6">
            <span className="text-gray-200 font-medium">{dailyName}</span> and all its history
            will be permanently removed.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              aria-label="Cancel"
              className="px-4 py-2 text-sm rounded text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              aria-label="Delete"
              className="px-4 py-2 text-sm rounded bg-red-700 text-white hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
