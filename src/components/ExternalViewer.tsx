import { useState } from "react";
import { X, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExternalViewerProps {
  url: string;
  title?: string;
  onClose: () => void;
}

const ExternalViewer = ({ url, title, onClose }: ExternalViewerProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-1rem)] w-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">
            {title || url}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Abrir em nova aba
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 relative min-h-0">
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Carregando...</span>
            </div>
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
              <AlertTriangle className="h-12 w-12 text-amber-500" />
              <h3 className="text-lg font-semibold">Site não pode ser exibido aqui</h3>
              <p className="text-sm text-muted-foreground">
                O site de destino bloqueia a exibição dentro de outros sistemas por questões de segurança.
                Utilize o botão abaixo para acessá-lo diretamente.
              </p>
              <Button onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir em nova aba
              </Button>
            </div>
          </div>
        ) : (
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={title || "Site externo"}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ExternalViewer;
