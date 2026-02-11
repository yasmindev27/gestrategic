import { ShieldCheck, Clock, Network, Menu, X, FileText, ExternalLink, ChevronRight, Lock, HeartPulse, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logoGestrategic from "@/assets/logo-gestrategic.jpg";
import heroImage from "@/assets/hero-hospital-tech.png";
import logoSusfacil from "@/assets/logo-susfacil.png";
import logoUpa from "@/assets/logo-upa-24h.png";
import { useState, useCallback, useEffect, memo } from "react";
import { SEOHead, OrganizationSchema, HealthcareServiceSchema } from "@/components/ui/seo-head";

const FeatureCard = memo(({ icon: Icon, title, description, index }: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  index: number;
}) => (
  <article 
    className={`group text-center space-y-4 p-8 rounded-2xl bg-white/80 backdrop-blur-sm border border-[#e2eaf3] hover:border-[#2d7dd2]/40 hover:shadow-xl hover:shadow-[#2d7dd2]/10 transition-all duration-500 hover:-translate-y-1 animate-slide-up-fade ${
      index === 0 ? "animate-delay-100" : index === 1 ? "animate-delay-200" : "animate-delay-300"
    }`}
  >
    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2d7dd2]/15 to-[#2d7dd2]/5 flex items-center justify-center group-hover:from-[#2d7dd2]/25 group-hover:to-[#2d7dd2]/10 group-hover:scale-110 transition-all duration-500 group-hover:shadow-lg group-hover:shadow-[#2d7dd2]/15" aria-hidden="true">
      <Icon className="w-7 h-7 text-[#2d7dd2] transition-transform duration-500 group-hover:scale-110" />
    </div>
    <h3 className="text-lg font-bold text-[#1a2e44]">{title}</h3>
    <p className="text-[#5a7a9a] leading-relaxed text-sm">{description}</p>
    <div className="h-0.5 w-0 mx-auto bg-gradient-to-r from-transparent via-[#2d7dd2]/40 to-transparent group-hover:w-16 transition-all duration-500" />
  </article>
));

FeatureCard.displayName = 'FeatureCard';

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
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen(prev => !prev), []);

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
              {/* Logo */}
              <a href="#" className="flex items-center gap-2.5 shrink-0" aria-label="Gestrategic - Página Inicial">
                <img src={logoGestrategic} alt="Gestrategic Logo" className="h-9 w-auto rounded" width={36} height={36} loading="eager" />
                <div className="hidden sm:block">
                  <span className="text-white font-semibold text-sm leading-none block">Gestrategic</span>
                  <span className="text-[#7eb8e0] text-[10px] leading-none">Tecnologia em Saúde</span>
                </div>
              </a>

              {/* Desktop Nav */}
              <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Navegação principal">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-sm text-[#a3c4e0] hover:text-white px-3 py-2 rounded-md hover:bg-white/5 transition-all font-semibold"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              {/* CTA + Mobile */}
              <div className="flex items-center gap-2">
                <Button
                  className="hidden sm:flex bg-[#2d7dd2] hover:bg-[#2570c2] text-white rounded-lg px-5 h-9 text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[#2d7dd2]/30"
                  onClick={handleLogin}
                >
                  Área do Cliente
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </Button>
                <button
                  className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
                  onClick={toggleMobileMenu}
                  aria-expanded={mobileMenuOpen}
                  aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Mobile Nav */}
            {mobileMenuOpen && (
              <nav className="lg:hidden py-3 border-t border-white/10 animate-fade-in">
                <div className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-sm text-[#a3c4e0] hover:text-white py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      {link.label}
                    </a>
                  ))}
                  <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/10">
                    <Button
                      variant="outline"
                      className="border-white/20 text-[#a3c4e0] hover:bg-white/5 hover:text-white w-full rounded-lg"
                      onClick={() => { closeMobileMenu(); handleDocumentosInteract(); }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Documentos Interact
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </Button>
                    <Button
                      className="bg-[#2d7dd2] hover:bg-[#2570c2] text-white w-full rounded-lg font-semibold"
                      onClick={handleLogin}
                    >
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
          {/* Subtle background elements */}
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
            {/* Soft light orbs */}
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#2d7dd2]/8 blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#1a5a8a]/10 blur-[100px]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 lg:py-24 relative">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left: Copy */}
              <div className="space-y-6 z-10 animate-slide-up-fade">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-[#2d7dd2]/15 border border-[#2d7dd2]/25 rounded-full px-4 py-1.5 backdrop-blur-sm">
                  <HeartPulse className="w-4 h-4 text-[#5ba3d9] animate-pulse" />
                  <span className="text-[#7eb8e0] text-xs font-medium tracking-wide">Gestão Hospitalar Inteligente</span>
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
                  <Button
                    className="bg-[#2d7dd2] hover:bg-[#2570c2] text-white rounded-xl px-7 h-12 text-sm font-semibold shadow-lg shadow-[#2d7dd2]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#2d7dd2]/35 hover:-translate-y-0.5 active:translate-y-0"
                    asChild
                  >
                    <a href="#solucoes">Conheça nossas Soluções</a>
                  </Button>
                  <Button
                    variant="outline"
                    className="border border-[#3d6d9e]/50 text-[#a3c4e0] hover:bg-[#1a3a5c] hover:text-white hover:border-[#5ba3d9]/50 rounded-xl px-7 h-12 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 bg-transparent backdrop-blur-sm"
                    asChild
                  >
                    <a href="#contato">Agendar Consultoria</a>
                  </Button>
                </div>

                {/* Social Proof */}
                <div className="pt-6 mt-2 border-t border-white/8">
                  <p className="text-[#5a7a9a] text-[11px] uppercase tracking-[0.15em] mb-3 font-medium">Empresas que confiam em nós</p>
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

              {/* Right: Hero Image */}
              <div className="hidden lg:flex justify-center items-center relative" aria-hidden="true">
                <div className="relative w-full max-w-[460px]">
                  {/* Glow behind image */}
                  <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,_rgba(45,125,210,0.12)_0%,_transparent_65%)]" />

                  <img
                    src={heroImage}
                    alt="Hospital inteligente com dashboards tecnológicos"
                    className="w-full h-auto object-contain drop-shadow-[0_0_60px_rgba(45,125,210,0.15)] relative z-10"
                    loading="eager"
                  />

                  {/* Floating badges */}
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

          {/* Bottom transition */}
          <div className="relative h-20" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#153656]/50 to-[#f0f5fa]" />
            <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full" preserveAspectRatio="none">
              <path d="M0 40L0 20Q360 0 720 12Q1080 24 1440 8L1440 40Z" fill="#f0f5fa" />
            </svg>
          </div>
        </section>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <section id="solucoes" className="py-16 md:py-24 bg-[#f0f5fa]" aria-labelledby="features-title">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 id="features-title" className="text-2xl md:text-3xl font-bold text-[#1a2e44] mb-3">
                Por que escolher a <span className="text-[#2d7dd2]">GESTRATEGIC</span>?
              </h2>
              <p className="text-[#5a7a9a] max-w-xl mx-auto">
                Soluções completas para a gestão e tecnologia da sua unidade de saúde
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <FeatureCard key={index} icon={feature.icon} title={feature.title} description={feature.description} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <footer className="bg-[#0d2137] text-[#5a7a9a] py-12 border-t border-white/5" role="contentinfo">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center gap-5">
              <a href="#" className="flex items-center gap-3 group" aria-label="Gestrategic - Voltar ao topo">
                <img src={logoGestrategic} alt="Gestrategic" className="h-10 w-auto rounded transition-transform duration-300 group-hover:scale-105" width={40} height={40} loading="lazy" />
              </a>
              <div className="flex items-center gap-2 text-[#3d5a78]">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#3d5a78]/50" />
                <p className="text-xs text-center">
                  © {new Date().getFullYear()} GESTRATEGIC — Todos os direitos reservados.
                </p>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#3d5a78]/50" />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
