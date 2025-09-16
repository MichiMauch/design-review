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
import { MessageSquare, Download, Calendar, Clock, Users, MessageCircle } from 'lucide-react';
import AIProjectDashboard from '../../../components/ai/AIProjectDashboard';
import { getStatusInfo } from '../../../utils/projectUtils';

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

  // Load comments when dashboard or list view is activated
  useEffect(() => {
    if (taskManager.viewMode === 'dashboard' || taskManager.viewMode === 'list') {
      taskManager.loadProjectComments();
    }
  }, [taskManager.viewMode, taskManager.loadProjectComments]);

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

      <div className="w-full px-4 py-8">
        <ProjectHeader
          project={projectManager.project}
          combinedJiraConfig={projectManager.combinedJiraConfig}
          jiraConfig={projectManager.jiraConfig}
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

                    {/* User Access */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Projekt-Zugriff
                      </h3>
                      <div className="space-y-2">
                        {projectManager.project.users ? (
                          <>
                            {projectManager.project.users.split(',').slice(0, 3).map((user, index) => (
                              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                                  {user.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <span className="text-sm text-gray-700">{user.trim()}</span>
                              </div>
                            ))}
                            {projectManager.project.users.split(',').length > 3 && (
                              <Link
                                href={`/project/${params.id}/settings`}
                                className="block w-full p-2 text-center text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg border border-purple-200 transition-colors"
                              >
                                +{projectManager.project.users.split(',').length - 3} weitere anzeigen
                              </Link>
                            )}
                          </>
                        ) : projectManager.authorizedUsers && projectManager.authorizedUsers.length > 0 ? (
                          <>
                            {projectManager.authorizedUsers.slice(0, 3).map((user) => (
                              <div key={user.email} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                <div className={`
                                  w-10 h-10 rounded-full flex items-center justify-center text-white font-medium
                                  ${user.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'}
                                `}>
                                  {(user.name || user.email).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm text-gray-700">{user.name || user.email}</span>
                                  {user.role === 'admin' && (
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                      Admin
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {projectManager.authorizedUsers.length > 3 && (
                              <Link
                                href={`/project/${params.id}/settings`}
                                className="block w-full p-2 text-center text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg border border-purple-200 transition-colors"
                              >
                                +{projectManager.authorizedUsers.length - 3} weitere anzeigen
                              </Link>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">Keine User-Informationen verfügbar</p>
                        )}
                      </div>
                    </div>

                    {/* Project Actions */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-4">Projekt-Aktionen</h3>
                      <button
                        onClick={taskManager.handleExcelExport}
                        disabled={taskManager.exportingExcel}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                      >
                        {taskManager.exportingExcel ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                            Exportiere...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Als Excel exportieren
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Second Row - Recent Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recent Feedbacks */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                        Letzte 5 Feedbacks
                      </h3>
                      <div className="space-y-3">
                        {projectManager.tasks.slice(0, 5).map((task) => (
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
                  </div>

                  {/* AI Dashboard - full width */}
                  <AIProjectDashboard
                    tasks={projectManager.tasks}
                    projectId={params.id}
                    onTasksUpdate={projectManager.setTasks}
                  />
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