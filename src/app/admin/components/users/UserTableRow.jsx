import { Eye } from 'lucide-react';
import { formatDate, getRoleBadgeClass } from '../../services/utils';

export default function UserTableRow({
  user,
  onUserClick
}) {
  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer"
      onClick={() => onUserClick(user)}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{user.name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{user.email}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
          {user.role}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.created_at ? formatDate(user.created_at) : 'Unbekannt'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUserClick(user);
          }}
          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
          title="Benutzer bearbeiten"
        >
          <Eye className="h-4 w-4" />
          Bearbeiten
        </button>
      </td>
    </tr>
  );
}