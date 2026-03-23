'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, type AdminUser } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                     */
/* ------------------------------------------------------------------ */

type SystemRole = 'SuperAdmin' | 'Admin' | 'Support';

interface CurrentUser {
  firstName: string;
  lastName: string;
  email: string;
  systemRole?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  systemRole: string;
}

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'SuperAdmin',
  Admin: 'Admin',
  Support: 'Soporte',
};

const ROLE_COLORS: Record<string, { bg: string; text: string; avatar: string }> = {
  SuperAdmin: { bg: 'bg-blue-100', text: 'text-blue-700', avatar: 'bg-blue-500' },
  Admin: { bg: 'bg-indigo-100', text: 'text-indigo-700', avatar: 'bg-indigo-500' },
  Support: { bg: 'bg-gray-100', text: 'text-gray-600', avatar: 'bg-gray-400' },
};

function getRoleStyle(role: string) {
  return ROLE_COLORS[role] || ROLE_COLORS.Support;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

function getCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('eigdo_admin_user');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

function canManageUsers(role?: string): boolean {
  return role === 'SuperAdmin' || role === 'Admin';
}

function getAvailableRoles(currentRole?: string): { value: string; label: string }[] {
  if (currentRole === 'SuperAdmin') {
    return [
      { value: 'Admin', label: 'Admin' },
      { value: 'Support', label: 'Soporte' },
    ];
  }
  if (currentRole === 'Admin') {
    return [{ value: 'Support', label: 'Soporte' }];
  }
  return [];
}

function canEditUser(currentRole?: string, targetRole?: string): boolean {
  if (currentRole === 'SuperAdmin') return targetRole !== 'SuperAdmin';
  if (currentRole === 'Admin') return targetRole === 'Support';
  return false;
}

/* ------------------------------------------------------------------ */
/*  Skeleton card                                                       */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-gray-200 rounded-lg w-36 mb-2" />
          <div className="h-3 bg-gray-100 rounded-lg w-48" />
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-20" />
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="h-3 bg-gray-100 rounded-lg w-24" />
        <div className="flex gap-2">
          <div className="h-8 bg-gray-200 rounded-lg w-8" />
          <div className="h-8 bg-gray-200 rounded-lg w-8" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center px-6">
      <div className="w-24 h-24 mb-6 rounded-full bg-gray-100 flex items-center justify-center">
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin usuarios registrados</h3>
      <p className="text-sm text-gray-500 max-w-sm">
        Aun no hay usuarios con acceso al panel de administracion. Crea el primer usuario para comenzar.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser] = useState<CurrentUser | null>(() => getCurrentUser());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    systemRole: 'Support',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Confirm dialog
  const [confirmUser, setConfirmUser] = useState<AdminUser | null>(null);
  const [toggling, setToggling] = useState(false);

  const loadUsers = useCallback(() => {
    setLoading(true);
    adminApi.getAdminUsers()
      .then((data) => setUsers(data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const myRole = currentUser?.systemRole;
  const hasManageAccess = canManageUsers(myRole);
  const availableRoles = getAvailableRoles(myRole);

  /* ---- Modal handlers ---- */

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      systemRole: availableRoles[0]?.value || 'Support',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      systemRole: user.systemRole,
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setFormError('');
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      setFormError('Todos los campos son requeridos.');
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      setFormError('La contrasena es requerida para nuevos usuarios.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingUser) {
        await adminApi.updateAdminUser(editingUser.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          systemRole: formData.systemRole,
        });
      } else {
        await adminApi.createAdminUser({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          systemRole: formData.systemRole,
        });
      }
      closeModal();
      loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar usuario.');
    } finally {
      setSaving(false);
    }
  };

  /* ---- Toggle active ---- */

  const handleToggleActive = async () => {
    if (!confirmUser) return;
    setToggling(true);
    try {
      await adminApi.updateAdminUser(confirmUser.id, {
        isActive: !confirmUser.isActive,
      });
      setConfirmUser(null);
      loadUsers();
    } catch { /* ignore */ }
    finally { setToggling(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios del Sistema</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Gestiona los usuarios con acceso al panel de administracion
            {!loading && <span className="text-gray-400"> &middot; {users.length} usuario{users.length !== 1 ? 's' : ''}</span>}
          </p>
        </div>

        {hasManageAccess && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl
              hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* User cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : users.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-gray-200 shadow-sm">
            <EmptyState />
          </div>
        ) : (
          users.map((user) => {
            const style = getRoleStyle(user.systemRole);
            const editable = hasManageAccess && canEditUser(myRole, user.systemRole);
            return (
              <div key={user.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
                {/* Top row: avatar + info + badge */}
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${style.avatar} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {user.firstName} {user.lastName}
                      </h3>
                      {/* Status dot */}
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${user.isActive ? 'bg-emerald-500' : 'bg-red-400'}`}
                        title={user.isActive ? 'Activo' : 'Inactivo'}
                      />
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                  </div>
                  <span className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                    {ROLE_LABELS[user.systemRole] || user.systemRole}
                  </span>
                </div>

                {/* Bottom row: date + actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    Creado {new Date(user.createdAtUtc).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>

                  {editable && (
                    <div className="flex items-center gap-1.5">
                      {/* Edit button */}
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>

                      {/* Toggle active button */}
                      <button
                        onClick={() => setConfirmUser(user)}
                        className={`p-2 rounded-lg transition-colors duration-150 ${
                          user.isActive
                            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={user.isActive ? 'Desactivar' : 'Activar'}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          {user.isActive ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ---- Create/Edit Modal ---- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 z-10">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {editingUser ? 'Modifica los datos del usuario.' : 'Completa los datos para crear un nuevo usuario.'}
              </p>
            </div>

            {formError && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nombre</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
                      placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                      transition-all duration-200"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Apellido</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
                      placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                      transition-all duration-200"
                    placeholder="Perez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                    transition-all duration-200"
                  placeholder="juan@empresa.com"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contrasena</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
                      placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                      transition-all duration-200"
                    placeholder="Minimo 8 caracteres"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rol</label>
                <select
                  value={formData.systemRole}
                  onChange={(e) => setFormData({ ...formData, systemRole: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                    transition-all duration-200"
                >
                  {availableRoles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl
                  hover:bg-gray-200 transition-colors duration-150"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl
                  hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {saving ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Confirm Dialog ---- */}
      {confirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !toggling && setConfirmUser(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 z-10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                confirmUser.isActive ? 'bg-red-100' : 'bg-emerald-100'
              }`}>
                <svg className={`w-5 h-5 ${confirmUser.isActive ? 'text-red-600' : 'text-emerald-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  {confirmUser.isActive ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {confirmUser.isActive ? 'Desactivar Usuario' : 'Activar Usuario'}
                </h3>
                <p className="text-sm text-gray-500">
                  {confirmUser.firstName} {confirmUser.lastName}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              {confirmUser.isActive
                ? 'Este usuario perdera acceso al panel de administracion. Puedes reactivarlo en cualquier momento.'
                : 'Este usuario recuperara acceso al panel de administracion.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => setConfirmUser(null)}
                disabled={toggling}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl
                  hover:bg-gray-200 transition-colors duration-150 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleToggleActive}
                disabled={toggling}
                className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
                    confirmUser.isActive
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
              >
                {toggling
                  ? 'Procesando...'
                  : confirmUser.isActive
                    ? 'Desactivar'
                    : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
