import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import GreetingHeader from "@/components/GreetingHeader";
import DashboardPersonalizado from "@/components/dashboard/DashboardPersonalizado";
import TeamSection from "@/components/TeamSection";
import { FaturamentoUnificadoModule } from "@/components/modules/FaturamentoUnificadoModule";
import { ControleFichasModule } from "@/components/modules/ControleFichasModule";
import { AdminModule } from "@/components/modules/AdminModule";
import { TecnicoModule } from "@/components/modules/TecnicoModule";
import { AbrirChamadoModule } from "@/components/modules/AbrirChamadoModule";
import { LaboratorioModule } from "@/components/modules/LaboratorioModule";
import { AgendaModule } from "@/components/agenda";
import { LogsAuditoriaModule } from "@/components/modules/LogsAuditoriaModule";
import { RestauranteModule } from "@/components/modules/RestauranteModule";
import { MapaLeitosModule } from "@/components/modules/MapaLeitosModule";
import { NirModule } from "@/components/modules/NirModule";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("");
  const { isAdmin, isGestor, isTI, isManutencao, isEngenhariaCinica, isLaboratorio, isNir, isLoading: isLoadingRole } = useUserRole();

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

  // Define a seção inicial com base no perfil do usuário
  useEffect(() => {
    if (!isLoadingRole && activeSection === "") {
      if (isNir) {
        setActiveSection("nir");
      } else {
        setActiveSection("dashboard");
      }
    }
  }, [isLoadingRole, isNir, activeSection]);

  if (isLoading || isLoadingRole || activeSection === "") {
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

          {activeSection === "faturamento" && <FaturamentoUnificadoModule />}

          {activeSection === "controle-fichas" && <ControleFichasModule />}

          {activeSection === "equipe" && <TeamSection />}

          {activeSection === "agenda" && <AgendaModule />}

          {activeSection === "admin" && <AdminModule />}

          {activeSection === "logs" && <LogsAuditoriaModule />}

          {/* Módulos dos Técnicos */}
          {activeSection === "tecnico-ti" && <TecnicoModule setor="ti" />}
          
          {activeSection === "tecnico-manutencao" && <TecnicoModule setor="manutencao" />}
          
          {activeSection === "tecnico-engenharia" && <TecnicoModule setor="engenharia_clinica" />}

          {/* Módulo NIR */}
          {activeSection === "nir" && <NirModule />}

          {activeSection === "mapa-leitos" && <MapaLeitosModule />}

          {activeSection === "laboratorio" && <LaboratorioModule />}

          {activeSection === "restaurante" && <RestauranteModule />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
