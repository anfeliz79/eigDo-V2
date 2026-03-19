"use client";

import { useState } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Logo — Bold unified wordmark, Stripe-inspired                     */
/* ------------------------------------------------------------------ */
function EigdoLogo({ className = "h-8", variant = "default" }: { className?: string; variant?: "default" | "white" }) {
  const dark = variant === "white" ? "#FFFFFF" : "#0F172A";
  const blue = variant === "white" ? "#FFFFFF" : "#2563EB";

  return (
    <span className={`inline-flex items-baseline font-extrabold tracking-tight text-[1.75rem] leading-none ${className}`}
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <span style={{ color: dark }}>eig</span>
      <span style={{ color: blue }}>Do</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Navbar                                                            */
/* ------------------------------------------------------------------ */
function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          <EigdoLogo className="h-8" />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#como-funciona" className="text-sm text-muted hover:text-foreground transition-colors">
            Cómo Funciona
          </a>
          <a href="#planes" className="text-sm text-muted hover:text-foreground transition-colors">
            Planes
          </a>
          <a href="#soporte" className="text-sm text-muted hover:text-foreground transition-colors">
            Soporte
          </a>
          <Link
            href="/registro"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
          >
            Comenzar Gratis
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          aria-label="Abrir menú"
          className="md:hidden"
          onClick={() => setOpen(!open)}
        >
          <svg className="h-6 w-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gray-100 bg-white px-6 pb-4 md:hidden">
          <div className="flex flex-col gap-4 pt-4">
            <a href="#como-funciona" className="text-sm text-muted hover:text-foreground" onClick={() => setOpen(false)}>
              Cómo Funciona
            </a>
            <a href="#planes" className="text-sm text-muted hover:text-foreground" onClick={() => setOpen(false)}>
              Planes
            </a>
            <a href="#soporte" className="text-sm text-muted hover:text-foreground" onClick={() => setOpen(false)}>
              Soporte
            </a>
            <Link
              href="/registro"
              className="rounded-lg bg-primary px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
              onClick={() => setOpen(false)}
            >
              Comenzar Gratis
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                              */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="mx-auto max-w-7xl px-6 py-24 text-center lg:py-36">
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Facturación Electrónica automática desde{" "}
          <span className="text-primary">QuickBooks Online</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted">
          Conecta tu QuickBooks con la DGII. eigdo emite tus e-CF
          automáticamente — sin doble digitación, sin errores.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/registro"
            className="rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-dark hover:shadow-xl"
          >
            Comenzar Prueba Gratis
          </Link>
          <a
            href="#como-funciona"
            className="rounded-lg border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-gray-50"
          >
            Ver cómo funciona
          </a>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
          <span className="flex items-center gap-2">
            <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Certificado DGII
          </span>
          <span className="flex items-center gap-2">
            <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Todos los e-CF (E31–E47)
          </span>
          <span className="flex items-center gap-2">
            <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Setup en minutos
          </span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Problem / Solution                                                */
/* ------------------------------------------------------------------ */
const painPoints = [
  {
    icon: (
      <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
    title: "Doble digitación",
    desc: "Copiar facturas de QBO a un portal fiscal es lento y propenso a errores.",
  },
  {
    icon: (
      <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Incumplimiento",
    desc: "Plazos de la DGII no esperan. Un e-CF tardío o incorrecto genera multas.",
  },
  {
    icon: (
      <svg className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Complejidad",
    desc: "Mapear RNC, tipos de comprobante, ITBIS y retenciones manualmente es agotador.",
  },
];

function ProblemSolution() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            El problema que resolvemos
          </h2>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-gray-100 bg-gray-50 p-8 transition-shadow hover:shadow-lg"
            >
              <div className="mb-4">{p.icon}</div>
              <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl bg-gradient-to-r from-primary to-blue-500 p-8 text-center text-white shadow-lg sm:p-12">
          <p className="text-xl font-semibold sm:text-2xl">
            eigdo conecta tu QBO directamente con la DGII. Configura una vez,
            emite siempre.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                      */
/* ------------------------------------------------------------------ */
const steps = [
  {
    num: "1",
    title: "Conecta tu QuickBooks",
    desc: "Autoriza eigdo con OAuth seguro. Tus datos nunca salen de tu control.",
  },
  {
    num: "2",
    title: "Configura tus mapeos",
    desc: "Mapea clientes, proveedores e impuestos a los códigos DGII. Solo una vez.",
  },
  {
    num: "3",
    title: "Emite automáticamente",
    desc: "Cada factura en QBO genera su e-CF al instante. Sin intervención manual.",
  },
];

function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Cómo funciona
        </h2>

        <div className="mt-16 grid gap-12 lg:grid-cols-3">
          {steps.map((s) => (
            <div key={s.num} className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-md">
                {s.num}
              </div>
              <h3 className="mt-6 text-lg font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Profiles                                                          */
/* ------------------------------------------------------------------ */
const profiles = [
  {
    title: "Empresas",
    icon: (
      <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
    desc: "Emite e-CF directamente desde tu QBO. Ideal para PyMEs que quieren automatizar su cumplimiento fiscal sin cambiar su flujo de trabajo.",
  },
  {
    title: "Firmas Contables",
    icon: (
      <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    desc: "Gestiona la facturación electrónica de múltiples clientes desde un solo dashboard. Perfecto para contadores que manejan varios RNC.",
  },
];

function Profiles() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Para cada tipo de negocio
        </h2>

        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {profiles.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-gray-100 bg-white p-10 shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="mb-5">{p.icon}</div>
              <h3 className="text-xl font-semibold text-foreground">
                {p.title}
              </h3>
              <p className="mt-3 leading-7 text-muted">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                           */
/* ------------------------------------------------------------------ */
const plans = [
  {
    name: "Starter",
    price: "RD$2,500",
    period: "/mes",
    features: ["Hasta 100 e-CF/mes", "1 empresa", "Soporte email"],
    popular: false,
  },
  {
    name: "Profesional",
    price: "RD$5,000",
    period: "/mes",
    features: [
      "Hasta 500 e-CF/mes",
      "3 empresas",
      "Soporte prioritario",
      "Todos los e-CF",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Contáctanos",
    period: "",
    features: [
      "Ilimitado",
      "Multi-empresa",
      "Soporte dedicado",
      "API access",
    ],
    popular: false,
  },
];

function Pricing() {
  return (
    <section id="planes" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Planes simples, sin sorpresas
        </h2>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition-shadow hover:shadow-lg ${
                plan.popular
                  ? "border-primary ring-2 ring-primary"
                  : "border-gray-200"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
                  Más popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">
                {plan.name}
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-muted">{plan.period}</span>
                )}
              </div>
              <ul className="mt-8 flex-1 space-y-4">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-muted">
                    <svg className="h-5 w-5 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/registro"
                className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
                  plan.popular
                    ? "bg-primary text-white shadow-sm hover:bg-primary-dark"
                    : "bg-gray-100 text-foreground hover:bg-gray-200"
                }`}
              >
                Comenzar
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                         */
/* ------------------------------------------------------------------ */
function FinalCTA() {
  return (
    <section className="bg-gradient-to-br from-primary to-blue-700 py-24">
      <div className="mx-auto max-w-3xl px-6 text-center text-white">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Cumple con la DGII sin complicaciones
        </h2>
        <p className="mt-4 text-lg leading-8 text-blue-100">
          Fase 3 de facturación electrónica es obligatoria para PyMEs.
          Prepárate hoy.
        </p>
        <Link
          href="/registro"
          className="mt-10 inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-primary shadow-lg transition-all hover:bg-blue-50 hover:shadow-xl"
        >
          Crear Cuenta Gratis
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                            */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer id="soporte" className="bg-gray-900 text-gray-400">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <EigdoLogo className="h-7" variant="white" />
            <p className="mt-4 text-sm leading-6">
              Facturación electrónica automática desde QuickBooks Online para la
              República Dominicana.
            </p>
          </div>

          {/* Producto */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Producto
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href="#como-funciona" className="hover:text-white transition-colors">
                  Cómo funciona
                </a>
              </li>
              <li>
                <a href="#planes" className="hover:text-white transition-colors">
                  Planes
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Documentación
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Legal
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Términos
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Privacidad
                </a>
              </li>
            </ul>
          </div>

          {/* Soporte */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Soporte
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Centro de ayuda
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contacto
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-gray-800 pt-8 text-center text-sm">
          &copy; 2026 eigdo. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <ProblemSolution />
      <HowItWorks />
      <Profiles />
      <Pricing />
      <FinalCTA />
      <Footer />
    </>
  );
}
