import { ReactNode, Suspense, memo } from "react";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import GreetingHeader from "@/components/GreetingHeader";
import { FloatingChatButton } from "@/components/chat/FloatingChatButton";
import { FloatingSegurancaButton } from "@/components/seguranca/FloatingSegurancaButton";
import { GlobalSecurityAlarm } from "@/components/seguranca/GlobalSecurityAlarm";
import { PendenciasAlertSystem } from "@/components/seguranca/PendenciasAlertSystem";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onOpenExternal?: (url: string, title: string) => void;
  children: ReactNode;
  showFloatingChat?: boolean;
  fullContent?: boolean;
}

// Optimized loading fallback
const ModuleLoader = memo(() => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
));
ModuleLoader.displayName = "ModuleLoader";

// Full page loader
export const PageLoader = memo(() => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
));
PageLoader.displayName = "PageLoader";

const DashboardLayout = memo(({
  activeSection,
  onSectionChange,
  onOpenExternal,
  children,
  showFloatingChat = true,
  fullContent = false,
}: DashboardLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-background">
      <GlobalSecurityAlarm />
      <PendenciasAlertSystem />
      <Sidebar activeSection={activeSection} onSectionChange={onSectionChange} onOpenExternal={onOpenExternal} />
      
      {fullContent ? (
        <main className="flex-1 overflow-hidden">
          <Suspense fallback={<ModuleLoader />}>
            {children}
          </Suspense>
        </main>
      ) : (
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <GreetingHeader />
            
            <Suspense fallback={<ModuleLoader />}>
              {children}
            </Suspense>
          </div>

          {showFloatingChat && activeSection !== "chat" && (
            <>
              <FloatingSegurancaButton />
              <FloatingChatButton currentModule={activeSection} />
            </>
          )}
        </main>
      )}
    </div>
  );
});

DashboardLayout.displayName = "DashboardLayout";

// Section wrapper with consistent styling
interface SectionWrapperProps {
  children: ReactNode;
  className?: string;
}

export const SectionWrapper = memo(({ children, className }: SectionWrapperProps) => (
  <div className={cn("space-y-6", className)}>
    {children}
  </div>
));
SectionWrapper.displayName = "SectionWrapper";

// Card grid for dashboard widgets
interface CardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const CardGrid = memo(({ children, columns = 4, className }: CardGridProps) => {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
});
CardGrid.displayName = "CardGrid";

export default DashboardLayout;
