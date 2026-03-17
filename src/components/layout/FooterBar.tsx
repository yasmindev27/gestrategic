import { memo } from "react";
import { ShieldCheck } from "lucide-react";

const FooterBar = memo(() => {
  const year = new Date().getFullYear();

  return (
    <footer className="h-9 bg-card border-t border-border/60 flex items-center justify-center px-6 shrink-0">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>&copy; {year} Gestrategic</span>
        <span className="text-border">|</span>
        <span>Software Registrado</span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-success" />
          Log de auditoria ativo
        </span>
      </div>
    </footer>
  );
});

FooterBar.displayName = "FooterBar";
export default FooterBar;
