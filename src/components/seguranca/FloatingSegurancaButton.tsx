import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function FloatingSegurancaButton() {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<"urgente" | "apoio">("apoio");
  const [observacao, setObservacao] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleEnviar = async () => {
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, setor")
        .eq("user_id", user.id)
        .single();

      const { error } = await supabase.from("alertas_seguranca").insert({
        tipo,
        setor: profile?.setor || "Não informado",
        usuario_id: user.id,
        usuario_nome: profile?.full_name || user.email || "Desconhecido",
        observacao: observacao.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "🚨 Alerta enviado!",
        description: tipo === "urgente"
          ? "A equipe de segurança foi acionada com URGÊNCIA."
          : "A equipe de segurança foi acionada para apoio.",
      });
      setOpen(false);
      setObservacao("");
      setTipo("apoio");
    } catch (err: any) {
      toast({
        title: "Erro ao enviar alerta",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-24 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform bg-destructive hover:bg-destructive/90 text-destructive-foreground animate-pulse hover:animate-none"
        size="icon"
        title="Chamar Segurança"
      >
        <ShieldAlert className="h-6 w-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Chamado de Segurança
            </DialogTitle>
            <DialogDescription>
              Seu setor, nome e horário serão capturados automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Tipo de chamado</Label>
              <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as "urgente" | "apoio")} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="urgente" id="float-urgente" />
                  <Label htmlFor="float-urgente" className="text-destructive font-bold cursor-pointer">
                    🔴 Urgente
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="apoio" id="float-apoio" />
                  <Label htmlFor="float-apoio" className="text-warning font-bold cursor-pointer">
                    🟡 Apoio
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="float-obs" className="text-sm font-medium">Observação rápida (opcional)</Label>
              <Textarea
                id="float-obs"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Descreva brevemente a situação..."
                maxLength={500}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleEnviar}
              disabled={sending}
              className="gap-2"
            >
              <ShieldAlert className="h-4 w-4" />
              {sending ? "Enviando..." : "Confirmar Alerta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
