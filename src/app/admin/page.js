'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';

// Components
import AdminHeader from './components/AdminHeader';
import TabNavigation from './components/TabNavigation';
import LoadingSpinner from './components/shared/LoadingSpinner';

// Lazy load tab components for better performance
const StatsTab = lazy(() => import('./components/stats/StatsTab'));
const UsersTab = lazy(() => import('./components/users/UsersTab'));
const TasksTab = lazy(() => import('./components/tasks/TasksTab'));
const SettingsTab = lazy(() => import('./components/settings/SettingsTab'));

// Hooks
import { useAdminData } from './hooks/useAdminData';
import { useUserManagement } from './hooks/useUserManagement';
import { useProjectAccess } from './hooks/useProjectAccess';
import { useSettings } from './hooks/useSettings';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('stats');
  const [filter, setFilter] = useState('all');

  // Admin data management
  const {
    tasks,
    stats,
    projects,
    allProjects,
    loading,
    error,
    refetch
  } = useAdminData();

  // User management
  const {
    users,
    loading: usersLoading,
    isCreatingUser,
    editingUser,
    editUserForm,
    setEditUserForm,
    loadUsers,
    createUser,
    startEditUser,
    cancelEdit,
    updateUser,
    deleteUser
  } = useUserManagement();

  // Project access management
  const {
    managingProjectsUser,
    userProjectAccess,
    loadingProjectAccess,
    toggleProjectAccess,
    openProjectManager,
    closeProjectManager
  } = useProjectAccess();

  // Settings management
  const {
    settings,
    loading: settingsLoading,
    updateSetting,
    getR2Url
  } = useSettings();

  // Load users when component mounts
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Show loading state
  if (loading || usersLoading || settingsLoading) {
    return <LoadingSpinner />;
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Fehler beim Laden</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AdminHeader />
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content with Suspense for lazy loading */}
        <Suspense fallback={<LoadingSpinner fullScreen={false} />}>
          {activeTab === 'stats' && (
            <StatsTab
              tasks={tasks}
              projects={projects}
              stats={stats}
              users={users}
              allProjects={allProjects}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab
              users={users}
              isCreatingUser={isCreatingUser}
              editingUser={editingUser}
              editUserForm={editUserForm}
              onEditFormChange={setEditUserForm}
              onCreateUser={createUser}
              onStartEdit={startEditUser}
              onUpdate={updateUser}
              onCancelEdit={cancelEdit}
              onDelete={deleteUser}
              managingProjectsUser={managingProjectsUser}
              userProjectAccess={userProjectAccess}
              loadingProjectAccess={loadingProjectAccess}
              onToggleProjectAccess={toggleProjectAccess}
              onOpenProjectManager={openProjectManager}
              onCloseProjectManager={closeProjectManager}
            />
          )}

          {activeTab === 'feedback' && (
            <TasksTab
              tasks={tasks}
              projects={projects}
              allProjects={allProjects}
              filter={filter}
              onFilterChange={setFilter}
              r2Url={getR2Url()}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              settings={settings}
              loading={settingsLoading}
              onUpdateSetting={updateSetting}
            />
          )}
        </Suspense>
      </div>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#EF4444',
            },
          },
        }}
      />
    </div>
  );
}