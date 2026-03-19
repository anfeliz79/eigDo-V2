'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/companies', label: 'Empresas', icon: '🏢' },
  { href: '/plans', label: 'Planes', icon: '💳' },
  { href: '/audit', label: 'Auditoria', icon: '📋' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ fullName: string; email: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('eigdo_admin_token');
    const stored = localStorage.getItem('eigdo_admin_user');
    if (!token) {
      router.replace('/login');
      return;
    }
    if (stored) setUser(JSON.parse(stored));
    setReady(true);
  }, [router]);

  if (!ready) {
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700" /></div>;
  }

  const logout = () => {
    localStorage.removeItem('eigdo_admin_token');
    localStorage.removeItem('eigdo_admin_user');
    router.replace('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-slate-700">
          <span className="text-xl font-extrabold tracking-tight">
            <span className="text-white/80">eig</span>
            <span className="text-blue-400">Do</span>
          </span>
          <span className="ml-2 px-1.5 py-0.5 bg-blue-500 text-[10px] font-bold rounded uppercase">Admin</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-slate-700">
          <p className="px-3 text-sm text-slate-400 truncate">{user?.email || 'admin'}</p>
          <button
            onClick={logout}
            className="w-full mt-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition text-left"
          >
            Cerrar Sesion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-slate-100">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
