import { ShieldCheck, Clock, Network, Menu, X, FileText, ExternalLink, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logoGestrategic from "@/assets/logo-gestrategic.jpg";
import heroImage from "@/assets/hero-hospital-tech.png";
import logoSusfacil from "@/assets/logo-susfacil.png";
import logoUpa from "@/assets/logo-upa-24h.png";
import { useState, useCallback, useEffect, memo } from "react";
import { SEOHead, OrganizationSchema, HealthcareServiceSchema } from "@/components/ui/seo-head";

// Memoized feature card component for performance
const FeatureCard = memo(({ icon: Icon, title, description }: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) => (
  <article className="group text-center space-y-5 p-8 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary">
    <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
      <Icon className="w-10 h-10 text-primary" />
    </div>
    <h3 className="text-xl font-semibold text-foreground">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{description}</p>
  </article>
));

FeatureCard.displayName = 'FeatureCard';

// Memoized navigation link
const NavLink = memo(({ href, label, onClick }: {
  href: string;
  label: string;
  onClick?: () => void;
}) => (
  <a
    href={href}
    className="text-sm text-white/70 hover:text-white transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-2 py-1 relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-0 hover:after:w-full after:h-0.5 after:bg-white/60 after:transition-all after:duration-300"
    onClick={onClick}
  >
    {label}
  </a>
));

NavLink.displayName = 'NavLink';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogin = useCallback(() => {
    navigate("/auth");
  }, [navigate]);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const navLinks = [
    { label: "Início", href: "#" },
    { label: "Soluções", href: "#solucoes" },
    { label: "Segurança & LGPD", href: "#seguranca" },
    { label: "Sobre Nós", href: "#sobre" },
    { label: "Contato", href: "#contato" },
  ];

  const handleDocumentosInteract = useCallback(() => {
    window.open(
      "https://santacasachavantes.interact.com.br/sa/custom/webdocuments/anonymous/list.jsp?unit=%2334",
      "_blank",
      "noopener,noreferrer"
    );
  }, []);

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
      description: "Conectamos HIS e PACS com automação setorial, eliminando falhas manuais e acelerando a operação com dados centralizados e confiáveis.",
    },
  ];

  return (
    <>
      {/* SEO Components */}
      <SEOHead
        title="Gestrategic - Gestão Hospitalar Inteligente"
        description="Automação inteligente e infraestrutura de TI de alta performance para hospitais, clínicas e centros diagnóstico. Conformidade LGPD garantida."
        keywords="gestão hospitalar, sistema de saúde, LGPD, hospital, clínica, monitoramento, TI hospitalar, automação"
      />
      <OrganizationSchema />
      <HealthcareServiceSchema />

      <div className="min-h-screen bg-background overflow-x-hidden">
        {/* Sticky Glassmorphism Header */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled
              ? "bg-[#1a3a5c]/80 backdrop-blur-xl shadow-lg shadow-black/10 border-b border-white/5"
              : "bg-gradient-to-r from-[#1a3a5c] to-[#1e4a6e]"
          }`}
          role="banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <a href="#" className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg p-1" aria-label="Gestrategic - Página Inicial">
                <img
                  src={logoGestrategic}
                  alt="Gestrategic Logo"
                  className="h-10 w-auto rounded-md"
                  width={40}
                  height={40}
                  loading="eager"
                />
                <span className="font-semibold tracking-tight text-xs text-white">
                  Gestrategic<br />Tecnologia em Saúde
                </span>
              </a>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-6 lg:gap-8" role="navigation" aria-label="Navegação principal">
                {navLinks.map((link) => (
                  <NavLink key={link.label} href={link.href} label={link.label} />
                ))}
              </nav>

              {/* CTA Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="hidden sm:flex border-white/20 text-white/80 hover:bg-white/10 hover:text-white rounded-full px-4 transition-all focus:ring-2 focus:ring-white/50 text-xs"
                  onClick={handleDocumentosInteract}
                  aria-label="Acessar Documentos Interact"
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  Documentos
                  <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                </Button>
                <Button
                  className="hidden sm:flex bg-white text-[#1a3a5c] hover:bg-white/90 rounded-full px-6 font-semibold shadow-lg shadow-white/10 transition-all hover:shadow-xl hover:shadow-white/20 hover:scale-[1.02] focus:ring-2 focus:ring-white/50"
                  onClick={handleLogin}
                  aria-label="Acessar área do cliente"
                >
                  Área do Cliente
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>

                {/* Mobile menu button */}
                <button
                  className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 text-white"
                  onClick={toggleMobileMenu}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-menu"
                  aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
              <nav
                id="mobile-menu"
                className="md:hidden py-4 border-t border-white/10 animate-fade-in"
                role="navigation"
                aria-label="Menu mobile"
              >
                <div className="flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-sm text-white/80 hover:text-white py-2 px-2 rounded-lg hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                      onClick={closeMobileMenu}
                    >
                      {link.label}
                    </a>
                  ))}
                  <Button
                    variant="outline"
                    className="mt-2 border-white/30 text-white hover:bg-white/10 hover:text-white w-full rounded-full transition-all flex items-center justify-center gap-2"
                    onClick={() => {
                      closeMobileMenu();
                      handleDocumentosInteract();
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    Documentos Interact
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </Button>
                  <Button
                    className="mt-2 bg-white text-[#1a3a5c] hover:bg-white/90 w-full rounded-full font-semibold shadow-lg transition-all"
                    onClick={handleLogin}
                  >
                    Área do Cliente
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </nav>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-[#0f2b45] via-[#1a3a5c] to-[#1e4a6e] overflow-hidden min-h-[650px] pt-16" aria-labelledby="hero-title">
          {/* Background Pattern */}
          <div className="absolute inset-0" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(59,130,246,0.12)_0%,_transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(45,125,210,0.08)_0%,_transparent_50%)]" />
            <div className="absolute inset-0 opacity-[0.06]">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Text Content */}
              <div className="space-y-8 z-10">
                <h1 id="hero-title" className="text-4xl md:text-5xl lg:text-6xl text-white leading-tight">
                  <span className="font-light italic">Inovação que</span><br />
                  <span className="font-semibold italic">pulsa pela </span>
                  <span className="font-bold italic bg-gradient-to-r from-[#22d3ee] to-[#34d399] bg-clip-text text-transparent">vida.</span>
                </h1>
                <p className="text-white/80 text-lg md:text-xl max-w-lg leading-relaxed font-medium">
                  Automação inteligente e infraestrutura de TI de alta performance para hospitais, clínicas e centros diagnóstico.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Button
                    className="bg-[#2d7dd2] hover:bg-[#2570c2] text-white rounded-full px-8 py-6 text-base font-semibold shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/35 hover:scale-[1.02] focus:ring-2 focus:ring-white/50"
                    asChild
                  >
                    <a href="#solucoes">Conheça nossas Soluções</a>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 rounded-full px-8 py-6 text-base font-medium transition-all hover:scale-[1.02] focus:ring-2 focus:ring-white/50 bg-transparent"
                    asChild
                  >
                    <a href="#contato">Agendar Consultoria</a>
                  </Button>
                </div>

                {/* Social Proof */}
                <div className="pt-6 border-t border-white/10">
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-4 font-medium">Empresas que confiam em nós</p>
                  <div className="flex items-center gap-6 flex-wrap">
                    <img src={logoUpa} alt="UPA 24h" className="h-8 opacity-50 hover:opacity-80 transition-opacity grayscale hover:grayscale-0" loading="lazy" />
                    <img src={logoSusfacil} alt="SUS Fácil" className="h-8 opacity-50 hover:opacity-80 transition-opacity grayscale hover:grayscale-0" loading="lazy" />
                    <div className="flex items-center gap-1.5 text-white/40 hover:text-white/60 transition-colors">
                      <Lock className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Segurança LGPD Garantida</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern Hero Illustration */}
              <div className="hidden lg:flex justify-center items-center relative" aria-hidden="true">
                <div className="relative w-[480px] h-[480px]">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.12)_0%,_transparent_70%)]" />

                  {/* Hero Image */}
                  <img
                    src={heroImage}
                    alt="Hospital inteligente com dashboards tecnológicos"
                    className="w-full h-full object-contain drop-shadow-2xl"
                    loading="eager"
                  />

                  {/* Floating elements with float animation */}
                  <div className="absolute top-4 right-4 w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg animate-[float_3s_ease-in-out_infinite]">
                    <ShieldCheck className="w-7 h-7 text-[#22d3ee]" />
                  </div>
                  <div className="absolute bottom-16 left-4 w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg animate-[float_3s_ease-in-out_infinite_0.5s]">
                    <Clock className="w-6 h-6 text-[#34d399]" />
                  </div>
                  <div className="absolute top-1/3 right-0 w-10 h-10 rounded-full bg-[#22d3ee]/20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-[#22d3ee] animate-ping" />
                  </div>
                  <div className="absolute bottom-1/3 left-8 w-8 h-8 rounded-full bg-[#34d399]/10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#34d399] animate-ping" style={{ animationDelay: "1s" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Organic wave transition */}
          <div className="absolute bottom-0 left-0 right-0" aria-hidden="true">
            <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none">
              <path d="M0 100L0 60C120 80 240 40 360 35C480 30 600 50 720 55C840 60 960 40 1080 30C1200 20 1320 50 1440 65L1440 100Z" fill="hsl(var(--background))" />
              <path d="M0 100L0 70C120 85 240 55 360 48C480 42 600 60 720 65C840 70 960 52 1080 42C1200 32 1320 58 1440 72L1440 100Z" fill="hsl(var(--background))" fillOpacity="0.5" />
            </svg>
          </div>
        </section>

        {/* Features Section */}
        <section id="solucoes" className="py-20 md:py-28 bg-background" aria-labelledby="features-title">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 id="features-title" className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
                Por que escolher a <span className="text-primary">GESTRATEGIC</span>?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Soluções completas para a gestão e tecnologia da sua unidade de saúde
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <FeatureCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gradient-to-r from-[#1a3a5c] to-[#1e4a6e] text-white/60 py-10 relative overflow-hidden" role="contentinfo">
          {/* Decorative element */}
          <div className="absolute bottom-0 right-0 opacity-10" aria-hidden="true">
            <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
              <path d="M200 200L200 100L100 100L100 0L0 0L0 200L200 200Z" fill="url(#footerGradient)" />
              <defs>
                <linearGradient id="footerGradient" x1="0" y1="0" x2="200" y2="200">
                  <stop stopColor="#5ba3d9" />
                  <stop offset="1" stopColor="#2d7dd2" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="flex flex-col items-center justify-center gap-5">
              <a href="#" className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg p-1" aria-label="Gestrategic - Voltar ao topo">
                <img src={logoGestrategic} alt="Gestrategic" className="h-12 w-auto rounded-lg" width={48} height={48} loading="lazy" />
              </a>
              <p className="text-sm text-center text-white/50">
                © {new Date().getFullYear()} GESTRATEGIC — Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
