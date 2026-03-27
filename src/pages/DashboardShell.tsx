import { Outlet, useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/layout/DashboardLayout";

export default function DashboardShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: isLoadingRole } = useUserRole();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useSessionTimeout(15);

  useEffect(() => {
    let isMounted = true;
    const handleAuthChange = (session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
      setIsLoading(false);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => handleAuthChange(session));
    supabase.auth.getSession().then(({ data: { session } }) => handleAuthChange(session));
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (isLoading || isLoadingRole) return <PageLoader />;
  if (!user) return null;

  // Extrai a seção da URL: /dashboard/:section?
  const sectionFromUrl = location.pathname.startsWith("/dashboard/")
    ? location.pathname.replace("/dashboard/", "").split("/")[0]
    : location.pathname === "/dashboard" ? "" : null;

  return (
    <DashboardLayout
      activeSection={sectionFromUrl || "dashboard"}
      onSectionChange={(section) => navigate(`/dashboard/${section}`)}
    >
      <Outlet />
    </DashboardLayout>
  );
}
