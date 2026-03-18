import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { salvarColaboradorDB, toggleColaboradorAtivoDB, getColaboradoresDB } from "./storage";
import { Colaborador } from "./types";
import { toast } from "sonner";
import { UserPlus, Users } from "lucide-react";

interface Props {
  onUpdate: () => void;
}

export function ColaboradorManager({ onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  const refresh = async () => {
    const data = await getColaboradoresDB();
    setColaboradores(data);
    onUpdate();
  };

  const handleAdd = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do colaborador.");
      return;
    }
    const exists = colaboradores.some(
      (c) => c.nome.toLowerCase() === nome.trim().toLowerCase()
    );
    if (exists) {
      toast.error("Colaborador já cadastrado.");
      return;
    }
    try {
      await salvarColaboradorDB(nome.trim());
      setNome("");
      toast.success("Colaborador cadastrado!");
      await refresh();
    } catch {
      toast.error("Erro ao cadastrar colaborador.");
    }
  };

  const handleToggle = async (id: string, ativo: boolean) => {
    try {
      await toggleColaboradorAtivoDB(id, ativo);
      await refresh();
    } catch {
      toast.error("Erro ao atualizar colaborador.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) refresh(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          Gerenciar Colaboradores
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Colaboradores
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Novo colaborador</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <Button onClick={handleAdd} className="self-end gap-1" size="sm">
              <UserPlus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {colaboradores.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum colaborador cadastrado.
              </p>
            )}
            {colaboradores.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.nome}</span>
                  <Badge
                    variant={c.ativo ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {c.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <Switch
                  checked={c.ativo}
                  onCheckedChange={() => handleToggle(c.id, c.ativo)}
                />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
