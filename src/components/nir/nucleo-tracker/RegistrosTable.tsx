import { RegistroProducao } from "./types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { excluirRegistroDB } from "./storage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Props {
  registros: RegistroProducao[];
  onUpdate: () => void;
}

const atividadeBadgeColor: Record<string, string> = {
  "Conferência de Documentos": "bg-primary/15 text-primary border-primary/20",
  "Cadastro SUSFácil": "bg-green-500/15 text-green-700 border-green-500/20",
  "Gestão de Vagas": "bg-amber-500/15 text-amber-700 border-amber-500/20",
  "Solicitação de Transferência": "bg-blue-500/15 text-blue-700 border-blue-500/20",
  "Contato com Estabelecimentos": "bg-destructive/15 text-destructive border-destructive/20",
};

export function RegistrosTable({ registros, onUpdate }: Props) {
  const handleDelete = async (id: string) => {
    try {
      await excluirRegistroDB(id);
      toast.success("Registro excluído.");
      onUpdate();
    } catch {
      toast.error("Erro ao excluir registro.");
    }
  };

  if (registros.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
        Nenhum registro encontrado. Comece registrando a produção acima.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Data</TableHead>
            <TableHead className="font-semibold">Colaborador</TableHead>
            <TableHead className="font-semibold">Atividade</TableHead>
            <TableHead className="font-semibold text-center">Qtd</TableHead>
            <TableHead className="font-semibold">Observação</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registros.map((r) => (
            <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium">
                {new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR")}
              </TableCell>
              <TableCell>{r.colaborador}</TableCell>
              <TableCell>
                <Badge variant="outline" className={atividadeBadgeColor[r.atividade] || ""}>
                  {r.atividade}
                </Badge>
              </TableCell>
              <TableCell className="text-center font-semibold">{r.quantidade}</TableCell>
              <TableCell className="text-muted-foreground max-w-[200px] truncate">
                {r.observacao || "—"}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(r.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
