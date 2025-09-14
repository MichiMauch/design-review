import CreateUserForm from './CreateUserForm';
import UsersTable from './UsersTable';
import ProjectAccessModal from './ProjectAccessModal';

export default function UsersTab({
  users,
  isCreatingUser,
  editingUser,
  editUserForm,
  onEditFormChange,
  onCreateUser,
  onStartEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  managingProjectsUser,
  userProjectAccess,
  loadingProjectAccess,
  onToggleProjectAccess,
  onOpenProjectManager,
  onCloseProjectManager
}) {
  return (
    <div>
      <CreateUserForm
        onCreateUser={onCreateUser}
        isCreating={isCreatingUser}
      />

      <UsersTable
        users={users}
        editingUser={editingUser}
        editUserForm={editUserForm}
        onEditFormChange={onEditFormChange}
        onStartEdit={onStartEdit}
        onUpdate={onUpdate}
        onCancelEdit={onCancelEdit}
        onDelete={onDelete}
        onOpenProjectManager={onOpenProjectManager}
      />

      <ProjectAccessModal
        user={managingProjectsUser}
        projects={userProjectAccess}
        loading={loadingProjectAccess}
        onToggleAccess={onToggleProjectAccess}
        onClose={onCloseProjectManager}
      />
    </div>
  );
}