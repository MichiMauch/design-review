import CreateUserForm from './CreateUserForm';
import UsersTable from './UsersTable';
import UserDetailModal from './UserDetailModal';

export default function UsersTab({
  users,
  isCreatingUser,
  onCreateUser,
  selectedUser,
  userProjects,
  loadingUserProjects,
  onUserClick,
  onCloseUserDetail,
  onUpdateUser,
  onToggleProjectAccess,
  onDeleteUser,
  updating,
  deleting
}) {
  return (
    <div>
      <CreateUserForm
        onCreateUser={onCreateUser}
        isCreating={isCreatingUser}
      />

      <UsersTable
        users={users}
        onUserClick={onUserClick}
      />

      <UserDetailModal
        user={selectedUser}
        projects={userProjects}
        loadingProjects={loadingUserProjects}
        onUpdateUser={onUpdateUser}
        onToggleProjectAccess={onToggleProjectAccess}
        onDeleteUser={onDeleteUser}
        onClose={onCloseUserDetail}
        updating={updating}
        deleting={deleting}
      />
    </div>
  );
}