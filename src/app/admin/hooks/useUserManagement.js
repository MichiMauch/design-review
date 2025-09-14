import { useState, useCallback } from 'react';
import { usersApi } from '../services/adminApi';
import toast from 'react-hot-toast';

export function useUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ email: '', name: '', role: 'user' });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usersApi.fetchUsers();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (newUser) => {
    if (!newUser.email.trim() || !newUser.name.trim()) {
      toast.error('E-Mail und Name sind erforderlich');
      return false;
    }

    setIsCreatingUser(true);
    try {
      const data = await usersApi.createUser(newUser);
      if (data.success) {
        toast.success('Benutzer erfolgreich erstellt!');
        await loadUsers();
        return true;
      }
    } catch (error) {
      toast.error(`Fehler: ${error.message}`);
      return false;
    } finally {
      setIsCreatingUser(false);
    }
  }, [loadUsers]);

  const startEditUser = useCallback((user) => {
    setEditingUser(user.id);
    setEditUserForm({
      email: user.email,
      name: user.name,
      role: user.role
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingUser(null);
    setEditUserForm({ email: '', name: '', role: 'user' });
  }, []);

  const updateUser = useCallback(async (userId) => {
    try {
      const data = await usersApi.updateUser(userId, editUserForm);
      if (data.success) {
        toast.success('Benutzer erfolgreich aktualisiert!');
        setEditingUser(null);
        await loadUsers();
        return true;
      }
    } catch (error) {
      toast.error(`Fehler: ${error.message}`);
      return false;
    }
  }, [editUserForm, loadUsers]);

  const deleteUser = useCallback(async (userId) => {
    if (!confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
      return false;
    }

    try {
      const data = await usersApi.deleteUser(userId);
      if (data.success) {
        toast.success('Benutzer erfolgreich gelöscht!');
        await loadUsers();
        return true;
      }
    } catch (error) {
      toast.error(`Fehler: ${error.message}`);
      return false;
    }
  }, [loadUsers]);

  return {
    users,
    loading,
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
  };
}