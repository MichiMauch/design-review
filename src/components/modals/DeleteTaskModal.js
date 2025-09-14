'use client';

import { X } from 'lucide-react';

export default function DeleteTaskModal({
  isOpen,
  task,
  isDeleting,
  onConfirm,
  onCancel
}) {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[62] p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Task löschen</h3>

        <p className="text-gray-600 mb-6">
          Sind Sie sicher, dass Sie die Task <strong>&quot;{task.title}&quot;</strong> löschen möchten?
          Diese Aktion kann nicht rückgängig gemacht werden.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Lösche...
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                Task löschen
              </>
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}