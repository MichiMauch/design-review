'use client';

import { X } from 'lucide-react';

export default function ProjectDeleteModal({
  isOpen,
  project,
  deleteConfirmText,
  onDeleteConfirmTextChange,
  deletingProject,
  onConfirm,
  onClose
}) {
  if (!isOpen || !project) return null;

  const expectedText = `Ich will dieses Projekt: ${project.name} löschen`;
  const isTextValid = deleteConfirmText.trim() === expectedText;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[62] p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Projekt löschen</h3>

        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            Sind Sie sicher, dass Sie das Projekt <strong>{project.name}</strong> löschen möchten?
          </p>
          <p className="text-sm text-red-600 mb-4">
            Diese Aktion kann nicht rückgängig gemacht werden. Alle Tasks und Daten werden dauerhaft gelöscht.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-red-800 mb-2">Sicherheitsabfrage:</p>
            <p className="text-sm text-red-700 mb-3">
              Geben Sie den folgenden Text exakt ein, um das Löschen zu bestätigen:
            </p>
            <p className="text-sm font-mono bg-red-100 p-2 rounded border border-red-300 text-red-900">
              {expectedText}
            </p>
          </div>

          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => onDeleteConfirmTextChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Text hier eingeben..."
            disabled={deletingProject}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={deletingProject || !isTextValid}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg"
          >
            {deletingProject ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Lösche...
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                Projekt löschen
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={deletingProject}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}