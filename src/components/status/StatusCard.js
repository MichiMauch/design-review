'use client';

import { useState } from 'react';
import { GripVertical, Edit2, Trash2, Check, X } from 'lucide-react';
import StatusColorPicker from './StatusColorPicker';
import ConfirmationModal from '../shared/ConfirmationModal';

/**
 * Individual status card component
 * Handles inline editing and drag & drop
 */
export default function StatusCard({
  status,
  onUpdate,
  onDelete,
  isDragging,
  dragHandleProps,
  canDelete = true
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(status.label);
  const [editColor, setEditColor] = useState(status.color);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    if (!editLabel.trim()) return;

    setIsSaving(true);
    const result = await onUpdate(status.id, {
      label: editLabel.trim(),
      color: editColor
    });

    if (result.success) {
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    setEditLabel(status.label);
    setEditColor(status.color);
    setIsEditing(false);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(status.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-3 bg-white rounded-lg border
        ${isDragging ? 'opacity-50 shadow-lg' : 'hover:shadow-md'}
        transition-all duration-200
      `}
    >
      {/* Drag Handle */}
      <div
        {...dragHandleProps}
        className="cursor-move text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Status Content */}
      <div className="flex-1">
        {isEditing ? (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="flex-1 px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Status-Name"
              autoFocus
            />
            <StatusColorPicker
              value={editColor}
              onChange={setEditColor}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="font-medium">{status.label}</span>
            <span className={`px-2 py-1 rounded-full border text-xs ${status.color}`}>
              Beispiel
            </span>
            <span className="text-sm text-gray-500">
              (Wert: {status.value})
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isSaving || !editLabel.trim()}
              className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
              title="Speichern"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-600 hover:bg-gray-50 rounded"
              title="Abbrechen"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="Bearbeiten"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Löschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Status löschen"
        message={`Möchten Sie den Status "${status.label}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmText="Löschen"
        cancelText="Abbrechen"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}