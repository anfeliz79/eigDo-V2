"use client";

import { useState, useEffect } from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5102/api";

/* ── Types ──────────────────────────────────────── */

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

/* ── SVG Icons ──────────────────────────────────── */

function CheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

/* ── Navbar ──────────────────────────────────────── */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Como Funciona", href: "#como-funciona" },
    { label: "Planes", href: "#planes" },
    { label: "Soporte", href: "#soporte" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="text-2xl font-extrabold tracking-tight">
          <span className={scrolled ? "text-slate-800" : "text-white/90"}>eig</span>
          <span className={scrolled ? "text-blue-600" : "text-white"}>Do</span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                scrolled ? "text-gray-600 hover:text-gray-900" : "text-white/80 hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
          <a
            href={`${APP_URL}/login`}
            className={`text-sm font-medium transition-colors ${
              scrolled ? "text-gray-600 hover:text-gray-900" : "text-white/80 hover:text-white"
            }`}
          >
            Iniciar Sesion
          </a>
          <a
            href="#planes"
            className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              scrolled
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                : "bg-white text-blue-700 hover:bg-white/90 shadow-lg shadow-blue-900/20"
            }`}
          >
            Comenzar Ahora
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`md:hidden ${scrolled ? "text-gray-700" : "text-white"}`}
        >
          {mobileOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-6 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-gray-700 font-medium py-2"
              >
                {link.label}
              </a>
            ))}
            <a href={`${APP_URL}/login`} className="block text-gray-700 font-medium py-2">
              Iniciar Sesion
            </a>
            <a
              href="#planes"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center bg-blue-600 text-white font-semibold py-3 rounded-xl"
            >
              Comenzar Ahora
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ── Hero ────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-6 py-32 text-center">
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-2 glass px-4 py-2 text-sm text-white/90 font-medium mb-8">
            <ShieldIcon />
            Certificado por la DGII
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight animate-fade-in-up-delay-1">
          Facturacion Electronica
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">
            automatica desde QuickBooks
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed animate-fade-in-up-delay-2">
          Conecta tu QuickBooks Online con la DGII. eigdo emite tus e-CF automaticamente — sin doble digitacion, sin errores.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up-delay-3">
          <a
            href="#planes"
            className="px-8 py-4 bg-white text-blue-700 font-bold rounded-xl text-lg shadow-xl shadow-blue-900/30 hover:bg-blue-50 transition-all hover:scale-105 flex items-center gap-2"
          >
            Ver Planes
            <ChevronDown />
          </a>
          <a
            href="#como-funciona"
            className="px-8 py-4 glass text-white font-semibold rounded-xl text-lg hover:bg-white/20 transition-all flex items-center gap-2"
          >
            Como Funciona
          </a>
        </div>

        {/* Glass badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-4 animate-fade-in-up-delay-3">
          {[
            { icon: <ShieldIcon />, label: "Certificado DGII", delay: "0s" },
            { icon: <BoltIcon />, label: "Todos los e-CF (E31-E47)", delay: "0.7s" },
            { icon: <ClockIcon />, label: "Setup en minutos", delay: "1.4s" },
          ].map((badge) => (
            <div key={badge.label} className="glass px-5 py-3 flex items-center gap-2.5 text-white/90 text-sm font-medium animate-float" style={{ animationDelay: badge.delay }}>
              {badge.icon}
              {badge.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Problem / Solution ──────────────────────────── */

function ProblemSolution() {
  const problems = [
    {
      icon: (
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      ),
      title: "Doble digitacion",
      desc: "Cada factura se ingresa en QBO y luego se repite manualmente en el portal fiscal.",
    },
    {
      icon: (
        <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      ),
      title: "Errores humanos",
      desc: "RNC incorrecto, tipo de comprobante equivocado, calculo de ITBIS errado.",
    },
    {
      icon: (
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      title: "Multas de la DGII",
      desc: "Un comprobante rechazado o fuera de plazo genera sanciones economicas.",
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            El problema que resolvemos
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            La facturacion electronica en RD consume horas de trabajo manual cada semana.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((p) => (
            <div
              key={p.title}
              className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all group"
            >
              <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                {p.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{p.title}</h3>
              <p className="text-gray-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 bg-green-50 border border-green-200 rounded-full px-6 py-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <CheckIcon className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-green-800 font-semibold">eigdo automatiza todo esto por ti</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      num: "1",
      icon: <LinkIcon />,
      title: "Conecta QuickBooks",
      desc: "Autoriza la conexion OAuth en un clic. eigdo importa tu catalogo de clientes, proveedores e impuestos.",
    },
    {
      num: "2",
      icon: <CogIcon />,
      title: "Configura una vez",
      desc: "Mapea tus clientes con su RNC, configura impuestos y sube tu certificado digital. El wizard te guia paso a paso.",
    },
    {
      num: "3",
      icon: <RocketIcon />,
      title: "Emite automaticamente",
      desc: "Cada factura en QBO genera su e-CF al instante. Sin intervencion manual, las 24 horas.",
    },
  ];

  return (
    <section id="como-funciona" className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            Como funciona
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Tres pasos simples para automatizar tu facturacion electronica
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.num} className="relative">
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-blue-300 to-transparent" />
              )}
              <div className="glass-white p-8 hover:shadow-xl transition-all group relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold mb-5">
                  {step.num}
                </div>
                <div className="text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ─────────────────────────────────────── */

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

  const getPrice = (plan: PlanDto) => plan.prices.find((p) => p.interval === interval) || null;

  const formatAmount = (amount: number) =>
    `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const popularIndex = plans.length === 3 ? 1 : -1;

  const planFeatures: Record<string, string[]> = {
    basico: ["Hasta 100 e-CF/mes", "Todos los e-CF (E31-E47)", "Soporte por email", "1 usuario"],
    profesional: ["Hasta 500 e-CF/mes", "Todos los e-CF (E31-E47)", "Soporte prioritario", "3 usuarios", "Reportes avanzados"],
    empresarial: ["Hasta 2,000 e-CF/mes", "Todos los e-CF (E31-E47)", "Soporte dedicado", "Usuarios ilimitados", "Reportes avanzados", "API acceso"],
  };

  return (
    <section id="planes" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            Planes simples, sin sorpresas
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Elige el plan que se adapte a tu volumen de facturacion
          </p>

          {/* Interval toggle */}
          <div className="mt-8 inline-flex items-center bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setInterval("monthly")}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                interval === "monthly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setInterval("yearly")}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                interval === "yearly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Anual
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">-17%</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {plans.map((plan, i) => {
              const price = getPrice(plan);
              const popular = i === popularIndex;
              const slug = plan.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              const features = planFeatures[slug] || [`Hasta ${plan.includedDocumentsPerMonth} e-CF/mes`, "Todos los e-CF", "Soporte incluido"];

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-8 transition-all hover:shadow-xl ${
                    popular
                      ? "border-blue-600 ring-2 ring-blue-600 bg-white shadow-lg scale-105"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                        Mas popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    {price && (
                      <div className="mt-3">
                        <span className="text-4xl font-extrabold text-gray-900">
                          {formatAmount(price.amount)}
                        </span>
                        <span className="text-gray-500 text-sm ml-1">
                          /{interval === "monthly" ? "mes" : "ano"}
                        </span>
                      </div>
                    )}
                    <p className="mt-3 text-sm text-gray-500">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${popular ? "bg-blue-100" : "bg-gray-100"}`}>
                          <CheckIcon className={`w-3 h-3 ${popular ? "text-blue-600" : "text-gray-600"}`} />
                        </div>
                        <span className="text-sm text-gray-600">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href={`${APP_URL}/register${price ? `?plan=${slug}&priceId=${price.id}` : ""}`}
                    className={`block w-full text-center py-3.5 rounded-xl font-semibold text-sm transition-all ${
                      popular
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    Seleccionar Plan
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

/* ── Support ─────────────────────────────────────── */

function SupportSection() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch(`${API_URL}/support/tickets/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: form.name,
          senderEmail: form.email,
          subject: "Consulta desde landing",
          message: form.message,
        }),
      });
      setSent(true);
      setForm({ name: "", email: "", message: "" });
    } catch {
      /* silently fail */
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="soporte" className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/15 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Necesitas ayuda?
            </h2>
            <p className="mt-4 text-lg text-blue-100 leading-relaxed">
              Estamos aqui para asistirte. Escribenos y te respondemos lo antes posible.
            </p>

            <div className="mt-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 glass rounded-xl flex items-center justify-center text-white">
                  <MailIcon />
                </div>
                <div>
                  <p className="text-sm text-blue-200">Correo Electronico</p>
                  <p className="text-white font-semibold">soporte@eigdo.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Form */}
          <div className="glass p-8">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckIcon className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Mensaje enviado</h3>
                <p className="text-blue-200 mt-2">Te responderemos pronto.</p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-6 text-sm text-blue-200 underline hover:text-white"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-1.5">Nombre</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-white/30 focus:border-transparent outline-none transition text-sm"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-white/30 focus:border-transparent outline-none transition text-sm"
                    placeholder="tu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-1.5">Mensaje</label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-white/30 focus:border-transparent outline-none transition text-sm resize-none"
                    placeholder="En que podemos ayudarte?"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3.5 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50 text-sm"
                >
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

/* ── Footer ──────────────────────────────────────── */

function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="text-white/80">eig</span>
              <span className="text-blue-400">Do</span>
            </span>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Facturacion electronica automatica desde QuickBooks Online.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Producto</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><a href="#como-funciona" className="hover:text-white transition-colors">Como Funciona</a></li>
              <li><a href="#planes" className="hover:text-white transition-colors">Planes</a></li>
              <li><a href="#soporte" className="hover:text-white transition-colors">Soporte</a></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Cuenta</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><a href={`${APP_URL}/login`} className="hover:text-white transition-colors">Iniciar Sesion</a></li>
              <li><a href="#planes" className="hover:text-white transition-colors">Registrarse</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">Terminos de Servicio</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Politica de Privacidad</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} eigdo. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ── Page ─────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <ProblemSolution />
      <HowItWorks />
      <Pricing />
      <SupportSection />
      <Footer />
    </>
  );
}
