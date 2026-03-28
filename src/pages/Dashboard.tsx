import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import ExternalViewer from "@/components/ExternalViewer";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import CookieBanner from "@/components/CookieBanner";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useModules } from "@/hooks/useModules";

// Lazy load ALL modules for optimal code splitting
const DashboardPersonalizado = lazy(() => import("@/components/dashboard/DashboardPersonalizado"));

// Module loading fallback
const ModuleLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);


export default function Dashboard() {
  return <DashboardPersonalizado onNavigate={() => {}} />;
}
