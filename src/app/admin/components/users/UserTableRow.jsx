import { Edit2, Trash2, CheckSquare, Users } from 'lucide-react';
import { formatDate, getRoleBadgeClass, getProjectBadgeClass } from '../../services/utils';

export default function UserTableRow({
  user,
  isEditing,
  editUserForm,
  onEditFormChange,
  onStartEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  onOpenProjectManager
}) {
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        {isEditing ? (
          <input
            type="text"
            value={editUserForm.name}
            onChange={(e) => onEditFormChange({ ...editUserForm, name: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        ) : (
          <div className="text-sm font-medium text-gray-900">{user.name}</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {isEditing ? (
          <input
            type="email"
            value={editUserForm.email}
            onChange={(e) => onEditFormChange({ ...editUserForm, email: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        ) : (
          <div className="text-sm text-gray-900">{user.email}</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {isEditing ? (
          <select
            value={editUserForm.role}
            onChange={(e) => onEditFormChange({ ...editUserForm, role: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
            {user.role}
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {user.projects && user.projects.length > 0 ? (
              user.projects.map((project, index) => (
                <span
                  key={project.id}
                  title={project.domain}
                  className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getProjectBadgeClass(index)}`}
                >
                  {project.name.length > 15 ? `${project.name.substring(0, 15)}...` : project.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500 italic">
                Keine Projekte
              </span>
            )}
          </div>
          <button
            onClick={() => onOpenProjectManager(user)}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600 flex items-center gap-1 ml-1"
            title="Projekt-Zugriffe verwalten"
          >
            <Users className="h-3 w-3" />
          </button>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.created_at ? formatDate(user.created_at) : 'Unbekannt'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate(user.id)}
              className="text-green-600 hover:text-green-900"
            >
              <CheckSquare className="h-4 w-4" />
            </button>
            <button
              onClick={onCancelEdit}
              className="text-gray-600 hover:text-gray-900"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onStartEdit(user)}
              className="text-blue-600 hover:text-blue-900"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(user.id)}
              className="text-red-600 hover:text-red-900"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}