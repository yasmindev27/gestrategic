import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import GreetingHeader from "@/components/GreetingHeader";
import StatsCards from "@/components/StatsCards";
import TasksSection from "@/components/TasksSection";
import DocumentsSection from "@/components/DocumentsSection";
import FormsSection from "@/components/FormsSection";
import TeamSection from "@/components/TeamSection";
import SalusPanels from "@/components/SalusPanels";
import LGPDConsent from "@/components/LGPDConsent";
import AccessDenied from "@/components/AccessDenied";
import { useLGPDConsent } from "@/hooks/useLGPDConsent";

const Index = () => {
  const { consentStatus, isLoading, acceptConsent, rejectConsent, resetConsent } = useLGPDConsent();
  const [activeSection, setActiveSection] = useState("dashboard");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (consentStatus === "rejected") {
    return <AccessDenied onTryAgain={resetConsent} />;
  }

  if (consentStatus === "pending") {
    return <LGPDConsent onAccept={acceptConsent} onReject={rejectConsent} />;
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

export default Index;
