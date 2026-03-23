'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const [confirming, setConfirming] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setConfirming(false);
      setConfirmed(true);
      return;
    }

    api.confirmCheckout(sessionId)
      .then(() => setConfirmed(true))
      .catch(() => setConfirmed(true)) // Still show success — webhook may handle it
      .finally(() => setConfirming(false));
  }, [sessionId]);

  if (confirming) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Activando tu suscripcion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Pago Exitoso</h1>
        <p className="text-gray-500 mt-2">
          Tu suscripcion ha sido activada exitosamente. Ya puedes configurar tu empresa.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link
            href="/onboarding"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Iniciar Configuracion
          </Link>
          <Link
            href="/settings/billing"
            className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
          >
            Ver Suscripcion
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
