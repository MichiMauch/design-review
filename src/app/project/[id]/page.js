'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSettings } from '../../admin/hooks/useSettings';
import { useToast } from '../../../hooks/useToast';
import { useJiraManager } from '../../../hooks/useJiraManager';
import { useProjectManager } from '../../../hooks/useProjectManager';
import { useTaskManager } from '../../../hooks/useTaskManager';
import { useProjectStatuses } from '../../../hooks/useProjectStatuses';
import Toast from '../../../components/ui/Toast';
import ProjectHeader from '../../../components/project/ProjectHeader';
import WidgetInstallation from '../../../components/project/WidgetInstallation';
import ProjectSidebar from '../../../components/project/ProjectSidebar';
import TaskControls from '../../../components/project/TaskControls';
import DeleteTaskModal from '../../../components/modals/DeleteTaskModal';
import ProjectDeleteModal from '../../../components/modals/ProjectDeleteModal';
import JiraModal from '../../../components/modals/JiraModal';
import ScreenshotLightbox from '../../../components/modals/ScreenshotLightbox';
import TaskModalContainer from '../../../components/containers/TaskModalContainer';
import TaskList from '../../../components/project/TaskList';
import TaskBoard from '../../../components/project/TaskBoard';
import { MessageSquare } from 'lucide-react';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { getR2Url } = useSettings();
  const { toast, showToast, hideToast } = useToast();

  // Local component state for modals and forms
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [jiraTaskData, setJiraTaskData] = useState({
    title: '',
    description: '',
    assignee: '',
    sprint: '',
    labels: '',
    column: ''
  });

  // Custom hooks for separated concerns
  const projectManager = useProjectManager({
    projectId: params.id,
    showToast,
    router
  });

  const taskManager = useTaskManager({
    projectId: params.id,
    tasks: projectManager.tasks,
    setTasks: projectManager.setTasks,
    showToast,
    getR2Url
  });

  const jiraManager = useJiraManager({
    combinedJiraConfig: projectManager.combinedJiraConfig,
    jiraConfig: projectManager.jiraConfig,
    showToast
  });

  // Load project-specific statuses
  const projectStatuses = useProjectStatuses(params.id);

  // Enhanced JIRA modal opening with screenshot loading
  const openJiraModal = useCallback(async (task) => {
    if (!projectManager.combinedJiraConfig) {
      showToast('JIRA-Konfiguration wird geladen, bitte warten...', 'info');
      await projectManager.loadCombinedJiraConfigWithRetry(projectManager.project?.id);

      if (!projectManager.combinedJiraConfig) {
        showToast('JIRA-Konfiguration konnte nicht geladen werden. Bitte prüfen Sie die Einstellungen.', 'error');
        return;
      }
    }

    // Check if JIRA is fully configured
    const isFullyConfigured =
      projectManager.combinedJiraConfig?.serverUrl &&
      projectManager.combinedJiraConfig?.username &&
      projectManager.combinedJiraConfig?.apiToken &&
      projectManager.combinedJiraConfig?.projectKey;

    if (!isFullyConfigured) {
      showToast('JIRA ist nicht vollständig konfiguriert. Bitte prüfen Sie die Admin-Einstellungen und Projekt-Einstellungen.', 'error');
      return;
    }

    setSelectedTask(task);

    // Load screenshot if not already loaded
    const hasScreenshot = task.screenshot_url || task.screenshot;
    if (!hasScreenshot) {
      try {
        const response = await fetch(`/api/projects/${params.id}/tasks/${task.id}/screenshot?format=json`);
        if (response.ok) {
          const data = await response.json();
          if (data.screenshot_url && data.screenshot_url.trim() !== '') {
            const taskWithScreenshot = { ...task, screenshot_display: data.screenshot_url };
            setSelectedTask(taskWithScreenshot);
            projectManager.setTasks(prevTasks =>
              prevTasks.map(t =>
                t.id === task.id
                  ? { ...t, screenshot_display: data.screenshot_url }
                  : t
              )
            );
          }
        }
      } catch (error) {
        console.error('Failed to load screenshot for task:', error);
        showToast(`Screenshot konnte nicht geladen werden für Task ${task.id}. JIRA-Task wird ohne Bild erstellt.`, 'warning');
      }
    }

    setJiraTaskData({
      title: task.title,
      description: task.description || '',
      assignee: '',
      sprint: '',
      labels: '',
      column: ''
    });

    jiraManager.setLoadingJiraModal(task.id);
    await jiraManager.loadJiraModalData();
    jiraManager.setLoadingJiraModal(null);
    setShowJiraModal(true);
  }, [projectManager, jiraManager, showToast, params.id]);

  // Project deletion functions
  const deleteProject = useCallback(async () => {
    if (!projectManager.project) return;

    // Prüfe Sicherheitsabfrage
    const expectedText = `Ich will dieses Projekt: ${projectManager.project.name} löschen`;
    if (deleteConfirmText.trim() !== expectedText) {
      showToast('Sicherheitsabfrage nicht korrekt. Projekt wird nicht gelöscht.', 'warning');
      return;
    }

    setDeletingProject(true);
    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast('Projekt erfolgreich gelöscht!', 'success');
        router.push('/projects');
      } else {
        showToast('Fehler beim Löschen des Projekts', 'error');
      }
    } catch {
      showToast('Fehler beim Löschen des Projekts', 'error');
    } finally {
      setDeletingProject(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  }, [projectManager.project, deleteConfirmText, showToast, params.id, router]);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  }, []);

  // JIRA task creation
  const handleCreateJiraTask = useCallback(async () => {
    if (!selectedTask) return;

    const result = await jiraManager.createJiraTask(
      selectedTask,
      jiraTaskData,
      params.id,
      taskManager.getScreenshotUrl,
      projectManager.tasks,
      projectManager.setTasks,
      setSelectedTask
    );

    if (result?.success) {
      setShowJiraModal(false);
    }
  }, [selectedTask, jiraTaskData, params.id, jiraManager, taskManager, projectManager]);

  // Performance optimized handlers with useCallback
  const handleUpdateTaskStatus = useCallback((taskId, status) => {
    taskManager.updateTaskStatus(taskId, status);
    taskManager.setSelectedTaskForModal(prev => prev ? {...prev, status} : null);
  }, [taskManager]);

  // Loading and error states
  if (projectManager.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!projectManager.project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Projekt nicht gefunden</h1>
          <Link href="/projects" className="text-blue-600 hover:text-blue-700">
            Zurück zur Projektübersicht
          </Link>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50">
      <Toast toast={toast} onClose={hideToast} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <ProjectHeader
          project={projectManager.project}
          combinedJiraConfig={projectManager.combinedJiraConfig}
          jiraConfig={projectManager.jiraConfig}
        />

        <div className={`grid gap-6 ${taskManager.viewMode === 'board' ? 'grid-cols-1' : 'lg:grid-cols-4'}`}>
          {/* Main Content Area */}
          <div className={taskManager.viewMode === 'board' ? '' : 'lg:col-span-3'}>
            <WidgetInstallation project={projectManager.project} />

            {/* Tasks */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <TaskControls
                isRefreshing={projectManager.isRefreshing}
                onRefresh={projectManager.refreshData}
                viewMode={taskManager.viewMode}
                onViewModeChange={taskManager.setViewMode}
                statusFilter={taskManager.statusFilter}
                onStatusFilterChange={taskManager.setStatusFilter}
                projectStatuses={projectStatuses.statuses}
              />

              {projectManager.tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Noch keine Tasks vorhanden</p>
                  <p className="text-sm mt-2">
                    {projectManager.project.widget_installed
                      ? "Tasks werden automatisch erstellt, wenn Nutzer Feedback über das Widget senden."
                      : "Installieren Sie zuerst das Widget, damit Nutzer Feedback senden können."
                    }
                  </p>
                </div>
              ) : taskManager.viewMode === 'list' ? (
                <TaskList
                  tasks={projectManager.tasks}
                  getFilteredTasks={taskManager.getFilteredTasks}
                  editingTask={taskManager.editingTask}
                  editForm={taskManager.editForm}
                  onEditFormChange={taskManager.setEditForm}
                  onStartEditing={taskManager.startEditing}
                  onSaveTask={taskManager.saveTask}
                  onCancelEditing={taskManager.cancelEditing}
                  onUpdateStatus={taskManager.updateTaskStatus}
                  onOpenTaskModal={taskManager.setSelectedTaskForModal}
                  onOpenDeleteModal={taskManager.openTaskDeleteModal}
                  onOpenJiraModal={openJiraModal}
                  getScreenshotUrl={taskManager.getScreenshotUrl}
                  getCommentCount={taskManager.getCommentCount}
                  user={projectManager.user}
                  creatingJira={jiraManager.creatingJira}
                  loadingJiraModal={jiraManager.loadingJiraModal}
                  loadingJiraConfig={projectManager.loadingJiraConfig}
                  viewMode={taskManager.viewMode}
                  projectStatuses={projectStatuses.statuses}
                  getStatusInfo={projectStatuses.getStatusInfo}
                />
              ) : (
                <TaskBoard
                  tasks={projectManager.tasks}
                  editingTask={taskManager.editingTask}
                  editForm={taskManager.editForm}
                  onEditFormChange={taskManager.setEditForm}
                  onStartEditing={taskManager.startEditing}
                  onSaveTask={taskManager.saveTask}
                  onCancelEditing={taskManager.cancelEditing}
                  onUpdateStatus={taskManager.updateTaskStatus}
                  onUpdateStatusAndPosition={taskManager.updateStatusAndPosition}
                  onReorderTasks={taskManager.reorderTasks}
                  onOpenTaskModal={taskManager.setSelectedTaskForModal}
                  onOpenDeleteModal={taskManager.openTaskDeleteModal}
                  onOpenJiraModal={openJiraModal}
                  getScreenshotUrl={taskManager.getScreenshotUrl}
                  getCommentCount={taskManager.getCommentCount}
                  user={projectManager.user}
                  creatingJira={jiraManager.creatingJira}
                  loadingJiraModal={jiraManager.loadingJiraModal}
                  projectStatuses={projectStatuses.statuses}
                  getStatusInfo={projectStatuses.getStatusInfo}
                  loadingJiraConfig={projectManager.loadingJiraConfig}
                  viewMode={taskManager.viewMode}
                  updatingTaskStatus={taskManager.updatingTaskStatus}
                  isDragging={taskManager.isDragging}
                  onDragStart={taskManager.onDragStart}
                  onDragEnd={taskManager.onDragEnd}
                />
              )}
            </div>
          </div>

          <ProjectSidebar
            tasks={projectManager.tasks}
            onExcelExport={() => projectManager.handleExcelExport(taskManager.loadTaskScreenshot)}
            exportingExcel={projectManager.exportingExcel}
            viewMode={taskManager.viewMode}
            projectId={params.id}
            onTasksUpdate={taskManager.loadTasks}
          />
        </div>

        {/* Modals */}
        <ProjectDeleteModal
          isOpen={showDeleteConfirm}
          project={projectManager.project}
          deleteConfirmText={deleteConfirmText}
          onDeleteConfirmTextChange={setDeleteConfirmText}
          deletingProject={deletingProject}
          onConfirm={deleteProject}
          onClose={closeDeleteModal}
        />

        <DeleteTaskModal
          isOpen={taskManager.showTaskDeleteConfirm}
          task={taskManager.taskToDelete}
          isDeleting={taskManager.deletingTask === taskManager.taskToDelete?.id}
          onConfirm={taskManager.deleteTask}
          onCancel={taskManager.closeTaskDeleteModal}
        />

        <JiraModal
          isOpen={showJiraModal}
          task={selectedTask}
          taskData={jiraTaskData}
          onTaskDataChange={setJiraTaskData}
          jiraUsers={jiraManager.jiraUsers}
          jiraSprints={jiraManager.jiraSprintsOptions}
          jiraBoardColumns={jiraManager.jiraBoardColumns}
          isCreating={jiraManager.creatingJira === selectedTask?.id}
          onCreateTask={handleCreateJiraTask}
          onClose={() => setShowJiraModal(false)}
          userRole={projectManager.user?.role}
        />

        <ScreenshotLightbox
          imageUrl={taskManager.lightboxImage}
          onClose={taskManager.closeLightbox}
        />

        <TaskModalContainer
          selectedTask={taskManager.selectedTaskForModal}
          onClose={() => taskManager.setSelectedTaskForModal(null)}
          project={projectManager.project}
          onUpdateStatus={handleUpdateTaskStatus}
          onOpenJiraModal={openJiraModal}
          onOpenDeleteModal={taskManager.openTaskDeleteModal}
          onOpenScreenshotLightbox={taskManager.openScreenshotLightbox}
          getScreenshotUrl={taskManager.getScreenshotUrl}
          user={projectManager.user}
          creatingJira={jiraManager.creatingJira}
          loadingJiraModal={jiraManager.loadingJiraModal}
          loadingJiraConfig={projectManager.loadingJiraConfig}
          showToast={showToast}
        />
      </div>
    </div>
  );
}