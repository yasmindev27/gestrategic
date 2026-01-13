import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import GreetingHeader from "@/components/GreetingHeader";
import DashboardPersonalizado from "@/components/dashboard/DashboardPersonalizado";
import TeamSection from "@/components/TeamSection";
import { FaturamentoModule } from "@/components/modules/FaturamentoModule";
import { SaidaProntuariosModule } from "@/components/modules/SaidaProntuariosModule";
import { ControleFichasModule } from "@/components/modules/ControleFichasModule";
import { AdminModule } from "@/components/modules/AdminModule";
import { TecnicoModule } from "@/components/modules/TecnicoModule";
import { AbrirChamadoModule } from "@/components/modules/AbrirChamadoModule";
import { LaboratorioModule } from "@/components/modules/LaboratorioModule";
import { AgendaModule } from "@/components/agenda";
import { LogsAuditoriaModule } from "@/components/modules/LogsAuditoriaModule";
import { RestauranteModule } from "@/components/modules/RestauranteModule";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");
  const { isAdmin, isGestor, canAccessSaidaProntuarios, canAccessControleFichas, canAccessAvaliacaoProntuarios, canAccessEquipe, isTI, isManutencao, isEngenhariaCinica, isLaboratorio } = useUserRole();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <GreetingHeader />
          
          {activeSection === "dashboard" && <DashboardPersonalizado />}

          {activeSection === "abrir-chamado" && <AbrirChamadoModule />}

          {activeSection === "faturamento" && canAccessSaidaProntuarios && <SaidaProntuariosModule />}

          {activeSection === "controle-fichas" && canAccessControleFichas && <ControleFichasModule />}

          {activeSection === "prontuarios" && canAccessAvaliacaoProntuarios && <FaturamentoModule />}

          {activeSection === "equipe" && canAccessEquipe && <TeamSection />}

          {activeSection === "agenda" && <AgendaModule />}

          {activeSection === "admin" && isAdmin && <AdminModule />}

          {activeSection === "logs" && isAdmin && <LogsAuditoriaModule />}

          {/* Módulos dos Técnicos */}
          {activeSection === "tecnico-ti" && (isTI || isAdmin) && <TecnicoModule setor="ti" />}
          
          {activeSection === "tecnico-manutencao" && (isManutencao || isAdmin) && <TecnicoModule setor="manutencao" />}
          
          {activeSection === "tecnico-engenharia" && (isEngenhariaCinica || isAdmin) && <TecnicoModule setor="engenharia_clinica" />}

          {activeSection === "laboratorio" && (isLaboratorio || isAdmin) && <LaboratorioModule />}

          {activeSection === "restaurante" && <RestauranteModule />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
