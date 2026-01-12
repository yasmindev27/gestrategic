import { ShieldCheck, Clock, Network, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logoGestrategic from "@/assets/logo-gestrategic.jpg";

const LandingPage = () => {
  const navigate = useNavigate();
  
  const handleLogin = () => {
    navigate("/auth");
  };
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[hsl(210,50%,20%)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#" className="text-sm hover:text-primary transition-colors">Home</a>
              <a href="#" className="text-sm hover:text-primary transition-colors">Soluções</a>
              <a href="#" className="text-sm hover:text-primary transition-colors">Segurança & LGPD</a>
              <a href="#" className="text-sm hover:text-primary transition-colors">Sobre Nós</a>
              <a href="#" className="text-sm hover:text-primary transition-colors">Contato</a>
            </nav>

            {/* CTA Button */}
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white" onClick={handleLogin}>
              [ Área do Cliente / Login ]
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[hsl(210,50%,25%)] to-[hsl(210,40%,35%)] overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="space-y-6 z-10">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white italic leading-tight">
                Tecnologia que<br />
                <span className="font-normal">pulsa pela vida.</span>
              </h1>
              <p className="text-white/70 text-lg max-w-md">
                Automação inteligente e infraestrutura de TI de alta performance para hospitais, clínicas e centros diagnóstico.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6">
                  [ Conheça nossas Soluções ]
                </Button>
                <Button variant="outline" className="border-white/50 text-white hover:bg-white/10 rounded-full px-6">
                  [ Agendar Consultoria ]
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
                <div className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute bottom-12 left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="absolute bottom-8 right-16 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
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
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full border-2 border-primary flex items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Segurança Máxima:</h3>
              <p className="text-muted-foreground">
                Proteção de dados sensíveis e conformidade com LGPD.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full border-2 border-primary flex items-center justify-center">
                <Clock className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Monitoramento 24/7</h3>
              <p className="text-muted-foreground">
                NOC especializado em ambientes críticos de saúde.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full border-2 border-primary flex items-center justify-center">
                <Network className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Integração Total:</h3>
              <p className="text-muted-foreground">
                Conectamos seu HIS/PACS com eficiência e rapidez.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[hsl(210,50%,15%)] text-white/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">© 2026 GESTRATEGIC  Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>;
};
export default LandingPage;