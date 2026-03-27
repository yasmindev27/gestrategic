import {
  ShieldCheck, Clock, Network, Menu, X, FileText, ExternalLink,
  ChevronRight, Lock, HeartPulse, Activity, Server, BarChart3,
  Users, Mail, Phone, MapPin, CheckCircle2, Zap, Shield,
  Database, MonitorCheck, Stethoscope, Building2, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import logoGestrategic from "@/assets/logo-gestrategic.jpg";
import heroImage from "@/assets/hero-hospital-tech.png";
import logoSusfacil from "@/assets/logo-susfacil.png";
import logoUpa from "@/assets/logo-upa-24h.png";
import { useState, useCallback, useEffect, memo, useRef } from "react";
import { SEOHead, OrganizationSchema, HealthcareServiceSchema } from "@/components/ui/seo-head";

/* ── Color tokens (Azul Marinho Institucional) ── */
const C = {
  bg: "#001a33",        // fundo escuro azul marinho
  bgMid: "#002244",     // mid azul marinho
  bgDeep: "#001229",    // fundo mais profundo
  primary: "#004080",   // azul marinho institucional
  primaryHover: "#003366",
  mint: "#3b82f6",      // azul institucional vibrante (accent)
  mintSoft: "rgba(59,130,246,0.12)",
  mintBorder: "rgba(59,130,246,0.25)",
  textLight: "#bfdbfe", // texto claro sobre escuro
  textMid: "#7cacde",   // texto médio
  textDim: "#5a8ab5",   // texto discreto
  textBody: "#1e293b",  // corpo sobre fundo claro
  textSub: "#475569",   // subtítulos
  surfaceLight: "#f1f5f9", // fundo claro
  cardBorder: "#e2e8f0",
  white: "#ffffff",
};

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
      <div className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: C.mintSoft }}>
        <Icon className="w-6 h-6" style={{ color: C.mint }} />
      </div>
      <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
        {count}{suffix}
      </p>
      <p className="text-sm font-medium" style={{ color: C.textLight }}>{label}</p>
    </div>
  );
});
CounterCard.displayName = "CounterCard";

/* ── Feature Card ── */
const FeatureCard = memo(({ icon: Icon, title, description, index }: {
  icon: typeof ShieldCheck; title: string; description: string; index: number;
}) => (
  <article className={`group relative text-left space-y-4 p-8 rounded-2xl bg-white border hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 animate-slide-up-fade ${
    index === 0 ? "animate-delay-100" : index === 1 ? "animate-delay-200" : "animate-delay-300"
  }`} style={{ borderColor: C.cardBorder }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,83,92,0.3)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.cardBorder; }}>
    <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent to-transparent group-hover:via-primary/40 transition-all duration-500" />
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500" style={{ background: "linear-gradient(135deg, rgba(26,83,92,0.12), rgba(78,205,196,0.08))" }}>
      <Icon className="w-7 h-7" style={{ color: C.primary }} />
    </div>
    <h3 className="text-lg font-bold" style={{ color: C.textBody }}>{title}</h3>
    <p className="leading-relaxed text-sm" style={{ color: C.textSub }}>{description}</p>
    <div className="flex items-center gap-1.5 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ color: C.primary }}>
      <span>Saiba mais</span>
      <ArrowRight className="w-4 h-4" />
    </div>
  </article>
));
FeatureCard.displayName = "FeatureCard";

/* ── Security Feature Item ── */
const SecurityItem = memo(({ icon: Icon, title, desc }: { icon: typeof Shield; title: string; desc: string }) => (
  <div className="flex gap-4 items-start">
    <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5" style={{ background: "rgba(26,83,92,0.08)" }}>
      <Icon className="w-5 h-5" style={{ color: C.primary }} />
    </div>
    <div>
      <h4 className="font-semibold mb-1" style={{ color: C.textBody }}>{title}</h4>
      <p className="text-sm leading-relaxed" style={{ color: C.textSub }}>{desc}</p>
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
     { label: "Início", to: "/" },
     { label: "Soluções", to: "/#solucoes" },
     { label: "Segurança & LGPD", to: "/#seguranca" },
     { label: "Sobre Nós", to: "/#sobre" },
     { label: "Contato", to: "/#contato" },
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
              ? "backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.25)] border-b border-white/5"
              : ""
          }`}
          style={{ background: scrolled ? `${C.bg}f2` : C.bg }}
          role="banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <a href="#" className="flex items-center gap-2.5 shrink-0" aria-label="Gestrategic - Página Inicial">
                <img src={logoGestrategic} alt="Gestrategic Logo" className="h-12 w-auto rounded" width={48} height={48} loading="eager" />
                <div className="hidden sm:block">
                  <span className="text-white font-semibold text-sm leading-none block">Gestrategic</span>
                  <span className="text-[10px] leading-none" style={{ color: C.textLight }}>Tecnologia em Saúde</span>
                </div>
              </a>

              <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Navegação principal">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.label}
                    to={link.to}
                    className="text-sm px-3 py-2 rounded-md hover:bg-white/5 transition-all font-semibold"
                    style={{ color: C.textLight }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.color = C.white; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.color = C.textLight; }}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <Button className="hidden sm:flex text-white rounded-lg px-5 h-9 text-sm font-semibold transition-all hover:shadow-lg" style={{ background: C.primary }} onClick={handleLogin}>
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
                    <NavLink
                      key={link.label}
                      to={link.to}
                      className="text-sm py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors"
                      style={{ color: C.textLight }}
                      onClick={closeMobileMenu}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                  <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/10">
                    <Button variant="outline" className="border-white/20 hover:bg-white/5 hover:text-white w-full rounded-lg" style={{ color: C.textLight }} onClick={() => { closeMobileMenu(); handleDocumentosInteract(); }}>
                      <FileText className="w-4 h-4 mr-2" />
                      Documentos Interact
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </Button>
                    <Button className="text-white w-full rounded-lg font-semibold" style={{ background: C.primary }} onClick={handleLogin}>
                      Área do Cliente
                    </Button>
                  </div>
                </div>
              </nav>
            )}
          </div>
        </header>

        {/* ═══════════════ HERO ═══════════════ */}
        <section className="relative overflow-hidden pt-24 sm:pt-28" style={{ background: C.bg }} aria-labelledby="hero-title">
          <div className="absolute inset-0" aria-hidden="true">
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${C.bg}, ${C.bgMid}, ${C.bgDeep})` }} />
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
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: "rgba(78,205,196,0.06)" }} />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: "rgba(26,83,92,0.1)" }} />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 lg:py-24 relative">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-6 z-10 animate-slide-up-fade">
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 backdrop-blur-sm" style={{ background: C.mintSoft, border: `1px solid ${C.mintBorder}` }}>
                  <HeartPulse className="w-4 h-4 animate-pulse" style={{ color: C.mint }} />
                  <span className="text-xs font-medium" style={{ color: C.textLight }}>Tecnologia que salva vidas</span>
                </div>

                <h1 id="hero-title" className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] text-white leading-[1.15] tracking-tight">
                  <span className="font-light">Inovação que</span><br />
                  <span className="font-bold">pulsa pela </span>
                  <span className="font-bold shimmer-text">vida.</span>
                </h1>

                <p className="text-base sm:text-lg max-w-md leading-relaxed" style={{ color: C.textMid }}>
                  Automação inteligente e infraestrutura de TI de alta performance para hospitais, clínicas e centros diagnóstico.
                </p>

                <div className="flex flex-wrap gap-3 pt-1">
                  <Button className="text-white rounded-xl px-7 h-12 text-sm font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0" style={{ background: C.primary, boxShadow: `0 8px 24px rgba(26,83,92,0.3)` }} asChild>
                    <a href="#solucoes">Conheça nossas Soluções</a>
                  </Button>
                  <Button variant="outline" className="hover:text-white rounded-xl px-7 h-12 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 bg-transparent backdrop-blur-sm" style={{ border: `1px solid rgba(78,205,196,0.3)`, color: C.textLight }} asChild>
                    <a href="#contato">Agendar Consultoria</a>
                  </Button>
                </div>

                <div className="pt-6 mt-2 border-t border-white/8">
                  <p className="text-[11px] uppercase tracking-[0.15em] mb-3 font-medium" style={{ color: C.textDim }}>EMPRESAS QUE CONFIAM EM NÓS</p>
                  <div className="flex items-center gap-5 flex-wrap">
                    <img src={logoUpa} alt="UPA 24h" className="h-7 opacity-40 hover:opacity-70 transition-opacity grayscale hover:grayscale-0" loading="lazy" />
                    <img src={logoSusfacil} alt="SUS Fácil" className="h-7 opacity-40 hover:opacity-70 transition-opacity grayscale hover:grayscale-0" loading="lazy" />
                    <div className="flex items-center gap-1.5" style={{ color: C.textDim }}>
                      <Lock className="w-3 h-3" />
                      <span className="text-[11px] font-medium">LGPD Garantida</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex justify-center items-center relative" aria-hidden="true">
                <div className="relative w-full max-w-[460px]">
                  <div className="absolute -inset-10" style={{ background: "radial-gradient(circle at center, rgba(59,130,246,0.1) 0%, transparent 65%)" }} />
                  <img src={heroImage} alt="Hospital inteligente com dashboards tecnológicos" className="w-full h-auto object-contain relative z-10" style={{ filter: "drop-shadow(0 0 60px rgba(59,130,246,0.15))" }} loading="eager" />
                  <div className="absolute -top-3 -right-3 w-12 h-12 rounded-xl backdrop-blur flex items-center justify-center shadow-xl animate-[float_4s_ease-in-out_infinite] z-20" style={{ background: "rgba(0,26,51,0.85)", border: `1px solid ${C.mintBorder}` }}>
                    <ShieldCheck className="w-6 h-6" style={{ color: C.mint }} />
                  </div>
                  <div className="absolute bottom-8 -left-3 w-11 h-11 rounded-xl backdrop-blur flex items-center justify-center shadow-xl animate-[float_4s_ease-in-out_infinite_1.5s] z-20" style={{ background: "rgba(0,26,51,0.85)", border: `1px solid ${C.mintBorder}` }}>
                    <Activity className="w-5 h-5" style={{ color: C.mint }} />
                  </div>
                  <div className="absolute top-1/3 -right-5 w-8 h-8 rounded-full flex items-center justify-center animate-[float_5s_ease-in-out_infinite_2.5s] z-20" style={{ background: "rgba(59,130,246,0.15)" }}>
                    <div className="w-2.5 h-2.5 rounded-full animate-ping" style={{ background: C.mint }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="relative z-10 backdrop-blur-md border-t border-white/5" style={{ background: `${C.bgDeep}cc` }}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <CounterCard value={100} suffix="%" label="Uptime garantido" icon={MonitorCheck} />
                <CounterCard value={500} suffix="+" label="Ativos monitorados" icon={Server} />
                <CounterCard value={24} suffix="/7" label="Suporte contínuo" icon={Clock} />
                <CounterCard value={100} suffix="%" label="Conformidade LGPD" icon={Shield} />
              </div>
            </div>
          </div>

          <div className="relative h-20" aria-hidden="true">
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${C.bgDeep}cc, rgba(26,83,92,0.12), ${C.surfaceLight})` }} />
            <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full" preserveAspectRatio="none">
              <path d="M0 40L0 20Q360 0 720 12Q1080 24 1440 8L1440 40Z" fill={C.surfaceLight} />
            </svg>
          </div>
        </section>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <section id="solucoes" className="py-20 md:py-28" style={{ background: C.surfaceLight }} aria-labelledby="features-title">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: C.primary }}>Nossas Soluções</p>
              <h2 id="features-title" className="text-2xl md:text-4xl font-bold mb-4" style={{ color: C.textBody }}>
                Por que escolher a <span style={{ color: C.primary }}>GESTRATEGIC</span>?
              </h2>
              <p className="max-w-xl mx-auto text-base" style={{ color: C.textSub }}>
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
              <h3 className="text-xl font-bold text-center mb-10" style={{ color: C.textBody }}>Portfólio Completo de Serviços</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {services.map((s, i) => (
                  <div key={i} className="flex gap-4 items-start p-5 rounded-xl bg-white/60 hover:bg-white hover:shadow-md transition-all duration-300" style={{ border: `1px solid ${C.cardBorder}` }}>
                    <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(26,83,92,0.08)" }}>
                      <s.icon className="w-5 h-5" style={{ color: C.primary }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1" style={{ color: C.textBody }}>{s.title}</h4>
                      <p className="text-xs leading-relaxed" style={{ color: C.textSub }}>{s.desc}</p>
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
              <div className="space-y-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: C.primary }}>Segurança & Conformidade</p>
                  <h2 id="security-title" className="text-2xl md:text-4xl font-bold mb-4" style={{ color: C.textBody }}>
                    Proteção de dados com <span style={{ color: C.primary }}>LGPD garantida</span>
                  </h2>
                  <p className="leading-relaxed" style={{ color: C.textSub }}>
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
                <div className="rounded-3xl p-8 md:p-10 space-y-6 shadow-2xl" style={{ background: `linear-gradient(135deg, ${C.bg}, ${C.bgDeep})` }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(78,205,196,0.15)" }}>
                      <Shield className="w-5 h-5" style={{ color: C.mint }} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Painel de Conformidade</p>
                      <p className="text-xs" style={{ color: C.textDim }}>Atualizado em tempo real</p>
                    </div>
                  </div>

                  {[
                    { label: "Conformidade LGPD", pct: 100 },
                    { label: "Criptografia de dados", pct: 100 },
                    { label: "Controles de acesso", pct: 100 },
                    { label: "Políticas de backup", pct: 100 },
                  ].map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: C.textMid }}>{item.label}</span>
                        <span className="font-semibold" style={{ color: C.mint }}>{item.pct}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.pct}%`, background: `linear-gradient(to right, ${C.primary}, ${C.mint})` }} />
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 border-t border-white/10 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" style={{ color: C.mint }} />
                    <span className="text-xs font-medium" style={{ color: C.mint }}>Todos os requisitos atendidos</span>
                  </div>
                </div>
                <div className="absolute -inset-4 -z-10" style={{ background: "radial-gradient(circle at center, rgba(78,205,196,0.06) 0%, transparent 70%)" }} />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ SOBRE NÓS ═══════════════ */}
        <section id="sobre" className="py-20 md:py-28" style={{ background: C.surfaceLight }} aria-labelledby="about-title">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3" style={{ border: `1px solid ${C.cardBorder}` }}>
                    <Building2 className="w-8 h-8" style={{ color: C.primary }} />
                    <h4 className="font-bold" style={{ color: C.textBody }}>Missão</h4>
                    <p className="text-xs leading-relaxed" style={{ color: C.textSub }}>Transformar a gestão de saúde através de tecnologia inteligente e acessível.</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3 mt-6" style={{ border: `1px solid ${C.cardBorder}` }}>
                    <Stethoscope className="w-8 h-8" style={{ color: C.primary }} />
                    <h4 className="font-bold" style={{ color: C.textBody }}>Visão</h4>
                    <p className="text-xs leading-relaxed" style={{ color: C.textSub }}>Ser referência nacional em soluções de TI para o setor de saúde.</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3" style={{ border: `1px solid ${C.cardBorder}` }}>
                    <Users className="w-8 h-8" style={{ color: C.primary }} />
                    <h4 className="font-bold" style={{ color: C.textBody }}>Valores</h4>
                    <p className="text-xs leading-relaxed" style={{ color: C.textSub }}>Ética, inovação, compromisso com a vida e excelência operacional.</p>
                  </div>
                  <div className="rounded-2xl p-6 shadow-lg space-y-3 mt-6" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.bgDeep})` }}>
                    <HeartPulse className="w-8 h-8 text-white" />
                    <h4 className="font-bold text-white">Compromisso</h4>
                    <p className="text-white/80 text-xs leading-relaxed">Cada linha de código e cada servidor que gerenciamos contribuem para salvar vidas.</p>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2 space-y-6">
                <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: C.primary }}>Sobre Nós</p>
                <h2 id="about-title" className="text-2xl md:text-4xl font-bold" style={{ color: C.textBody }}>
                  Tecnologia a serviço da <span style={{ color: C.primary }}>saúde</span>
                </h2>
                <p className="leading-relaxed" style={{ color: C.textSub }}>
                  A GESTRATEGIC nasceu com o propósito de transformar a realidade da gestão hospitalar brasileira. Combinamos expertise em infraestrutura de TI com profundo conhecimento do setor de saúde para entregar soluções que realmente fazem a diferença na operação e no cuidado ao paciente.
                </p>
                <p className="leading-relaxed" style={{ color: C.textSub }}>
                  Nossa equipe multidisciplinar atua lado a lado com hospitais, UPAs e centros diagnósticos, oferecendo desde consultoria estratégica até a implementação e suporte contínuo de sistemas críticos.
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  {["ISO 27001", "LGPD", "ITIL", "ONA"].map((badge) => (
                    <span key={badge} className="px-4 py-1.5 rounded-full text-xs font-semibold" style={{ background: "rgba(26,83,92,0.08)", color: C.primary, border: "1px solid rgba(26,83,92,0.15)" }}>
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
              <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: C.primary }}>Contato</p>
              <h2 id="contact-title" className="text-2xl md:text-4xl font-bold mb-4" style={{ color: C.textBody }}>
                Vamos conversar sobre o seu <span style={{ color: C.primary }}>projeto</span>?
              </h2>
              <p className="max-w-xl mx-auto" style={{ color: C.textSub }}>
                Entre em contato conosco e descubra como podemos transformar a gestão tecnológica da sua unidade de saúde.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <a href="mailto:gestrategic@saude.com.br" className="group flex flex-col items-center text-center p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ background: C.surfaceLight, border: `1px solid ${C.cardBorder}` }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors" style={{ background: "rgba(26,83,92,0.08)" }}>
                  <Mail className="w-6 h-6" style={{ color: C.primary }} />
                </div>
                <h3 className="font-bold mb-1" style={{ color: C.textBody }}>E-mail</h3>
                <p className="text-sm font-medium" style={{ color: C.primary }}>gestrategic@saude.com.br</p>
              </a>

              <a href="tel:+5514999999999" className="group flex flex-col items-center text-center p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ background: C.surfaceLight, border: `1px solid ${C.cardBorder}` }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors" style={{ background: "rgba(26,83,92,0.08)" }}>
                  <Phone className="w-6 h-6" style={{ color: C.primary }} />
                </div>
                <h3 className="font-bold mb-1" style={{ color: C.textBody }}>Telefone</h3>
                <p className="text-sm font-medium" style={{ color: C.primary }}>(37) 99142-1269</p>
              </a>

              <div className="group flex flex-col items-center text-center p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ background: C.surfaceLight, border: `1px solid ${C.cardBorder}` }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors" style={{ background: "rgba(26,83,92,0.08)" }}>
                  <MapPin className="w-6 h-6" style={{ color: C.primary }} />
                </div>
                <h3 className="font-bold mb-1" style={{ color: C.textBody }}>Localização</h3>
                <p className="text-sm" style={{ color: C.textSub }}>Belo Horizonte - MG</p>
              </div>
            </div>

            {/* CTA final */}
            <div className="mt-16 text-center">
              <div className="inline-flex flex-col sm:flex-row gap-4 p-8 rounded-2xl shadow-2xl" style={{ background: `linear-gradient(135deg, ${C.bg}, ${C.bgDeep})` }}>
                <div className="text-left sm:mr-6">
                  <h3 className="text-white font-bold text-lg mb-1">Pronto para transformar sua gestão?</h3>
                  <p className="text-sm" style={{ color: C.textLight }}>Agende uma consultoria gratuita com nossos especialistas.</p>
                </div>
                <Button className="text-white rounded-xl px-8 h-12 text-sm font-semibold shadow-lg hover:shadow-xl transition-all shrink-0" style={{ background: C.primary }} onClick={handleLogin}>
                  Acessar Plataforma
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <footer className="border-t border-white/5" style={{ background: C.bg, color: C.textDim }} role="contentinfo">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-4">
                <a href="#" className="flex items-center gap-2.5">
                  <img src={logoGestrategic} alt="Gestrategic" className="h-9 w-auto rounded" width={36} height={36} loading="lazy" />
                  <div>
                    <span className="text-white font-semibold text-sm block">Gestrategic</span>
                    <span className="text-[10px]" style={{ color: C.textDim }}>Tecnologia em Saúde</span>
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
                      <NavLink to={link.to} className="text-xs hover:text-white transition-colors">{link.label}</NavLink>
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
                  <li className="flex items-center gap-2 text-xs"><Mail className="w-3.5 h-3.5" /> gestrategic@saude.com.br</li>
                  <li className="flex items-center gap-2 text-xs"><Phone className="w-3.5 h-3.5" /> (37) 99142-1269</li>
                  <li className="flex items-center gap-2 text-xs"><MapPin className="w-3.5 h-3.5" /> Belo Horizonte - MG</li>
                </ul>
              </div>
            </div>

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
