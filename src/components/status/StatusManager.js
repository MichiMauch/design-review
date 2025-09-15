'use client';

import { useState, useEffect } from 'react';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import StatusCard from './StatusCard';
import StatusColorPicker from './StatusColorPicker';
import { useProjectStatuses } from '../../hooks/useProjectStatuses';
import { useToast } from '../../hooks/useToast';

/**
 * Main status management component
 * Container for all status-related functionality
 */
export default function StatusManager({ projectId }) {
  const {
    statuses,
    loading,
    error,
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
    checkMigrationStatus,
    migrateProject,
    reload
  } = useProjectStatuses(projectId);

  const { showToast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('bg-gray-100 text-gray-800 border-gray-200');
  const [needsMigration, setNeedsMigration] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Check if migration is needed
  useEffect(() => {
    const checkMigration = async () => {
      const status = await checkMigrationStatus();
      if (status) {
        setNeedsMigration(status.needsMigration);
      }
    };
    checkMigration();
  }, [checkMigrationStatus]);

  const handleMigrate = async () => {
    const result = await migrateProject();
    if (result.migrated) {
      showToast('Projekt erfolgreich migriert!', 'success');
      setNeedsMigration(false);
    } else {
      showToast(result.error || 'Migration fehlgeschlagen', 'error');
    }
  };

  const handleAddStatus = async () => {
    if (!newStatusLabel.trim()) return;

    setIsCreating(true);
    const value = newStatusLabel
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    const result = await createStatus({
      value,
      label: newStatusLabel.trim(),
      color: newStatusColor,
      sort_order: statuses.length + 1
    });

    if (result.success) {
      showToast('Status erfolgreich hinzugefügt!', 'success');
      setNewStatusLabel('');
      setShowAddForm(false);
    } else {
      showToast(result.error || 'Fehler beim Hinzufügen', 'error');
    }
    setIsCreating(false);
  };

  const handleUpdateStatus = async (statusId, updateData) => {
    const result = await updateStatus(statusId, updateData);
    if (result.success) {
      showToast('Status aktualisiert!', 'success');
    } else {
      showToast(result.error || 'Fehler beim Aktualisieren', 'error');
    }
    return result;
  };

  const handleDeleteStatus = async (statusId) => {
    const result = await deleteStatus(statusId);
    if (result.success) {
      showToast('Status gelöscht!', 'success');
    } else {
      showToast(result.error || 'Status kann nicht gelöscht werden', 'error');
    }
    return result;
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const newOrder = Array.from(statuses);
    const [reorderedItem] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, reorderedItem);

    const statusOrder = newOrder.map(s => s.id);
    const reorderResult = await reorderStatuses(statusOrder);

    if (reorderResult.success) {
      showToast('Reihenfolge aktualisiert!', 'success');
    } else {
      showToast('Fehler beim Sortieren', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (needsMigration) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-yellow-900">Migration erforderlich</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Dieses Projekt verwendet noch globale Status. Klicken Sie auf &quot;Migrieren&quot;,
              um projektspezifische Status zu aktivieren.
            </p>
            <button
              onClick={handleMigrate}
              className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Jetzt migrieren
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Status / Swimlanes</h3>
        <button
          onClick={() => reload()}
          className="text-sm text-gray-500 hover:text-gray-700"
          title="Neu laden"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="statuses">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {statuses.map((status, index) => (
                <Draggable
                  key={status.id}
                  draggableId={String(status.id)}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                    >
                      <StatusCard
                        status={status}
                        onUpdate={handleUpdateStatus}
                        onDelete={handleDeleteStatus}
                        isDragging={snapshot.isDragging}
                        dragHandleProps={provided.dragHandleProps}
                        canDelete={statuses.length > 1}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add new status form */}
      {showAddForm ? (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newStatusLabel}
                onChange={(e) => setNewStatusLabel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddStatus()}
                placeholder="Name des neuen Status..."
                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <StatusColorPicker
                value={newStatusColor}
                onChange={setNewStatusColor}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddStatus}
                disabled={!newStatusLabel.trim() || isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Hinzufügen
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewStatusLabel('');
                  setNewStatusColor('bg-gray-100 text-gray-800 border-gray-200');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
        >
          <Plus className="h-4 w-4" />
          Neuer Status
        </button>
      )}

      <div className="text-sm text-gray-500 mt-4">
        <p>Hinweis: Status können per Drag & Drop sortiert werden.</p>
        <p>Status können nur gelöscht werden, wenn keine Tasks sie verwenden.</p>
      </div>
    </div>
  );
}