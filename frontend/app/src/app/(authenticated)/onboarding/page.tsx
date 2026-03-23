'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { api, type OnboardingStatus, type SubscriptionInfo } from '@/lib/api';

/* ────────────────────────────────────────────
   Step definitions
   ──────────────────────────────────────────── */

const steps = [
  {
    key: 'QboConnection',
    label: 'QBO',
    desc: 'Conecta tu cuenta para importar datos de empresa, clientes y proveedores',
    href: '/settings/qbo',
    icon: CloudIcon,
  },
  {
    key: 'CompanyData',
    label: 'Datos Fiscales',
    desc: 'RNC, razon social, datos del emisor (pre-cargados desde QBO)',
    href: '/settings/fiscal',
    icon: BuildingIcon,
  },
  {
    key: 'CustomerMapping',
    label: 'Clientes',
    desc: 'Asocia clientes QBO con datos fiscales DGII',
    href: '/settings/customers',
    icon: UsersIcon,
  },
  {
    key: 'VendorMapping',
    label: 'Proveedores',
    desc: 'Asocia proveedores QBO con datos fiscales DGII',
    href: '/settings/vendors',
    icon: TruckIcon,
  },
  {
    key: 'TaxMapping',
    label: 'Impuestos',
    desc: 'Configura indicadores de facturacion ITBIS',
    href: '/settings/taxes',
    icon: CalculatorIcon,
  },
  {
    key: 'ItemOverrides',
    label: 'Items',
    desc: 'Unidad de medida y tipo bien/servicio (opcional)',
    href: '/settings/items',
    icon: CubeIcon,
  },
  {
    key: 'CertificateUpload',
    label: 'Certificado',
    desc: 'Sube tu certificado de firma digital',
    href: '/settings/certificate',
    icon: ShieldIcon,
  },
  {
    key: 'SequenceSetup',
    label: 'Secuencias',
    desc: 'Configura rangos de numeracion DGII',
    href: '/settings/sequences',
    icon: HashIcon,
  },
];

/* ────────────────────────────────────────────
   Inline SVG Icons (heroicons-style, 24x24)
   ──────────────────────────────────────────── */

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function CalculatorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007v-.008Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
    </svg>
  );
}

function CubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

/* ────────────────────────────────────────────
   CSS keyframes (injected once via <style>)
   ──────────────────────────────────────────── */

const wizardStyles = `
@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(37, 99, 235, 0); }
  100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
}
@keyframes confetti-fall {
  0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
}
@keyframes toast-slide-in {
  0% { transform: translateX(100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes toast-slide-out {
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}
@keyframes fade-in-up {
  0% { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes scale-check {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
.animate-pulse-ring {
  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.animate-confetti {
  animation: confetti-fall 1.5s ease-in forwards;
}
.animate-toast-in {
  animation: toast-slide-in 0.4s ease-out forwards;
}
.animate-toast-out {
  animation: toast-slide-out 0.3s ease-in forwards;
}
.animate-fade-in-up {
  animation: fade-in-up 0.5s ease-out forwards;
}
.animate-scale-check {
  animation: scale-check 0.5s ease-out forwards;
}
`;

/* ────────────────────────────────────────────
   Confetti particles (pure CSS)
   ──────────────────────────────────────────── */

function ConfettiParticles() {
  const colors = ['#22C55E', '#2563EB', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.2}s`,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 6,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: p.left,
            top: '-10px',
            animationDelay: p.delay,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.size > 9 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────
   Toast notification
   ──────────────────────────────────────────── */

function QboToast({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-6 right-6 z-50">
      <div
        className={`flex items-center gap-3 bg-white border border-green-200 shadow-lg rounded-xl px-5 py-4 max-w-sm ${
          exiting ? 'animate-toast-out' : 'animate-toast-in'
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <CheckIcon className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">QuickBooks conectado</p>
          <p className="text-xs text-gray-500 mt-0.5">Los datos se importaran automaticamente.</p>
        </div>
        <button
          onClick={() => { setExiting(true); setTimeout(onClose, 300); }}
          className="text-gray-400 hover:text-gray-600 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Stepper circle
   ──────────────────────────────────────────── */

function StepCircle({
  step,
  index,
  state,
  onClick,
}: {
  step: (typeof steps)[number];
  index: number;
  state: 'completed' | 'active' | 'pending' | 'locked';
  onClick: () => void;
}) {
  const Icon = step.icon;

  const circleClasses = {
    completed: 'bg-[#22C55E] text-white border-[#22C55E] cursor-pointer',
    active: 'bg-[#2563EB] text-white border-[#2563EB] animate-pulse-ring cursor-pointer',
    pending: 'bg-white text-gray-400 border-[#D1D5DB] cursor-default',
    locked: 'bg-white text-gray-300 border-[#D1D5DB] cursor-not-allowed',
  };

  const labelClasses = {
    completed: 'text-green-700 font-medium',
    active: 'text-blue-700 font-semibold',
    pending: 'text-gray-400',
    locked: 'text-gray-300',
  };

  return (
    <button
      onClick={onClick}
      disabled={state === 'locked' || state === 'pending'}
      className="flex flex-col items-center gap-2 shrink-0 group"
      aria-label={`Paso ${index + 1}: ${step.label}`}
    >
      <div
        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${circleClasses[state]}`}
      >
        {state === 'completed' ? (
          <CheckIcon className="w-5 h-5" />
        ) : state === 'locked' ? (
          <LockIcon className="w-4 h-4" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </div>
      <span className={`text-[11px] leading-tight text-center max-w-[72px] ${labelClasses[state]}`}>
        {step.label}
      </span>
    </button>
  );
}

/* ────────────────────────────────────────────
   Connector line between steps
   ──────────────────────────────────────────── */

function ConnectorLine({ state }: { state: 'completed' | 'pending' }) {
  return (
    <div className="flex-1 min-w-[24px] h-0.5 self-start mt-5 mx-1 rounded-full transition-colors duration-500">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          state === 'completed' ? 'bg-[#22C55E]' : 'bg-[#D1D5DB]'
        }`}
      />
    </div>
  );
}

/* ────────────────────────────────────────────
   Main wizard content
   ──────────────────────────────────────────── */

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQboToast, setShowQboToast] = useState(false);

  useEffect(() => {
    if (searchParams.get('qbo') === 'connected') {
      setShowQboToast(true);
      window.history.replaceState({}, '', '/onboarding');
    }

    Promise.all([
      api.getOnboardingStatus(),
      api.getSubscription().catch(() => null),
    ])
      .then(([onboardingStatus, sub]) => {
        setStatus(onboardingStatus);
        setSubscription(sub);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [searchParams]);

  const dismissToast = useCallback(() => setShowQboToast(false), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  /* ── Step state helpers ─────────────────── */

  const missingItems = status?.missingItems || {};
  const currentStep = status?.currentStep || 'NotStarted';
  const stepKeys = steps.map((s) => s.key);
  const currentStepIndex = stepKeys.indexOf(currentStep);
  const completionPct = status?.completionPercentage || 0;

  const isStepComplete = (key: string): boolean => {
    const idx = stepKeys.indexOf(key);
    if (idx < currentStepIndex) return true;
    if (idx === currentStepIndex) return !(key in missingItems);
    return false;
  };

  const isStepAccessible = (index: number): boolean => {
    if (index === 0) return true;
    return isStepComplete(steps[index - 1].key);
  };

  const getStepState = (index: number): 'completed' | 'active' | 'pending' | 'locked' => {
    const key = steps[index].key;
    if (isStepComplete(key)) return 'completed';
    if (isStepAccessible(index)) return 'active';
    return 'locked';
  };

  /* ── Completion screen ──────────────────── */

  if (currentStep === 'Complete' || completionPct === 100) {
    return (
      <div className="relative max-w-2xl mx-auto text-center py-20">
        <style dangerouslySetInnerHTML={{ __html: wizardStyles }} />
        <ConfettiParticles />
        <div className="relative z-10 animate-fade-in-up">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-check">
            <CheckIcon className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Configuracion Completa</h1>
          <p className="text-gray-500 mb-10 text-lg">
            Tu empresa esta lista para emitir comprobantes electronicos.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ── Find active step index ─────────────── */

  const activeIndex = steps.findIndex((_, i) => getStepState(i) === 'active');
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : steps[0];
  const ActiveIcon = activeStep.icon;
  const activeMissing = missingItems[activeStep.key as keyof typeof missingItems];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <style dangerouslySetInnerHTML={{ __html: wizardStyles }} />

      {/* QBO Toast */}
      <QboToast visible={showQboToast} onClose={dismissToast} />

      {/* Page title */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Configuracion Inicial</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Completa estos pasos en orden para activar la emision de e-CF
        </p>
      </div>

      {/* ── Horizontal Stepper ────────────── */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4">
        <div className="flex items-start justify-center min-w-max mx-auto">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-start">
              <StepCircle
                step={step}
                index={i}
                state={getStepState(i)}
                onClick={() => {
                  const state = getStepState(i);
                  if (state !== 'locked' && state !== 'pending') {
                    router.push(step.href);
                  }
                }}
              />
              {i < steps.length - 1 && (
                <ConnectorLine
                  state={isStepComplete(step.key) ? 'completed' : 'pending'}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Progress bar ──────────────────── */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
          <span>Progreso</span>
          <span className="font-medium text-gray-600">{completionPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full h-1.5 transition-all duration-700 ease-out"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* ── Current step card ─────────────── */}
      <div className="max-w-2xl mx-auto animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 shadow-gray-200/50 overflow-hidden">
          {/* Card header */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-50">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <ActiveIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
                  Paso {activeIndex + 1} de {steps.length}
                </p>
                <h2 className="text-xl font-bold text-gray-900 mt-0.5">{activeStep.label}</h2>
              </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">{activeStep.desc}</p>

            {/* Missing items hint */}
            {activeMissing && Array.isArray(activeMissing) && activeMissing.length > 0 && (
              <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
                <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <p className="text-xs text-amber-700">{activeMissing[0]}</p>
              </div>
            )}
          </div>

          {/* Card body — visual placeholder */}
          <div className="px-8 py-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <ActiveIcon className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400 max-w-xs">
              Haz clic en &ldquo;Continuar&rdquo; para configurar este paso en la pagina de ajustes.
            </p>
          </div>

          {/* Card footer — navigation buttons */}
          <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => {
                if (activeIndex > 0) {
                  router.push(steps[activeIndex - 1].href);
                }
              }}
              disabled={activeIndex <= 0}
              className={`px-5 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                activeIndex > 0
                  ? 'border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Anterior
              </span>
            </button>

            <button
              onClick={() => router.push(activeStep.href)}
              className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                Continuar
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Plan Details Card ────────────── */}
      {subscription && (
        <div className="max-w-2xl mx-auto animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 shadow-gray-200/50 overflow-hidden">
            <div className="px-8 py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Tu Plan</p>
                  <h3 className="text-lg font-bold text-gray-900">{subscription.planName}</h3>
                </div>
                <div className="ml-auto">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    subscription.status === 'Active'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : subscription.status === 'Trial'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      subscription.status === 'Active' ? 'bg-green-500'
                      : subscription.status === 'Trial' ? 'bg-blue-500'
                      : 'bg-gray-400'
                    }`} />
                    {subscription.status === 'Active' ? 'Activo' : subscription.status === 'Trial' ? 'Prueba' : subscription.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {subscription.includedDocumentsPerMonth.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">e-CF / mes</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {subscription.documentsEmittedThisPeriod}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Emitidos</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    ${subscription.priceAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    / {subscription.priceInterval.toLowerCase().includes('month') ? 'mes' : subscription.priceInterval.toLowerCase().includes('year') ? 'año' : subscription.priceInterval}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   Page export with Suspense
   ──────────────────────────────────────────── */

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
