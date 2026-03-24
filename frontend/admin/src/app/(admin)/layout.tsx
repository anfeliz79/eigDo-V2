'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Navigation structure grouped semantically                          */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5',
      },
      {
        href: '/companies',
        label: 'Empresas',
        icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
      },
      {
        href: '/plans',
        label: 'Planes',
        icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
      },
      {
        href: '/tickets',
        label: 'Soporte',
        icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155',
      },
    ],
  },
  {
    title: 'Pagos',
    items: [
      {
        href: '/gateways',
        label: 'Pasarelas',
        icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      },
    ],
  },
  {
    title: 'Configuración',
    items: [
      {
        href: '/settings/platform',
        label: 'Plataforma',
        icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',
      },
      {
        href: '/settings/qbo-app',
        label: 'Config QBO',
        icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      },
      {
        href: '/settings/alanube',
        label: 'Alanube',
        icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
      },
      {
        href: '/audit',
        label: 'Auditoría',
        icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
      },
      {
        href: '/users',
        label: 'Usuarios',
        icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
      },
    ],
  },
];

/* Breadcrumb label map */
const breadcrumbLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  companies: 'Empresas',
  plans: 'Planes',
  tickets: 'Soporte',
  gateways: 'Pasarelas',
  audit: 'Auditoría',
  users: 'Usuarios',
  settings: 'Configuración',
  platform: 'Plataforma',
  'qbo-app': 'Config QBO',
  alanube: 'Alanube',
  profile: 'Mi Perfil',
};

/* ------------------------------------------------------------------ */
/*  Icon component                                                     */
/* ------------------------------------------------------------------ */

function NavIcon({ d, className = 'w-5 h-5' }: { d: string; className?: string }) {
  return (
    <svg className={`${className} shrink-0`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar content (shared between desktop & mobile)                  */
/* ------------------------------------------------------------------ */

function SidebarContent({
  pathname,
  user,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  user: { firstName: string; lastName: string; email: string } | null;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800/60">
        <span className="text-xl font-extrabold tracking-tight select-none">
          <span className="text-white">eig</span>
          <span className="text-blue-500">Do</span>
        </span>
        <span className="ml-2.5 px-2 py-0.5 bg-blue-500/15 text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wide ring-1 ring-blue-500/25">
          Admin
        </span>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 pt-6 pb-4 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 select-none">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <NavIcon
                      d={item.icon}
                      className={`w-5 h-5 transition-colors duration-150 ${
                        active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom user section */}
      <div className="px-3 py-4 border-t border-slate-800/60">
        <Link
          href="/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 mb-3 rounded-lg py-2 hover:bg-slate-800/50 transition-colors duration-150 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 uppercase shrink-0">
            {user?.firstName?.[0] ?? user?.email?.[0] ?? 'A'}
          </div>
          <div className="min-w-0">
            {user?.firstName && (
              <p className="text-sm font-medium text-slate-200 truncate">
                {user.firstName} {user.lastName}
              </p>
            )}
            <p className="text-xs text-slate-500 truncate">{user?.email ?? 'admin'}</p>
          </div>
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors duration-150 text-left"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
            />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Breadcrumb                                                         */
/* ------------------------------------------------------------------ */

function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean);

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
      {segments.map((seg, i) => {
        const label = breadcrumbLabels[seg] ?? seg;
        const isLast = i === segments.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className={isLast ? 'font-medium text-slate-700' : 'text-slate-400'}>
              {label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main layout                                                        */
/* ------------------------------------------------------------------ */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ firstName: string; lastName: string; email: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const logout = useCallback(() => {
    localStorage.removeItem('eigdo_admin_token');
    localStorage.removeItem('eigdo_admin_user');
    router.replace('/login');
  }, [router]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ---- Mobile overlay ---- */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSidebar}
      />

      {/* ---- Mobile sidebar ---- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 transform transition-transform duration-300 ease-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent pathname={pathname} user={user} onNavigate={closeSidebar} onLogout={logout} />
      </aside>

      {/* ---- Desktop sidebar ---- */}
      <aside className="hidden md:flex w-64 bg-slate-950 flex-col shrink-0">
        <SidebarContent pathname={pathname} user={user} onNavigate={() => {}} onLogout={logout} />
      </aside>

      {/* ---- Main content area ---- */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors md:hidden"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            </button>

            {/* Mobile logo */}
            <div className="flex items-center gap-2 md:hidden">
              <span className="text-lg font-extrabold tracking-tight select-none">
                <span className="text-slate-900">eig</span>
                <span className="text-blue-600">Do</span>
              </span>
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-full uppercase tracking-wide ring-1 ring-blue-200">
                Admin
              </span>
            </div>

            {/* Desktop breadcrumb */}
            <div className="hidden md:block">
              <Breadcrumb pathname={pathname} />
            </div>
          </div>

          {/* Right side: user avatar */}
          <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="hidden sm:block text-right mr-1">
              <p className="text-sm font-medium text-slate-700 leading-tight">
                {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Admin'}
              </p>
              <p className="text-xs text-slate-400 leading-tight">{user?.email ?? ''}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm">
              {user?.firstName?.[0] ?? user?.email?.[0] ?? 'A'}
            </div>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
