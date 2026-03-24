'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth';
import { api, OnboardingStatus } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import CompanySwitcher from '@/components/CompanySwitcher';
import Logo from '@/components/Logo';

const ONBOARDING_ALLOWED_PATHS = [
  '/onboarding',
  '/settings/qbo',
  '/settings/fiscal',
  '/settings/customers',
  '/settings/vendors',
  '/settings/taxes',
  '/settings/items',
  '/settings/certificate',
  '/settings/sequences',
  '/settings/billing',
  '/settings/profile',
  '/billing/success',
  '/billing/cancelled',
  '/companies/new',
];

function isOnboardingAllowedPath(pathname: string): boolean {
  return ONBOARDING_ALLOWED_PATHS.some(
    (allowed) => pathname === allowed || pathname.startsWith(allowed + '/')
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else {
        setReady(true);
      }
    }
  }, [user, loading, router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}

function CertificateAlertBanner() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/settings/certificate') {
      setShow(false);
      return;
    }
    api.getCertificateStatus()
      .then((info) => setShow(!info.configured))
      .catch(() => {});
  }, [pathname]);

  if (!show) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
      <div className="flex items-center gap-3 max-w-6xl mx-auto">
        <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <p className="text-sm text-amber-800 flex-1">
          <span className="font-semibold">Certificado digital pendiente.</span> No podras emitir comprobantes hasta configurarlo.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://www.viafirma.do"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-xs font-medium rounded-lg hover:bg-amber-100 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            Comprar
          </a>
          <a
            href="https://wa.me/18095550000?text=Hola%2C%20necesito%20ayuda%20con%20mi%20certificado%20digital%20para%20eigdo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
            </svg>
            Asistencia
          </a>
          <a
            href="/settings/certificate"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Configurar
          </a>
        </div>
      </div>
    </div>
  );
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.getOnboardingStatus(),
      api.getSubscription().catch(() => null),
    ]).then(([status, sub]) => {
      if (!cancelled) {
        setOnboardingStatus(status);
        setHasSubscription(sub !== null && (sub.status === 'Active' || sub.status === 'Trial'));
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [pathname]);

  const isComplete =
    onboardingStatus !== null &&
    (onboardingStatus.currentStep === 'Complete' || onboardingStatus.completionPercentage >= 100);

  // User skipped certificate — allow full app access with banner
  const skippedCertificate = !isComplete && onboardingStatus !== null &&
    (onboardingStatus.currentStep === 'CertificateUpload' || onboardingStatus.currentStep === 'SequenceSetup');

  // Check localStorage flag for explicit skip
  const [userSkipped, setUserSkipped] = useState(false);
  useEffect(() => {
    setUserSkipped(localStorage.getItem('eigdo_skip_certificate') === 'true');
  }, []);

  const canAccessApp = isComplete || skippedCertificate || userSkipped;

  useEffect(() => {
    // Don't redirect if no subscription — the subscription block handles that
    if (!loading && onboardingStatus && !canAccessApp && hasSubscription !== false) {
      if (!isOnboardingAllowedPath(pathname)) {
        router.replace('/onboarding');
      }
    }
  }, [loading, onboardingStatus, pathname, router, canAccessApp, hasSubscription]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // No subscription — block everything except billing/companies pages
  if (hasSubscription === false && !isComplete) {
    const billingAllowed = pathname === '/settings/billing' || pathname === '/companies/new' || pathname.startsWith('/billing/') || pathname === '/billing/success' || pathname === '/billing/cancelled';
    if (!billingAllowed) {
      return (
        <div className="flex flex-col h-screen bg-white">
          <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <div className="h-6 w-px bg-gray-200" />
              <CompanySwitcher />
            </div>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Cerrar</button>
          </header>
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Suscripcion Requerida</h1>
              <p className="text-gray-500 mt-2">
                Debes seleccionar un plan para esta empresa antes de continuar con la configuracion.
              </p>
              <button
                onClick={() => router.push('/settings/billing')}
                className="mt-6 inline-flex px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Seleccionar Plan
              </button>
            </div>
          </main>
        </div>
      );
    }
    return (
      <div className="flex flex-col h-screen bg-white">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <Logo size="md" />
            <div className="h-6 w-px bg-gray-200" />
            <CompanySwitcher />
          </div>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Cerrar</button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl mx-auto">{children}</div>
        </main>
      </div>
    );
  }

  if (!canAccessApp) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <Logo size="md" />
            <div className="h-6 w-px bg-gray-200" />
            <CompanySwitcher />
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </header>
        <div className="w-full bg-gray-100 h-1">
          <div
            className="bg-blue-600 h-1 transition-all duration-500"
            style={{ width: `${onboardingStatus?.completionPercentage ?? 0}%` }}
          />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl mx-auto">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <CertificateAlertBanner />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <OnboardingGuard>
          {children}
        </OnboardingGuard>
      </AuthGuard>
    </AuthProvider>
  );
}
