import UserTableRow from './UserTableRow';

export default function UsersTable({
  users,
  editingUser,
  editUserForm,
  onEditFormChange,
  onStartEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  onOpenProjectManager
}) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-medium text-gray-900">Benutzer Verwaltung</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                E-Mail
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rolle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Projekte
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Erstellt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <UserTableRow
                key={user.id}
                user={user}
                isEditing={editingUser === user.id}
                editUserForm={editUserForm}
                onEditFormChange={onEditFormChange}
                onStartEdit={onStartEdit}
                onUpdate={onUpdate}
                onCancelEdit={onCancelEdit}
                onDelete={onDelete}
                onOpenProjectManager={onOpenProjectManager}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}