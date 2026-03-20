'use client';

import Link from 'next/link';

export default function CheckoutSuccessPage() {
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
          Tu suscripcion ha sido activada exitosamente. Ya puedes emitir comprobantes fiscales electronicos.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Ir al Dashboard
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
