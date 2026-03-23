'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, type ProfileResponse } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Password strength helpers                                          */
/* ------------------------------------------------------------------ */

type PasswordStrength = 'weak' | 'medium' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

const strengthConfig: Record<PasswordStrength, { label: string; color: string; bg: string; width: string }> = {
  weak: { label: 'Debil', color: 'text-red-600', bg: 'bg-red-500', width: 'w-1/3' },
  medium: { label: 'Media', color: 'text-yellow-600', bg: 'bg-yellow-500', width: 'w-2/3' },
  strong: { label: 'Fuerte', color: 'text-green-600', bg: 'bg-green-500', width: 'w-full' },
};

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons                                                   */
/* ------------------------------------------------------------------ */

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Message component                                                  */
/* ------------------------------------------------------------------ */

function Message({ type, text }: { type: 'success' | 'error'; text: string }) {
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-medium ${
        type === 'success'
          ? 'bg-green-50 text-green-700 border border-green-100'
          : 'bg-red-50 text-red-700 border border-red-100'
      }`}
    >
      {type === 'success' ? <CheckCircleIcon /> : <XCircleIcon />}
      {text}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Password input with eye toggle                                     */
/* ------------------------------------------------------------------ */

function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main profile page                                                  */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  // Profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    adminApi
      .getProfile()
      .then((data) => {
        setProfile(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
      })
      .catch(() => setProfileMsg({ type: 'error', text: 'Error al cargar el perfil.' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = useCallback(async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      if (!firstName.trim() || !lastName.trim()) {
        setProfileMsg({ type: 'error', text: 'Nombre y apellido son requeridos.' });
        return;
      }
      await adminApi.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
      setProfileMsg({ type: 'success', text: 'Perfil actualizado exitosamente.' });

      // Update localStorage so the layout sidebar reflects changes
      const stored = localStorage.getItem('eigdo_admin_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.firstName = firstName.trim();
        parsed.lastName = lastName.trim();
        localStorage.setItem('eigdo_admin_user', JSON.stringify(parsed));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el perfil.';
      setProfileMsg({ type: 'error', text: errorMessage });
    } finally {
      setSavingProfile(false);
    }
  }, [firstName, lastName]);

  const handleChangePassword = useCallback(async () => {
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      if (newPassword.length < 8) {
        setPasswordMsg({ type: 'error', text: 'La nueva contrasena debe tener al menos 8 caracteres.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordMsg({ type: 'error', text: 'Las contrasenas no coinciden.' });
        return;
      }
      await adminApi.changePassword({ currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Contrasena actualizada exitosamente.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cambiar la contrasena.';
      setPasswordMsg({ type: 'error', text: errorMessage });
    } finally {
      setSavingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const strength = newPassword ? getPasswordStrength(newPassword) : null;
  const strengthInfo = strength ? strengthConfig[strength] : null;

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-500 mt-2">Administra tu informacion personal</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  const roleBadgeColor =
    profile?.systemRole === 'SuperAdmin'
      ? 'bg-purple-50 text-purple-700 ring-purple-200'
      : profile?.systemRole === 'Admin'
        ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : 'bg-gray-50 text-gray-700 ring-gray-200';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-500 mt-2">Administra tu informacion personal</p>
      </div>

      {/* Section 1: Personal Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">
          Informacion Personal
        </h2>

        {profileMsg && <div className="mb-6"><Message type={profileMsg.type} text={profileMsg.text} /></div>}

        <div className="space-y-5">
          {/* Two-column: Nombre, Apellido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellido</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo Electronico</label>
            <div className="relative">
              <input
                type="text"
                value={profile?.email ?? ''}
                readOnly
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <LockIcon />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">El correo electronico no se puede modificar</p>
          </div>

          {/* Role (read-only badge) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol</label>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ring-1 ${roleBadgeColor}`}
            >
              {profile?.systemRole ?? 'Usuario'}
            </span>
          </div>

          {/* Created date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de Registro</label>
            <p className="text-sm text-gray-600">
              {profile?.createdAtUtc
                ? new Date(profile.createdAtUtc).toLocaleDateString('es-DO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '-'}
            </p>
          </div>

          {/* Save button */}
          <div className="pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {savingProfile ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </span>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Change Password */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">
          Cambiar Contrasena
        </h2>

        {passwordMsg && <div className="mb-6"><Message type={passwordMsg.type} text={passwordMsg.text} /></div>}

        <div className="space-y-5 max-w-md">
          <PasswordInput
            label="Contrasena Actual"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Ingresa tu contrasena actual"
          />

          <div>
            <PasswordInput
              label="Nueva Contrasena"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Minimo 8 caracteres"
            />
            {/* Strength indicator */}
            {strengthInfo && (
              <div className="mt-2">
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strengthInfo.bg} ${strengthInfo.width}`}
                  />
                </div>
                <p className={`text-xs mt-1 font-medium ${strengthInfo.color}`}>
                  Seguridad: {strengthInfo.label}
                </p>
              </div>
            )}
          </div>

          <PasswordInput
            label="Confirmar Nueva Contrasena"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Repite la nueva contrasena"
          />

          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-500 font-medium">Las contrasenas no coinciden</p>
          )}

          <div className="pt-2">
            <button
              onClick={handleChangePassword}
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {savingPassword ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Actualizando...
                </span>
              ) : (
                'Actualizar Contrasena'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
