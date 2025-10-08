'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
import StickyTabNavigation from '../../../components/project/StickyTabNavigation';
import DeleteTaskModal from '../../../components/modals/DeleteTaskModal';
import ProjectDeleteModal from '../../../components/modals/ProjectDeleteModal';
import JiraModal from '../../../components/modals/JiraModal';
import ScreenshotLightbox from '../../../components/modals/ScreenshotLightbox';
import TaskModalContainer from '../../../components/containers/TaskModalContainer';
import TaskList from '../../../components/project/TaskList';
import TaskBoard from '../../../components/project/TaskBoard';
import AITaskBoard from '../../../components/project/AITaskBoard';
import SentimentTaskBoard from '../../../components/project/SentimentTaskBoard';
import { MessageSquare, Calendar, MessageCircle } from 'lucide-react';
import SentimentStatistics from '../../../components/dashboard/SentimentStatistics';
import PriorityStatistics from '../../../components/dashboard/PriorityStatistics';
import { getStatusInfo, formatUrlDisplay } from '../../../utils/projectUtils';

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
  const [topUrls, setTopUrls] = useState([]);

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

  const loadTopUrls = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/top-urls`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) setTopUrls(data.topUrls || []);
      }
    } catch (e) {
      // ignore
    }
  }, [params.id]);

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

  // Track if initial load is done
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Load dashboard data on initial render and view mode changes
  useEffect(() => {
    // Always load comments for dashboard and list views
    if (taskManager.viewMode === 'dashboard' || taskManager.viewMode === 'list') {
      taskManager.loadProjectComments();
    }

    // Always load Top URLs for dashboard view
    if (taskManager.viewMode === 'dashboard') {
      loadTopUrls();
    }

    // Mark initial load as done
    if (!initialLoadDone) {
      setInitialLoadDone(true);
    }
  }, [taskManager.viewMode, taskManager.loadProjectComments, loadTopUrls, initialLoadDone]);

  // Set up periodic refresh for dashboard data
  useEffect(() => {
    if (taskManager.viewMode !== 'dashboard') return;

    // Refresh dashboard data every 30 seconds
    const refreshInterval = setInterval(() => {
      taskManager.loadProjectComments();
      loadTopUrls();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [taskManager.viewMode, taskManager.loadProjectComments, loadTopUrls]);

  // Refresh dashboard data when tasks change (new task, status update, etc.)
  useEffect(() => {
    if (taskManager.viewMode === 'dashboard' && projectManager.tasks.length > 0) {
      // Small delay to ensure task data is updated first
      const timeoutId = setTimeout(() => {
        taskManager.loadProjectComments();
        loadTopUrls();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [projectManager.tasks.length, taskManager.viewMode]);

  // Handle Excel Export
  const handleExcelExport = useCallback(() => {
    projectManager.handleExcelExport(taskManager.loadTaskScreenshot);
  }, [projectManager, taskManager]);

  // Loading and error states (must come after all hooks)
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

      <div className="w-full px-4 py-8">
        <ProjectHeader
          project={projectManager.project}
          combinedJiraConfig={projectManager.combinedJiraConfig}
          jiraConfig={projectManager.jiraConfig}
          onExcelExport={handleExcelExport}
          exportingExcel={projectManager.exportingExcel}
        />

        <div className="grid gap-6 grid-cols-1">
          {/* Main Content Area */}
          <div>
            {taskManager.viewMode !== 'dashboard' && (
              <WidgetInstallation project={projectManager.project} />
            )}

            {/* Sticky Tab Navigation */}
            <StickyTabNavigation
              viewMode={taskManager.viewMode}
              onViewModeChange={taskManager.setViewMode}
              statusFilter={taskManager.statusFilter}
              onStatusFilterChange={taskManager.setStatusFilter}
              projectStatuses={projectStatuses.statuses}
            />

            {/* Tasks */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              {taskManager.viewMode === 'dashboard' ? (
                // Dashboard View
                <div className="space-y-6">
                  {/* First Row - Main Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Project Stats */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Projekt Statistiken
                      </h3>
                      <div className="space-y-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">{projectManager.tasks.length}</div>
                          <div className="text-sm text-gray-600">Gesamt Tasks</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-red-50 rounded-lg text-center">
                            <div className="text-lg font-bold text-red-600">
                              {projectManager.tasks.filter(t => t.status === 'open').length}
                            </div>
                            <div className="text-xs text-red-600">Offen</div>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-lg text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {projectManager.tasks.filter(t => t.jira_key).length}
                            </div>
                            <div className="text-xs text-blue-600">Mit JIRA</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Time-based Statistics */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        Zeitbasierte Statistik
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                          <span className="text-sm text-gray-600">Heute</span>
                          <span className="text-lg font-bold text-blue-600">
                            {projectManager.tasks.filter(t => {
                              const today = new Date();
                              const taskDate = new Date(t.created_at);
                              return taskDate.toDateString() === today.toDateString();
                            }).length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <span className="text-sm text-gray-600">Letzte 7 Tage</span>
                          <span className="text-lg font-bold text-green-600">
                            {projectManager.tasks.filter(t => {
                              const weekAgo = new Date();
                              weekAgo.setDate(weekAgo.getDate() - 7);
                              return new Date(t.created_at) > weekAgo;
                            }).length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                          <span className="text-sm text-gray-600">Letzte 30 Tage</span>
                          <span className="text-lg font-bold text-purple-600">
                            {projectManager.tasks.filter(t => {
                              const monthAgo = new Date();
                              monthAgo.setDate(monthAgo.getDate() - 30);
                              return new Date(t.created_at) > monthAgo;
                            }).length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sentiment Statistics */}
                    <SentimentStatistics tasks={projectManager.tasks} />

                    {/* Priority Statistics */}
                    <PriorityStatistics tasks={projectManager.tasks} />
                  </div>

                  {/* Second Row - Recent Items + Top URLs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Recent Feedbacks */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                        Letzte 5 Feedbacks
                      </h3>
                      <div className="space-y-3">
                        {[...projectManager.tasks]
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .slice(0, 5)
                          .map((task) => (
                          <div key={task.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                               onClick={() => taskManager.setSelectedTaskForModal(task)}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1 mr-2">
                                <p className="text-sm font-medium text-gray-900 line-clamp-1">
                                  {task.title || 'Ohne Titel'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(task.created_at).toLocaleDateString('de-DE')} •
                                  <span className={`ml-1 ${
                                    task.status === 'open' ? 'text-red-600' :
                                    task.status === 'done' ? 'text-green-600' :
                                    task.status === 'problem' || task.status === 'warning' ? 'text-yellow-600' :
                                    task.status === 'ignore' ? 'text-gray-500' :
                                    'text-blue-600'
                                  }`}>
                                    {getStatusInfo(task.status).label}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {projectManager.tasks.length === 0 && (
                          <p className="text-sm text-gray-500">Noch keine Feedbacks vorhanden</p>
                        )}
                      </div>
                    </div>

                    {/* Recent Comments */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-green-600" />
                        Letzte 5 Kommentare
                      </h3>
                      <div className="space-y-3">
                        {taskManager.loadingComments ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                            <span className="ml-2 text-sm text-gray-500">Kommentare werden geladen...</span>
                          </div>
                        ) : taskManager.comments && taskManager.comments.length > 0 ? (
                          taskManager.comments.slice(0, 5).map((comment) => (
                            <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700 line-clamp-2">{comment.comment_text}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                <span className="font-medium">{comment.task_title}</span> •{' '}
                                {comment.author || 'Anonym'} • {new Date(comment.created_at).toLocaleDateString('de-DE')}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Noch keine Kommentare vorhanden</p>
                        )}
                      </div>
                    </div>

                    {/* Top URLs */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-4">Top 5 URLs</h3>
                      <div className="space-y-3">
                        {topUrls && topUrls.length > 0 ? (
                          topUrls.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline whitespace-nowrap max-w-[75%]"
                                title={item.url}
                              >
                                {formatUrlDisplay(item.url, 48)}
                              </a>
                              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full min-w-[2rem]">
                                {item.count}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Keine Daten vorhanden</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : projectManager.tasks.length === 0 ? (
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
                  filteredTasks={taskManager.getFilteredTasks}
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
                />
              ) : taskManager.viewMode === 'board' ? (
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
              ) : taskManager.viewMode === 'ai-board' ? (
                <AITaskBoard
                  tasks={projectManager.tasks}
                  editingTask={taskManager.editingTask}
                  editForm={taskManager.editForm}
                  onEditFormChange={taskManager.setEditForm}
                  onStartEditing={taskManager.startEditing}
                  onSaveTask={taskManager.saveTask}
                  onCancelEditing={taskManager.cancelEditing}
                  onUpdateAICategory={taskManager.updateTaskAICategory}
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
                  updatingTaskCategory={taskManager.updatingTaskCategory}
                  onDragStart={taskManager.onDragStart}
                  onDragEnd={taskManager.onDragEnd}
                />
              ) : (
                <SentimentTaskBoard
                  tasks={projectManager.tasks}
                  editingTask={taskManager.editingTask}
                  editForm={taskManager.editForm}
                  onEditFormChange={taskManager.setEditForm}
                  onStartEditing={taskManager.startEditing}
                  onSaveTask={taskManager.saveTask}
                  onCancelEditing={taskManager.cancelEditing}
                  onUpdateSentiment={taskManager.updateTaskSentimentCategory}
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
                  updatingTaskSentiment={taskManager.updatingTaskCategory}
                  onDragStart={taskManager.onDragStart}
                  onDragEnd={taskManager.onDragEnd}
                />
              )}
            </div>
          </div>

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
