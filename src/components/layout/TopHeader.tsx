import { memo, useState, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  funcionario: "Funcionário",
  recepcao: "Recepção",
  classificacao: "Classificação",
  nir: "NIR",
  faturamento: "Faturamento",
  ti: "TI",
  manutencao: "Manutenção",
  engenharia_clinica: "Eng. Clínica",
  laboratorio: "Laboratório",
  restaurante: "Restaurante",
  rh_dp: "RH/DP",
  assistencia_social: "Assist. Social",
  qualidade: "Qualidade",
  nsp: "NSP",
  seguranca: "Segurança",
  enfermagem: "Enfermagem",
  medicos: "Médicos",
  rouparia: "Rouparia",
};

const TopHeader = memo(() => {
  const [userName, setUserName] = useState("Carregando...");
  const { role } = useUserRole();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário";
        setUserName(name.split(" ")[0]);
      }
    };
    fetchUser();
  }, []);

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-14 bg-card border-b border-border/60 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <HelpCircle className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground leading-none">{userName}</p>
            <p className="text-[11px] text-muted-foreground">{role ? roleLabels[role] || role : ""}</p>
          </div>
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
});

TopHeader.displayName = "TopHeader";
export default TopHeader;
