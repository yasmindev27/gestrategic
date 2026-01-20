import { ShieldCheck, Clock, Network, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logoGestrategic from "@/assets/logo-gestrategic.jpg";

const LandingPage = () => {
  const navigate = useNavigate();
  
  const handleLogin = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-header text-header-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src={logoGestrategic} 
                alt="GESTRATEGIC" 
                className="h-10 w-auto object-contain rounded"
              />
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#" className="text-sm text-header-foreground/80 hover:text-header-foreground transition-colors">
                Home
              </a>
              <a href="#" className="text-sm text-header-foreground/80 hover:text-header-foreground transition-colors">
                Soluções
              </a>
              <a href="#" className="text-sm text-header-foreground/80 hover:text-header-foreground transition-colors">
                Segurança & LGPD
              </a>
              <a href="#" className="text-sm text-header-foreground/80 hover:text-header-foreground transition-colors">
                Sobre Nós
              </a>
              <a href="#" className="text-sm text-header-foreground/80 hover:text-header-foreground transition-colors">
                Contato
              </a>
            </nav>

            {/* CTA Button */}
            <Button 
              variant="outline" 
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors" 
              onClick={handleLogin}
            >
              Área do Cliente
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-header to-header/80 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:24px_24px]" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="space-y-6 z-10">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-header-foreground leading-tight">
                Tecnologia que<br />
                <span className="font-semibold text-primary">pulsa pela vida.</span>
              </h1>
              <p className="text-header-foreground/70 text-lg max-w-md">
                Automação inteligente e infraestrutura de TI de alta performance para hospitais, clínicas e centros diagnóstico.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 transition-colors">
                  Conheça nossas Soluções
                </Button>
                <Button 
                  variant="outline" 
                  className="border-white/50 text-white bg-transparent hover:bg-white/10 hover:border-white rounded-full px-6 transition-colors"
                >
                  Agendar Consultoria
                </Button>
              </div>
            </div>

            {/* Visual Element - Abstract medical illustration */}
            <div className="hidden md:flex justify-center">
              <div className="relative w-80 h-80">
                {/* Decorative circles */}
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse" />
                <div className="absolute inset-4 rounded-full border border-primary/20" />
                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/20 to-transparent" />
                
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-sm">
                    <HeartPulse className="w-12 h-12 text-primary" />
                  </div>
                </div>
                
                {/* Floating elements */}
                <div className="absolute top-8 right-8 w-12 h-12 rounded-full bg-header-foreground/10 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute bottom-12 left-4 w-10 h-10 rounded-full bg-header-foreground/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="absolute bottom-8 right-16 w-10 h-10 rounded-full bg-header-foreground/10 flex items-center justify-center">
                  <Network className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Por que escolher a <span className="text-primary">GESTRATEGIC</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Soluções completas para a gestão e tecnologia da sua unidade de saúde
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center space-y-4 p-6 rounded-xl bg-card border border-border hover:shadow-md hover:border-primary/20 transition-all">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Segurança Máxima</h3>
              <p className="text-muted-foreground text-sm">
                Proteção de dados sensíveis e conformidade total com LGPD para sua tranquilidade.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center space-y-4 p-6 rounded-xl bg-card border border-border hover:shadow-md hover:border-primary/20 transition-all">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Monitoramento 24/7</h3>
              <p className="text-muted-foreground text-sm">
                NOC especializado em ambientes críticos de saúde com resposta imediata.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center space-y-4 p-6 rounded-xl bg-card border border-border hover:shadow-md hover:border-primary/20 transition-all">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Network className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Integração Total</h3>
              <p className="text-muted-foreground text-sm">
                Conectamos seu HIS/PACS com eficiência e rapidez para operação fluida.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-header text-header-foreground/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <img 
                src={logoGestrategic} 
                alt="GESTRATEGIC" 
                className="h-8 w-auto object-contain rounded opacity-80"
              />
            </div>
            <p className="text-sm text-center">© 2026 GESTRATEGIC — Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;