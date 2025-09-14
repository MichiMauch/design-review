import { useState } from 'react';
import { UserPlus } from 'lucide-react';

export default function CreateUserForm({ onCreateUser, isCreating }) {
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'user' });

  const handleSubmit = async () => {
    const success = await onCreateUser(newUser);
    if (success) {
      setNewUser({ email: '', name: '', role: 'user' });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">Neuen Benutzer erstellen</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="email"
          placeholder="E-Mail Adresse"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        <input
          type="text"
          placeholder="Name"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="mt-4">
        <button
          onClick={handleSubmit}
          disabled={isCreating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? 'Erstelle...' : 'Benutzer erstellen'}
        </button>
      </div>
    </div>
  );
}