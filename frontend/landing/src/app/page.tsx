"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5102/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface PriceDto {
  id: string;
  amount: number;
  currency: string;
  interval: string;
}

interface PlanDto {
  id: string;
  name: string;
  description?: string;
  includedDocumentsPerMonth: number;
  sortOrder: number;
  prices: PriceDto[];
}

/* ------------------------------------------------------------------ */
/*  Logo                                                               */
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

        <div className="hidden items-center gap-8 md:flex">
          <a href="#como-funciona" className="text-sm text-muted hover:text-foreground transition-colors">Como Funciona</a>
          <a href="#planes" className="text-sm text-muted hover:text-foreground transition-colors">Planes</a>
          <a href="#soporte" className="text-sm text-muted hover:text-foreground transition-colors">Soporte</a>
          <a href={`${APP_URL}/login`} className="text-sm font-medium text-primary hover:text-primary-dark transition-colors">Iniciar Sesion</a>
          <a href={`${APP_URL}/register`} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark">Comenzar Ahora</a>
        </div>

        <button aria-label="Abrir menu" className="md:hidden" onClick={() => setOpen(!open)}>
          <svg className="h-6 w-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white px-6 pb-4 md:hidden">
          <div className="flex flex-col gap-4 pt-4">
            <a href="#como-funciona" className="text-sm text-muted hover:text-foreground" onClick={() => setOpen(false)}>Como Funciona</a>
            <a href="#planes" className="text-sm text-muted hover:text-foreground" onClick={() => setOpen(false)}>Planes</a>
            <a href="#soporte" className="text-sm text-muted hover:text-foreground" onClick={() => setOpen(false)}>Soporte</a>
            <a href={`${APP_URL}/login`} className="text-sm font-medium text-primary hover:text-primary-dark" onClick={() => setOpen(false)}>Iniciar Sesion</a>
            <a href={`${APP_URL}/register`} className="rounded-lg bg-primary px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark" onClick={() => setOpen(false)}>Comenzar Ahora</a>
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
          Facturacion Electronica automatica desde{" "}
          <span className="text-primary">QuickBooks Online</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted">
          Conecta tu QuickBooks con la DGII. eigdo emite tus e-CF
          automaticamente — sin doble digitacion, sin errores.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a href="#planes" className="rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-dark hover:shadow-xl">
            Comenzar Ahora
          </a>
          <a href="#como-funciona" className="rounded-lg border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-gray-50">
            Ver como funciona
          </a>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
          {['Certificado DGII', 'Todos los e-CF (E31-E47)', 'Setup en minutos'].map((t) => (
            <span key={t} className="flex items-center gap-2">
              <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Problem / Solution                                                */
/* ------------------------------------------------------------------ */
const painPoints = [
  { icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z", color: "text-red-500", title: "Doble digitacion", desc: "Copiar facturas de QBO a un portal fiscal es lento y propenso a errores." },
  { icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-amber-500", title: "Incumplimiento", desc: "Plazos de la DGII no esperan. Un e-CF tardio o incorrecto genera multas." },
  { icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z M15 12a3 3 0 11-6 0 3 3 0 016 0z", color: "text-purple-500", title: "Complejidad", desc: "Mapear RNC, tipos de comprobante, ITBIS y retenciones manualmente es agotador." },
];

function ProblemSolution() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">El problema que resolvemos</h2>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map((p) => (
            <div key={p.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-8 transition-shadow hover:shadow-lg">
              <svg className={`h-8 w-8 ${p.color} mb-4`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
              </svg>
              <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-primary to-blue-500 p-8 text-center text-white shadow-lg sm:p-12">
          <p className="text-xl font-semibold sm:text-2xl">eigdo conecta tu QBO directamente con la DGII. Configura una vez, emite siempre.</p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                      */
/* ------------------------------------------------------------------ */
const steps = [
  { num: "1", title: "Conecta tu QuickBooks", desc: "Autoriza eigdo con OAuth seguro. Tus datos nunca salen de tu control." },
  { num: "2", title: "Configura tus mapeos", desc: "Mapea clientes, proveedores e impuestos a los codigos DGII. Solo una vez." },
  { num: "3", title: "Emite automaticamente", desc: "Cada factura en QBO genera su e-CF al instante. Sin intervencion manual." },
];

function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Como funciona</h2>
        <div className="mt-16 grid gap-12 lg:grid-cols-3">
          {steps.map((s) => (
            <div key={s.num} className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-md">{s.num}</div>
              <h3 className="mt-6 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing (Dynamic from API)                                        */
/* ------------------------------------------------------------------ */
function Pricing() {
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/billing/plans`)
      .then((r) => r.json())
      .then((res) => {
        const data = res.data || res;
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getPrice = (plan: PlanDto) => {
    const price = plan.prices.find((p) => p.interval === interval);
    if (!price) return null;
    return price;
  };

  const formatAmount = (amount: number) =>
    `RD$${amount.toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const popularIndex = plans.length >= 2 ? 1 : -1;

  return (
    <section id="planes" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Planes simples, sin sorpresas</h2>

        {/* Interval toggle */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-lg bg-gray-200 p-1">
            <button
              onClick={() => setInterval("monthly")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${interval === "monthly" ? "bg-white text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              Mensual
            </button>
            <button
              onClick={() => setInterval("yearly")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${interval === "yearly" ? "bg-white text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              Anual <span className="text-accent text-xs ml-1">-17%</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-16 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></div>
        ) : (
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {plans.map((plan, i) => {
              const price = getPrice(plan);
              const popular = i === popularIndex;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition-shadow hover:shadow-lg ${
                    popular ? "border-primary ring-2 ring-primary" : "border-gray-200"
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
                      Mas popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      {price ? formatAmount(price.amount) : "N/A"}
                    </span>
                    <span className="text-sm text-muted">/{interval === "monthly" ? "mes" : "ano"}</span>
                  </div>
                  {plan.description && <p className="mt-3 text-sm text-muted">{plan.description}</p>}
                  <ul className="mt-8 flex-1 space-y-4">
                    <li className="flex items-center gap-3 text-sm text-muted">
                      <svg className="h-5 w-5 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Hasta {plan.includedDocumentsPerMonth.toLocaleString()} e-CF/mes
                    </li>
                    <li className="flex items-center gap-3 text-sm text-muted">
                      <svg className="h-5 w-5 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Todos los e-CF (E31-E47)
                    </li>
                    <li className="flex items-center gap-3 text-sm text-muted">
                      <svg className="h-5 w-5 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Soporte incluido
                    </li>
                  </ul>
                  <a
                    href={`${APP_URL}/register${price ? `?plan=${plan.name.toLowerCase()}&priceId=${price.id}` : ""}`}
                    className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
                      popular
                        ? "bg-primary text-white shadow-sm hover:bg-primary-dark"
                        : "bg-gray-100 text-foreground hover:bg-gray-200"
                    }`}
                  >
                    Adquirir Plan
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Support / Contact Form                                            */
/* ------------------------------------------------------------------ */
function SupportSection() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", description: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/support/tickets/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Error al enviar");
      setSent(true);
      setForm({ name: "", email: "", subject: "", description: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="soporte" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Necesitas ayuda?</h2>
            <p className="mt-4 text-lg text-muted">Estamos aqui para asistirte. Escribenos y te responderemos lo antes posible.</p>
            <div className="mt-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Correo Electronico</h3>
                  <p className="text-sm text-muted">soporte@eigdo.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Horario de Soporte</h3>
                  <p className="text-sm text-muted">Lunes a Viernes, 8:00 AM - 6:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8">
            {sent ? (
              <div className="text-center py-12">
                <svg className="h-12 w-12 text-accent mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Mensaje enviado</h3>
                <p className="mt-2 text-sm text-muted">Te responderemos lo antes posible.</p>
                <button onClick={() => setSent(false)} className="mt-4 text-sm text-primary hover:text-primary-dark font-medium">Enviar otro mensaje</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nombre</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none" placeholder="Tu nombre" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none" placeholder="tu@email.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Asunto *</label>
                  <input type="text" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none" placeholder="En que te podemos ayudar?" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Mensaje *</label>
                  <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none" placeholder="Describe tu consulta..." />
                </div>
                <button type="submit" disabled={sending} className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:bg-gray-400">
                  {sending ? "Enviando..." : "Enviar Mensaje"}
                </button>
              </form>
            )}
          </div>
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
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Cumple con la DGII sin complicaciones</h2>
        <p className="mt-4 text-lg leading-8 text-blue-100">Fase 3 de facturacion electronica es obligatoria para PyMEs. Preparate hoy.</p>
        <a href="#planes" className="mt-10 inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-primary shadow-lg transition-all hover:bg-blue-50 hover:shadow-xl">
          Ver Planes y Comenzar
        </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                            */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <EigdoLogo className="h-7" variant="white" />
            <p className="mt-4 text-sm leading-6">Facturacion electronica automatica desde QuickBooks Online para la Republica Dominicana.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Producto</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li><a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a></li>
              <li><a href="#planes" className="hover:text-white transition-colors">Planes</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Legal</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Terminos</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacidad</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Soporte</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li><a href="#soporte" className="hover:text-white transition-colors">Centro de ayuda</a></li>
              <li><a href="#soporte" className="hover:text-white transition-colors">Contacto</a></li>
              <li><a href={`${APP_URL}/login`} className="hover:text-white transition-colors">Iniciar Sesion</a></li>
              <li><a href={`${APP_URL}/register`} className="hover:text-white transition-colors">Registrarse</a></li>
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
      <Pricing />
      <SupportSection />
      <FinalCTA />
      <Footer />
    </>
  );
}
