import { ShieldCheck, Clock, Network, HeartPulse, Building2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logoGestrategic from "@/assets/logo-gestrategic.jpg";
import { useState } from "react";
const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleLogin = () => {
    navigate("/auth");
  };
  const navLinks = [{
    label: "Início",
    href: "#"
  }, {
    label: "Soluções",
    href: "#solucoes"
  }, {
    label: "Segurança & LGPD",
    href: "#seguranca"
  }, {
    label: "Sobre Nós",
    href: "#sobre"
  }, {
    label: "Contato",
    href: "#contato"
  }];
  return <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1a3a5c] to-[#1e4a6e] text-white sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img src={logoGestrategic} alt="Gestrategic" className="h-10 w-auto rounded-md" />
              <span className="font-semibold tracking-tight text-xs">Gestrategic
Tecnologia em Saúde </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map(link => <a key={link.label} href={link.href} className="text-sm text-white/80 hover:text-white transition-colors font-medium">
                  {link.label}
                </a>)}
            </nav>

            {/* CTA Button */}
            <div className="flex items-center gap-4">
              <Button className="hidden sm:flex bg-[#2d7dd2] hover:bg-[#2570c2] text-white rounded-full px-6 shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30" onClick={handleLogin}>
                Área do Cliente
              </Button>
              
              {/* Mobile menu button */}
              <button className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && <nav className="md:hidden py-4 border-t border-white/10">
              <div className="flex flex-col gap-2">
                {navLinks.map(link => <a key={link.label} href={link.href} className="text-sm text-white/80 hover:text-white py-2 px-2 rounded-lg hover:bg-white/5 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    {link.label}
                  </a>)}
                <Button className="mt-2 bg-[#2d7dd2] hover:bg-[#2570c2] text-white w-full rounded-full shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30" onClick={handleLogin}>
                  Área do Cliente
                </Button>
              </div>
            </nav>}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#1a3a5c] via-[#1e4a6e] to-[#2a5a7e] overflow-hidden min-h-[600px]">
        {/* Background Pattern - Subtle grid */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(59,130,246,0.15)_0%,_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.1)_0%,_transparent_50%)]" />
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
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
              <h1 className="text-4xl md:text-5xl lg:text-6xl text-white leading-tight">
                <span className="font-light italic">Inovação que</span><br />
                <span className="font-semibold italic text-[#5ba3d9]">pulsa pela vida.</span>
              </h1>
              <p className="text-white/70 text-lg max-w-md leading-relaxed">
                Automação inteligente e infraestrutura de TI de alta performance para hospitais, clínicas e centros diagnóstico.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Button className="bg-[#2d7dd2] hover:bg-[#2570c2] text-white rounded-full px-8 py-6 text-base font-medium shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30">
                  Conheça nossas Soluções
                </Button>
                <Button className="bg-[#2d7dd2] hover:bg-[#2570c2] text-white rounded-full px-8 py-6 text-base font-medium shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30">
                  Agendar Consultoria
                </Button>
              </div>
            </div>

            {/* Isometric Hospital Illustration */}
            <div className="hidden lg:flex justify-center items-center relative">
              <div className="relative w-[400px] h-[400px]">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.2)_0%,_transparent_70%)]" />
                
                {/* Main Hospital Building - Isometric Style */}
                <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl">
                  {/* Base shadow */}
                  <ellipse cx="200" cy="350" rx="120" ry="30" fill="rgba(0,0,0,0.15)" />
                  
                  {/* Main building - Back */}
                  <path d="M160 280 L160 140 L240 100 L320 140 L320 280 L240 320 L160 280Z" fill="url(#buildingGradient1)" stroke="#5ba3d9" strokeWidth="1.5" />
                  
                  {/* Main building - Front left */}
                  <path d="M80 240 L80 100 L160 60 L160 200 L80 240Z" fill="url(#buildingGradient2)" stroke="#5ba3d9" strokeWidth="1.5" />
                  
                  {/* Main building - Front right */}
                  <path d="M160 200 L160 60 L240 100 L240 240 L160 200Z" fill="url(#buildingGradient3)" stroke="#5ba3d9" strokeWidth="1.5" />
                  
                  {/* Tower */}
                  <path d="M180 140 L180 40 L220 60 L220 160 L180 140Z" fill="url(#towerGradient)" stroke="#5ba3d9" strokeWidth="1.5" />
                  
                  {/* Cross on tower */}
                  <rect x="193" y="70" width="14" height="40" fill="#5ba3d9" rx="2" />
                  <rect x="187" y="83" width="26" height="14" fill="#5ba3d9" rx="2" />
                  
                  {/* Windows - Front building */}
                  <rect x="100" y="120" width="20" height="25" fill="rgba(91,163,217,0.4)" rx="2" />
                  <rect x="130" y="120" width="20" height="25" fill="rgba(91,163,217,0.4)" rx="2" />
                  <rect x="100" y="160" width="20" height="25" fill="rgba(91,163,217,0.6)" rx="2" />
                  <rect x="130" y="160" width="20" height="25" fill="rgba(91,163,217,0.6)" rx="2" />
                  <rect x="100" y="200" width="20" height="25" fill="rgba(91,163,217,0.8)" rx="2" />
                  <rect x="130" y="200" width="20" height="25" fill="rgba(91,163,217,0.8)" rx="2" />
                  
                  {/* Windows - Right side */}
                  <rect x="180" y="130" width="18" height="22" fill="rgba(91,163,217,0.5)" rx="2" transform="skewY(15)" />
                  <rect x="210" y="145" width="18" height="22" fill="rgba(91,163,217,0.5)" rx="2" transform="skewY(15)" />
                  <rect x="180" y="170" width="18" height="22" fill="rgba(91,163,217,0.6)" rx="2" transform="skewY(15)" />
                  <rect x="210" y="185" width="18" height="22" fill="rgba(91,163,217,0.6)" rx="2" transform="skewY(15)" />
                  
                  {/* Back building windows */}
                  <rect x="260" y="180" width="16" height="20" fill="rgba(91,163,217,0.4)" rx="2" />
                  <rect x="285" y="180" width="16" height="20" fill="rgba(91,163,217,0.4)" rx="2" />
                  <rect x="260" y="220" width="16" height="20" fill="rgba(91,163,217,0.5)" rx="2" />
                  <rect x="285" y="220" width="16" height="20" fill="rgba(91,163,217,0.5)" rx="2" />
                  <rect x="260" y="260" width="16" height="20" fill="rgba(91,163,217,0.6)" rx="2" />
                  <rect x="285" y="260" width="16" height="20" fill="rgba(91,163,217,0.6)" rx="2" />
                  
                  {/* Entrance */}
                  <rect x="105" y="230" width="35" height="45" fill="rgba(91,163,217,0.3)" rx="3" />
                  <path d="M105 275 L140 275 L140 260 Q122.5 255 105 260 Z" fill="rgba(91,163,217,0.5)" />
                  
                  {/* Gradients */}
                  <defs>
                    <linearGradient id="buildingGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2a5a7e" />
                      <stop offset="100%" stopColor="#1a3a5c" />
                    </linearGradient>
                    <linearGradient id="buildingGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3a6a8e" />
                      <stop offset="100%" stopColor="#2a5a7e" />
                    </linearGradient>
                    <linearGradient id="buildingGradient3" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#2a5a7e" />
                      <stop offset="100%" stopColor="#1e4a6e" />
                    </linearGradient>
                    <linearGradient id="towerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4a7a9e" />
                      <stop offset="100%" stopColor="#2a5a7e" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Floating elements */}
                <div className="absolute top-4 right-4 w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center animate-pulse shadow-lg">
                  <ShieldCheck className="w-7 h-7 text-[#5ba3d9]" />
                </div>
                <div className="absolute bottom-16 left-4 w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center animate-pulse shadow-lg" style={{
                animationDelay: '0.5s'
              }}>
                  <Clock className="w-6 h-6 text-[#5ba3d9]" />
                </div>
                <div className="absolute top-1/3 right-0 w-10 h-10 rounded-full bg-[#5ba3d9]/20 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[#5ba3d9] animate-ping" />
                </div>
                <div className="absolute bottom-1/3 left-8 w-8 h-8 rounded-full bg-[#5ba3d9]/10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#5ba3d9] animate-ping" style={{
                  animationDelay: '1s'
                }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L1440 60L1440 30C1440 30 1200 0 720 0C240 0 0 30 0 30L0 60Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="solucoes" className="py-20 md:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
              Por que escolher a <span className="text-[#2d7dd2]">GESTRATEGIC</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Soluções completas para a gestão e tecnologia da sua unidade de saúde
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group text-center space-y-5 p-8 rounded-2xl bg-card border border-border hover:border-[#2d7dd2]/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2d7dd2]/10 to-[#5ba3d9]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <ShieldCheck className="w-10 h-10 text-[#2d7dd2]" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Segurança & Conformidade</h3>
              <p className="text-muted-foreground leading-relaxed">
                Proteção de dados sensíveis e conformidade total com LGPD para sua tranquilidade.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group text-center space-y-5 p-8 rounded-2xl bg-card border border-border hover:border-[#2d7dd2]/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2d7dd2]/10 to-[#5ba3d9]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-10 h-10 text-[#2d7dd2]" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Monitoramento Inteligente 24/7</h3>
              <p className="text-muted-foreground leading-relaxed">
                NOC especializado em ambientes críticos de saúde com resposta imediata.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group text-center space-y-5 p-8 rounded-2xl bg-card border border-border hover:border-[#2d7dd2]/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2d7dd2]/10 to-[#5ba3d9]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Network className="w-10 h-10 text-[#2d7dd2]" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Integração & Fluxo de Dados</h3>
              <p className="text-muted-foreground leading-relaxed">Conectamos HIS e PACS com automação setorial, eliminando falhas manuais e acelerando a operação com dados centralizados e confiáveis.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-[#1a3a5c] to-[#1e4a6e] text-white/60 py-10 relative overflow-hidden">
        {/* Decorative element */}
        <div className="absolute bottom-0 right-0 opacity-10">
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
            <div className="flex items-center gap-3">
              <img src={logoGestrategic} alt="Gestrategic" className="h-12 w-auto rounded-lg" />
            </div>
            <p className="text-sm text-center text-white/50">
              © 2026 GESTRATEGIC — Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>;
};
export default LandingPage;