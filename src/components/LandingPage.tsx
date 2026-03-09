import {
  ShieldCheck, Clock, Network, Menu, X, FileText, ExternalLink,
  ChevronRight, Lock, HeartPulse, Activity, Server, BarChart3,
  Users, Mail, Phone, MapPin, CheckCircle2, Zap, Shield,
  Database, MonitorCheck, Stethoscope, Building2, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logoGestrategic from "@/assets/logo-gestrategic.jpg";
import heroImage from "@/assets/hero-hospital-tech.png";
import logoSusfacil from "@/assets/logo-susfacil.png";
import logoUpa from "@/assets/logo-upa-24h.png";
import { useState, useCallback, useEffect, memo, useRef } from "react";
import { SEOHead, OrganizationSchema, HealthcareServiceSchema } from "@/components/ui/seo-head";

/* ── Animated Counter ── */
function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

const CounterCard = memo(({ value, suffix = "", label, icon: Icon }: { value: number; suffix?: string; label: string; icon: typeof Users }) => {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="text-center space-y-2">
      <div className="mx-auto w-12 h-12 rounded-xl bg-[#2d7dd2]/15 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-[#5ba3d9]" />
      </div>
      <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
        {count}{suffix}
      </p>
      <p className="text-[#7eb8e0] text-sm font-medium">{label}</p>
    </div>
  );
});
CounterCard.displayName = "CounterCard";

/* ── Feature Card ── */
const FeatureCard = memo(({ icon: Icon, title, description, index }: {
  icon: typeof ShieldCheck; title: string; description: string; index: number;
}) => (
  <article className={`group relative text-left space-y-4 p-8 rounded-2xl bg-white border border-[#e2eaf3] hover:border-[#2d7dd2]/30 hover:shadow-2xl hover:shadow-[#2d7dd2]/8 transition-all duration-500 hover:-translate-y-1.5 animate-slide-up-fade ${
    index === 0 ? "animate-delay-100" : index === 1 ? "animate-delay-200" : "animate-delay-300"
  }`}>
    <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#2d7dd2]/0 to-transparent group-hover:via-[#2d7dd2]/40 transition-all duration-500" />
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2d7dd2]/15 to-[#2d7dd2]/5 flex items-center justify-center group-hover:from-[#2d7dd2]/25 group-hover:to-[#2d7dd2]/10 group-hover:scale-110 transition-all duration-500 group-hover:shadow-lg group-hover:shadow-[#2d7dd2]/15">
      <Icon className="w-7 h-7 text-[#2d7dd2]" />
    </div>
    <h3 className="text-lg font-bold text-[#1a2e44]">{title}</h3>
    <p className="text-[#5a7a9a] leading-relaxed text-sm">{description}</p>
    <div className="flex items-center gap-1.5 text-[#2d7dd2] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <span>Saiba mais</span>
      <ArrowRight className="w-4 h-4" />
    </div>
  </article>
));
FeatureCard.displayName = "FeatureCard";

/* ── Security Feature Item ── */
const SecurityItem = memo(({ icon: Icon, title, desc }: { icon: typeof Shield; title: string; desc: string }) => (
  <div className="flex gap-4 items-start">
    <div className="shrink-0 w-10 h-10 rounded-xl bg-[#2d7dd2]/10 flex items-center justify-center mt-0.5">
      <Icon className="w-5 h-5 text-[#2d7dd2]" />
    </div>
    <div>
      <h4 className="font-semibold text-[#1a2e44] mb-1">{title}</h4>
      <p className="text-[#5a7a9a] text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
));
SecurityItem.displayName = "SecurityItem";

/* ═════════════════════════════════════════════════════════════ */

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogin = useCallback(() => navigate("/auth"), [navigate]);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((prev) => !prev), []);

  const handleDocumentosInteract = useCallback(() => {
    window.open(
      "https://santacasachavantes.interact.com.br/sa/custom/webdocuments/anonymous/list.jsp?unit=%2334",
      "_blank",
      "noopener,noreferrer"
    );
  }, []);

  const navLinks = [
    { label: "Início", href: "#" },
    { label: "Soluções", href: "#solucoes" },
    { label: "Segurança & LGPD", href: "#seguranca" },
    { label: "Sobre Nós", href: "#sobre" },
    { label: "Contato", href: "#contato" },
  ];

  const features = [
    {
      icon: ShieldCheck,
      title: "Segurança & Conformidade",
      description: "Proteção de dados sensíveis e conformidade total com LGPD para sua tranquilidade.",
    },
    {
      icon: Clock,
      title: "Monitoramento Inteligente 24/7",
      description: "NOC especializado em ambientes críticos de saúde com resposta imediata.",
    },
    {
      icon: Network,
      title: "Integração & Fluxo de Dados",
      description: "Conectamos HIS e PACS com automação setorial, eliminando falhas manuais e acelerando a operação.",
    },
  ];

  const services = [
    { icon: Server, title: "Infraestrutura de TI", desc: "Servidores, redes e cloud otimizados para alta disponibilidade hospitalar." },
    { icon: MonitorCheck, title: "NOC 24/7", desc: "Centro de operações dedicado com monitoramento proativo de todos os sistemas." },
    { icon: Database, title: "Backup & DR", desc: "Políticas de backup e disaster recovery para zero perda de dados clínicos." },
    { icon: BarChart3, title: "Business Intelligence", desc: "Dashboards e relatórios inteligentes para tomada de decisão baseada em dados." },
    { icon: Stethoscope, title: "Sistemas Clínicos", desc: "Integração e suporte para HIS, PACS, LIS e demais sistemas de saúde." },
    { icon: Zap, title: "Automação de Processos", desc: "Fluxos automatizados que eliminam tarefas manuais repetitivas." },
  ];

  return (
    <>
      <SEOHead
        title="Gestrategic - Gestão Hospitalar Inteligente"
        description="Automação inteligente e infraestrutura de TI de alta performance para hospitais, clínicas e centros diagnóstico. Conformidade LGPD garantida."
        keywords="gestão hospitalar, sistema de saúde, LGPD, hospital, clínica, monitoramento, TI hospitalar, automação"
      />
      <OrganizationSchema />
      <HealthcareServiceSchema />

      <div className="min-h-screen bg-white overflow-x-hidden">
        {/* ═══════════════ HEADER ═══════════════ */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
            scrolled
              ? "bg-[#0d2137]/95 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.3)] border-b border-white/5"
              : "bg-[#0d2137]"
          }`}
          role="banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <a href="#" className="flex items-center gap-2.5 shrink-0" aria-label="Gestrategic - Página Inicial">
                <img src={logoGestrategic} alt="Gestrategic Logo" className="h-9 w-auto rounded" width={36} height={36} loading="eager" />
                <div className="hidden sm:block">
                  <span className="text-white font-semibold text-sm leading-none block">Gestrategic</span>
                  <span className="text-[#7eb8e0] text-[10px] leading-none">Tecnologia em Saúde</span>
                </div>
              </a>

              <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Navegação principal">
                {navLinks.map((link) => (
                  <a key={link.label} href={link.href} className="text-sm text-[#a3c4e0] hover:text-white px-3 py-2 rounded-md hover:bg-white/5 transition-all font-semibold">
                    {link.label}
                  </a>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <Button className="hidden sm:flex bg-[#2d7dd2] hover:bg-[#2570c2] text-white rounded-lg px-5 h-9 text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[#2d7dd2]/30" onClick={handleLogin}>
                  Área do Cliente
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </Button>
                <button className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-white" onClick={toggleMobileMenu} aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}>
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {mobileMenuOpen && (
              <nav className="lg:hidden py-3 border-t border-white/10 animate-fade-in">
                <div className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <a key={link.label} href={link.href} className="text-sm text-[#a3c4e0] hover:text-white py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors" onClick={closeMobileMenu}>
                      {link.label}
                    </a>
                  ))}
                  <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/10">
                    <Button variant="outline" className="border-white/20 text-[#a3c4e0] hover:bg-white/5 hover:text-white w-full rounded-lg" onClick={() => { closeMobileMenu(); handleDocumentosInteract(); }}>
                      <FileText className="w-4 h-4 mr-2" />
                      Documentos Interact
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </Button>
                    <Button className="bg-[#2d7dd2] hover:bg-[#2570c2] text-white w-full rounded-lg font-semibold" onClick={handleLogin}>
                      Área do Cliente
                    </Button>
                  </div>
                </div>
              </nav>
            )}
          </div>
        </header>

        {/* ═══════════════ HERO ═══════════════ */}
        <section className="relative bg-[#0d2137] overflow-hidden pt-24 sm:pt-28" aria-labelledby="hero-title">
          <div className="absolute inset-0" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0d2137] via-[#112d4a] to-[#153656]" />
            <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="heroGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#heroGrid)" />
              </svg>
            </div>
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#2d7dd2]/8 blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#1a5a8a]/10 blur-[100px]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 lg:py-24 relative">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-6 z-10 animate-slide-up-fade">
                <div className="inline-flex items-center gap-2 bg-[#2d7dd2]/15 border border-[#2d7dd2]/25 rounded-full px-4 py-1.5 backdrop-blur-sm">
                  <HeartPulse className="w-4 h-4 text-[#5ba3d9] animate-pulse" />
                  <span className="text-[#7eb8e0] text-xs font-medium">Tecnologia que salva vidas</span>
                </div>

                <h1 id="hero-title" className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] text-white leading-[1.15] tracking-tight">
                  <span className="font-light">Inovação que</span><br />
                  <span className="font-bold">pulsa pela </span>
                  <span className="font-bold shimmer-text">vida.</span>
                </h1>

                <p className="text-[#8baec8] text-base sm:text-lg max-w-md leading-relaxed">
                  Automação inteligente e infraestrutura de TI de alta performance para hospitais, clínicas e centros diagnóstico.
                </p>

                <div className="flex flex-wrap gap-3 pt-1">
                  <Button className="bg-[#2d7dd2] hover:bg-[#2570c2] text-white rounded-xl px-7 h-12 text-sm font-semibold shadow-lg shadow-[#2d7dd2]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#2d7dd2]/35 hover:-translate-y-0.5 active:translate-y-0" asChild>
                    <a href="#solucoes">Conheça nossas Soluções</a>
                  </Button>
                  <Button variant="outline" className="border border-[#3d6d9e]/50 text-[#a3c4e0] hover:bg-[#1a3a5c] hover:text-white hover:border-[#5ba3d9]/50 rounded-xl px-7 h-12 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 bg-transparent backdrop-blur-sm" asChild>
                    <a href="#contato">Agendar Consultoria</a>
                  </Button>
                </div>

                <div className="pt-6 mt-2 border-t border-white/8">
                  <p className="text-[#5a7a9a] text-[11px] uppercase tracking-[0.15em] mb-3 font-medium">EMPRESAS QUE CONFIAM EM NÓS</p>
                  <div className="flex items-center gap-5 flex-wrap">
                    <img src={logoUpa} alt="UPA 24h" className="h-7 opacity-40 hover:opacity-70 transition-opacity grayscale hover:grayscale-0" loading="lazy" />
                    <img src={logoSusfacil} alt="SUS Fácil" className="h-7 opacity-40 hover:opacity-70 transition-opacity grayscale hover:grayscale-0" loading="lazy" />
                    <div className="flex items-center gap-1.5 text-[#5a7a9a]">
                      <Lock className="w-3 h-3" />
                      <span className="text-[11px] font-medium">LGPD Garantida</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden lg:flex justify-center items-center relative" aria-hidden="true">
                <div className="relative w-full max-w-[460px]">
                  <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,_rgba(45,125,210,0.12)_0%,_transparent_65%)]" />
                  <img src={heroImage} alt="Hospital inteligente com dashboards tecnológicos" className="w-full h-auto object-contain drop-shadow-[0_0_60px_rgba(45,125,210,0.15)] relative z-10" loading="eager" />
                  <div className="absolute -top-3 -right-3 w-12 h-12 rounded-xl bg-[#1a3a5c]/80 backdrop-blur border border-[#2d7dd2]/30 flex items-center justify-center shadow-xl animate-[float_4s_ease-in-out_infinite] z-20">
                    <ShieldCheck className="w-6 h-6 text-[#5ba3d9]" />
                  </div>
                  <div className="absolute bottom-8 -left-3 w-11 h-11 rounded-xl bg-[#1a3a5c]/80 backdrop-blur border border-[#2d7dd2]/30 flex items-center justify-center shadow-xl animate-[float_4s_ease-in-out_infinite_1.5s] z-20">
                    <Activity className="w-5 h-5 text-[#5ba3d9]" />
                  </div>
                  <div className="absolute top-1/3 -right-5 w-8 h-8 rounded-full bg-[#2d7dd2]/20 flex items-center justify-center animate-[float_5s_ease-in-out_infinite_2.5s] z-20">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#5ba3d9] animate-ping" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="relative z-10 bg-[#0a1a2e]/80 backdrop-blur-md border-t border-white/5">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <CounterCard value={99} suffix="%" label="Uptime garantido" icon={MonitorCheck} />
                <CounterCard value={500} suffix="+" label="Ativos monitorados" icon={Server} />
                <CounterCard value={24} suffix="/7" label="Suporte contínuo" icon={Clock} />
                <CounterCard value={100} suffix="%" label="Conformidade LGPD" icon={Shield} />
              </div>
            </div>
          </div>

          <div className="relative h-20" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a1a2e]/80 via-[#153656]/50 to-[#f0f5fa]" />
            <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full" preserveAspectRatio="none">
              <path d="M0 40L0 20Q360 0 720 12Q1080 24 1440 8L1440 40Z" fill="#f0f5fa" />
            </svg>
          </div>
        </section>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <section id="solucoes" className="py-20 md:py-28 bg-[#f0f5fa]" aria-labelledby="features-title">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-[#2d7dd2] text-sm font-semibold uppercase tracking-wider mb-3">Nossas Soluções</p>
              <h2 id="features-title" className="text-2xl md:text-4xl font-bold text-[#1a2e44] mb-4">
                Por que escolher a <span className="text-[#2d7dd2]">GESTRATEGIC</span>?
              </h2>
              <p className="text-[#5a7a9a] max-w-xl mx-auto text-base">
                Soluções completas para a gestão e tecnologia da sua unidade de saúde
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <FeatureCard key={index} icon={feature.icon} title={feature.title} description={feature.description} index={index} />
              ))}
            </div>

            {/* Extended services grid */}
            <div className="mt-20">
              <h3 className="text-xl font-bold text-[#1a2e44] text-center mb-10">Portfólio Completo de Serviços</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {services.map((s, i) => (
                  <div key={i} className="flex gap-4 items-start p-5 rounded-xl bg-white/60 border border-[#e2eaf3] hover:bg-white hover:shadow-md transition-all duration-300">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-[#2d7dd2]/10 flex items-center justify-center">
                      <s.icon className="w-5 h-5 text-[#2d7dd2]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#1a2e44] text-sm mb-1">{s.title}</h4>
                      <p className="text-[#5a7a9a] text-xs leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ SEGURANÇA & LGPD ═══════════════ */}
        <section id="seguranca" className="py-20 md:py-28 bg-white" aria-labelledby="security-title">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: Content */}
              <div className="space-y-8">
                <div>
                  <p className="text-[#2d7dd2] text-sm font-semibold uppercase tracking-wider mb-3">Segurança & Conformidade</p>
                  <h2 id="security-title" className="text-2xl md:text-4xl font-bold text-[#1a2e44] mb-4">
                    Proteção de dados com <span className="text-[#2d7dd2]">LGPD garantida</span>
                  </h2>
                  <p className="text-[#5a7a9a] leading-relaxed">
                    Implementamos as melhores práticas de segurança da informação para garantir a proteção total dos dados de pacientes e da operação hospitalar.
                  </p>
                </div>

                <div className="space-y-6">
                  <SecurityItem icon={Shield} title="Criptografia de ponta a ponta" desc="Todos os dados em trânsito e em repouso são protegidos com criptografia AES-256." />
                  <SecurityItem icon={Lock} title="Controle de acesso granular" desc="Políticas RLS e autenticação multifator para acesso seguro baseado em perfil." />
                  <SecurityItem icon={CheckCircle2} title="Auditoria e rastreabilidade" desc="Logs completos de todas as ações para conformidade regulatória e auditorias." />
                  <SecurityItem icon={Database} title="Backup e recuperação" desc="Backups automatizados com plano de disaster recovery testado periodicamente." />
                </div>
              </div>

              {/* Right: Visual */}
              <div className="relative">
                <div className="bg-gradient-to-br from-[#0d2137] to-[#153656] rounded-3xl p-8 md:p-10 space-y-6 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#2d7dd2]/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-[#5ba3d9]" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Painel de Conformidade</p>
                      <p className="text-[#5a7a9a] text-xs">Atualizado em tempo real</p>
                    </div>
                  </div>

                  {[
                    { label: "Conformidade LGPD", pct: 100 },
                    { label: "Criptografia de dados", pct: 100 },
                    { label: "Controles de acesso", pct: 98 },
                    { label: "Políticas de backup", pct: 100 },
                  ].map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8baec8]">{item.label}</span>
                        <span className="text-[#5ba3d9] font-semibold">{item.pct}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#2d7dd2] to-[#5ba3d9] rounded-full transition-all duration-1000" style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 border-t border-white/10 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-xs font-medium">Todos os requisitos atendidos</span>
                  </div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -inset-4 bg-[radial-gradient(circle_at_center,_rgba(45,125,210,0.08)_0%,_transparent_70%)] -z-10" />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ SOBRE NÓS ═══════════════ */}
        <section id="sobre" className="py-20 md:py-28 bg-[#f0f5fa]" aria-labelledby="about-title">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: Visual card */}
              <div className="order-2 lg:order-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-6 border border-[#e2eaf3] shadow-sm space-y-3">
                    <Building2 className="w-8 h-8 text-[#2d7dd2]" />
                    <h4 className="font-bold text-[#1a2e44]">Missão</h4>
                    <p className="text-[#5a7a9a] text-xs leading-relaxed">Transformar a gestão de saúde através de tecnologia inteligente e acessível.</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-[#e2eaf3] shadow-sm space-y-3 mt-6">
                    <Stethoscope className="w-8 h-8 text-[#2d7dd2]" />
                    <h4 className="font-bold text-[#1a2e44]">Visão</h4>
                    <p className="text-[#5a7a9a] text-xs leading-relaxed">Ser referência nacional em soluções de TI para o setor de saúde.</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-[#e2eaf3] shadow-sm space-y-3">
                    <Users className="w-8 h-8 text-[#2d7dd2]" />
                    <h4 className="font-bold text-[#1a2e44]">Valores</h4>
                    <p className="text-[#5a7a9a] text-xs leading-relaxed">Ética, inovação, compromisso com a vida e excelência operacional.</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#2d7dd2] to-[#1a5a8a] rounded-2xl p-6 shadow-lg space-y-3 mt-6">
                    <HeartPulse className="w-8 h-8 text-white" />
                    <h4 className="font-bold text-white">Compromisso</h4>
                    <p className="text-white/80 text-xs leading-relaxed">Cada linha de código e cada servidor que gerenciamos contribuem para salvar vidas.</p>
                  </div>
                </div>
              </div>

              {/* Right: Text */}
              <div className="order-1 lg:order-2 space-y-6">
                <p className="text-[#2d7dd2] text-sm font-semibold uppercase tracking-wider">Sobre Nós</p>
                <h2 id="about-title" className="text-2xl md:text-4xl font-bold text-[#1a2e44]">
                  Tecnologia a serviço da <span className="text-[#2d7dd2]">saúde</span>
                </h2>
                <p className="text-[#5a7a9a] leading-relaxed">
                  A GESTRATEGIC nasceu com o propósito de transformar a realidade da gestão hospitalar brasileira. Combinamos expertise em infraestrutura de TI com profundo conhecimento do setor de saúde para entregar soluções que realmente fazem a diferença na operação e no cuidado ao paciente.
                </p>
                <p className="text-[#5a7a9a] leading-relaxed">
                  Nossa equipe multidisciplinar atua lado a lado com hospitais, UPAs e centros diagnósticos, oferecendo desde consultoria estratégica até a implementação e suporte contínuo de sistemas críticos.
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  {["ISO 27001", "LGPD", "ITIL", "ONA"].map((badge) => (
                    <span key={badge} className="px-4 py-1.5 rounded-full bg-[#2d7dd2]/10 text-[#2d7dd2] text-xs font-semibold border border-[#2d7dd2]/20">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ CONTATO ═══════════════ */}
        <section id="contato" className="py-20 md:py-28 bg-white" aria-labelledby="contact-title">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-[#2d7dd2] text-sm font-semibold uppercase tracking-wider mb-3">Contato</p>
              <h2 id="contact-title" className="text-2xl md:text-4xl font-bold text-[#1a2e44] mb-4">
                Vamos conversar sobre o seu <span className="text-[#2d7dd2]">projeto</span>?
              </h2>
              <p className="text-[#5a7a9a] max-w-xl mx-auto">
                Entre em contato conosco e descubra como podemos transformar a gestão tecnológica da sua unidade de saúde.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <a href="mailto:contato@gestrategic.com.br" className="group flex flex-col items-center text-center p-8 rounded-2xl bg-[#f0f5fa] border border-[#e2eaf3] hover:border-[#2d7dd2]/30 hover:shadow-xl hover:shadow-[#2d7dd2]/8 transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 rounded-2xl bg-[#2d7dd2]/10 flex items-center justify-center mb-4 group-hover:bg-[#2d7dd2]/20 transition-colors">
                  <Mail className="w-6 h-6 text-[#2d7dd2]" />
                </div>
                <h3 className="font-bold text-[#1a2e44] mb-1">E-mail</h3>
                <p className="text-[#2d7dd2] text-sm font-medium">contato@gestrategic.com.br</p>
              </a>

              <a href="tel:+5514999999999" className="group flex flex-col items-center text-center p-8 rounded-2xl bg-[#f0f5fa] border border-[#e2eaf3] hover:border-[#2d7dd2]/30 hover:shadow-xl hover:shadow-[#2d7dd2]/8 transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 rounded-2xl bg-[#2d7dd2]/10 flex items-center justify-center mb-4 group-hover:bg-[#2d7dd2]/20 transition-colors">
                  <Phone className="w-6 h-6 text-[#2d7dd2]" />
                </div>
                <h3 className="font-bold text-[#1a2e44] mb-1">Telefone</h3>
                <p className="text-[#2d7dd2] text-sm font-medium">(14) 99999-9999</p>
              </a>

              <div className="group flex flex-col items-center text-center p-8 rounded-2xl bg-[#f0f5fa] border border-[#e2eaf3] hover:border-[#2d7dd2]/30 hover:shadow-xl hover:shadow-[#2d7dd2]/8 transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 rounded-2xl bg-[#2d7dd2]/10 flex items-center justify-center mb-4 group-hover:bg-[#2d7dd2]/20 transition-colors">
                  <MapPin className="w-6 h-6 text-[#2d7dd2]" />
                </div>
                <h3 className="font-bold text-[#1a2e44] mb-1">Localização</h3>
                <p className="text-[#5a7a9a] text-sm">São Paulo, SP - Brasil</p>
              </div>
            </div>

            {/* CTA final */}
            <div className="mt-16 text-center">
              <div className="inline-flex flex-col sm:flex-row gap-4 p-8 rounded-2xl bg-gradient-to-br from-[#0d2137] to-[#153656] shadow-2xl">
                <div className="text-left sm:mr-6">
                  <h3 className="text-white font-bold text-lg mb-1">Pronto para transformar sua gestão?</h3>
                  <p className="text-[#7eb8e0] text-sm">Agende uma consultoria gratuita com nossos especialistas.</p>
                </div>
                <Button className="bg-[#2d7dd2] hover:bg-[#2570c2] text-white rounded-xl px-8 h-12 text-sm font-semibold shadow-lg shadow-[#2d7dd2]/25 hover:shadow-xl hover:shadow-[#2d7dd2]/35 transition-all shrink-0" onClick={handleLogin}>
                  Acessar Plataforma
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <footer className="bg-[#0d2137] text-[#5a7a9a] border-t border-white/5" role="contentinfo">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Upper footer */}
            <div className="py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-4">
                <a href="#" className="flex items-center gap-2.5">
                  <img src={logoGestrategic} alt="Gestrategic" className="h-9 w-auto rounded" width={36} height={36} loading="lazy" />
                  <div>
                    <span className="text-white font-semibold text-sm block">Gestrategic</span>
                    <span className="text-[#5a7a9a] text-[10px]">Tecnologia em Saúde</span>
                  </div>
                </a>
                <p className="text-xs leading-relaxed max-w-[220px]">
                  Soluções inteligentes de TI e gestão para transformar o setor de saúde.
                </p>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-4">Navegação</h4>
                <ul className="space-y-2">
                  {navLinks.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-xs hover:text-white transition-colors">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-4">Soluções</h4>
                <ul className="space-y-2">
                  {["Infraestrutura de TI", "NOC 24/7", "Automação Hospitalar", "Consultoria LGPD"].map((s) => (
                    <li key={s}><span className="text-xs">{s}</span></li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-4">Contato</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-xs"><Mail className="w-3.5 h-3.5" /> contato@gestrategic.com.br</li>
                  <li className="flex items-center gap-2 text-xs"><Phone className="w-3.5 h-3.5" /> (14) 99999-9999</li>
                  <li className="flex items-center gap-2 text-xs"><MapPin className="w-3.5 h-3.5" /> São Paulo, SP</li>
                </ul>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px]">
                © {new Date().getFullYear()} GESTRATEGIC — Todos os direitos reservados.
              </p>
              <a href="/politica-privacidade" className="text-[11px] hover:text-white transition-colors">
                Política de Privacidade
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
