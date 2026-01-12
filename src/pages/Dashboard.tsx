import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import GreetingHeader from "@/components/GreetingHeader";
import StatsCards from "@/components/StatsCards";
import TasksSection from "@/components/TasksSection";
import DocumentsSection from "@/components/DocumentsSection";
import FormsSection from "@/components/FormsSection";
import TeamSection from "@/components/TeamSection";
import SalusPanels from "@/components/SalusPanels";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");

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
          
          {activeSection === "dashboard" && (
            <>
              <StatsCards />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <TasksSection />
                  <SalusPanels />
                </div>
                <div className="space-y-6">
                  <DocumentsSection />
                  <FormsSection />
                </div>
              </div>
            </>
          )}

          {activeSection === "equipe" && <TeamSection />}

          {activeSection === "tarefas" && <TasksSection />}

          {activeSection === "documentos" && <DocumentsSection />}

          {activeSection === "formularios" && <FormsSection />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
