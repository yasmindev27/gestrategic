import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Loader2, ListPlus, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const tipoDietaOptions = [
  { value: "geral", label: "Geral" },
  { value: "branda", label: "Branda" },
  { value: "pastosa", label: "Pastosa" },
  { value: "liquida", label: "Líquida" },
  { value: "hipossodica", label: "Hipossódica" },
  { value: "hipocalorica", label: "Hipocalórica" },
  { value: "has", label: "HAS" },
  { value: "dm", label: "DM" },
  { value: "enteral", label: "Enteral" },
  { value: "suspensa", label: "Suspensa" },
];

const refeicaoOptions = [
  { value: "cafe", label: "Café" },
  { value: "almoco", label: "Almoço" },
  { value: "lanche", label: "Café da Tarde" },
  { value: "jantar", label: "Jantar" },
];

interface Linhadieta {
  id: string;
  paciente_nome: string;
  quarto_leito: string;
  tipo_dieta: string;
  tem_acompanhante: boolean;
  is_extra: boolean;
  restricoes_alimentares: string;
  horarios_refeicoes: string[];
  observacoes: string;
}

const criarLinhaVazia = (): Linhadieta => ({
  id: crypto.randomUUID(),
  paciente_nome: "",
  quarto_leito: "",
  tipo_dieta: "geral",
  tem_acompanhante: false,
  is_extra: false,
  restricoes_alimentares: "",
  horarios_refeicoes: [] as string[],
  observacoes: "",
});

interface Props {
  userName: string;
  userId: string;
  onSuccess: () => void;
}

export const RegistroDietasLote = ({ userName, userId, onSuccess }: Props) => {
  const { toast } = useToast();
  const [linhas, setLinhas] = useState<Linhadieta[]>([criarLinhaVazia(), criarLinhaVazia(), criarLinhaVazia()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataSolicitacao, setDataSolicitacao] = useState(format(new Date(), "yyyy-MM-dd"));

  const adicionarLinhas = (qtd: number) => {
    const novas = Array.from({ length: qtd }, () => criarLinhaVazia());
    setLinhas(prev => [...prev, ...novas]);
  };

  const removerLinha = (id: string) => {
    setLinhas(prev => prev.filter(l => l.id !== id));
  };

  const atualizarLinha = (id: string, campo: keyof Linhadieta, valor: any) => {
    setLinhas(prev => prev.map(l => l.id === id ? { ...l, [campo]: valor } : l));
  };

  const toggleRefeicao = (id: string, refeicao: string) => {
    setLinhas(prev => prev.map(l => {
      if (l.id !== id) return l;
      const atual = l.horarios_refeicoes;
      const novo = atual.includes(refeicao)
        ? atual.filter(r => r !== refeicao)
        : [...atual, refeicao];
      return { ...l, horarios_refeicoes: novo };
    }));
  };

  const linhasValidas = linhas.filter(l => {
    if (l.is_extra) return l.tipo_dieta;
    return l.paciente_nome.trim() && l.quarto_leito.trim() && l.tipo_dieta;
  });

  const handleSalvarTodas = async () => {
    if (linhasValidas.length === 0) {
      toast({ title: "Atenção", description: "Preencha ao menos uma linha válida. Extras precisam apenas do Tipo de Dieta.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const registros = linhasValidas.map(l => {
        const obsExtra = l.is_extra ? "[DIETA EXTRA]" : "";
        const obsUsuario = l.observacoes?.trim() || "";
        const obsFinal = [obsExtra, obsUsuario].filter(Boolean).join(" ") || null;

        return {
          solicitante_id: userId,
          solicitante_nome: userName,
          tipo_dieta: l.tipo_dieta,
          paciente_nome: l.paciente_nome.trim() || (l.is_extra ? "Extra" : l.paciente_nome),
          quarto_leito: l.quarto_leito.trim() || (l.is_extra ? "-" : l.quarto_leito),
          tem_acompanhante: l.tem_acompanhante,
          restricoes_alimentares: l.restricoes_alimentares || null,
          horarios_refeicoes: l.horarios_refeicoes,
          data_inicio: dataSolicitacao,
          observacoes: obsFinal,
          status: "aprovada",
        };
      });

      const { error } = await supabase.from("solicitacoes_dieta").insert(registros);
      if (error) throw error;

      const extras = linhasValidas.filter(l => l.is_extra).length;
      const normais = linhasValidas.length - extras;
      const parts = [];
      if (normais > 0) parts.push(`${normais} dieta(s)`);
      if (extras > 0) parts.push(`${extras} extra(s)`);
      toast({ title: "Sucesso", description: `${parts.join(" e ")} registrada(s) com sucesso!` });
      setLinhas([criarLinhaVazia(), criarLinhaVazia(), criarLinhaVazia()]);
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar dietas em lote:", error);
      toast({ title: "Erro", description: "Erro ao salvar dietas. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="border-b bg-muted/30 py-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ListPlus className="h-4 w-4 text-muted-foreground" />
                Registro de Dietas em Lote
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs">Registre as dietas de todos os pacientes do dia em uma única tabela</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Data:</span>
              <Input
                type="date"
                value={dataSolicitacao}
                onChange={e => setDataSolicitacao(e.target.value)}
                className="w-[150px] h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/50 pt-2">
            <span>Solicitante:</span>
            <Badge variant="secondary" className="text-xs font-normal">{userName || "Carregando..."}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-background hover:bg-background">
                <TableHead className="w-[36px] text-center text-xs font-semibold text-foreground py-2.5 uppercase"></TableHead>
                <TableHead className="min-w-[170px] text-xs font-semibold text-foreground py-2.5 uppercase">Paciente</TableHead>
                <TableHead className="min-w-[100px] text-xs font-semibold text-foreground py-2.5 uppercase">Quarto/Leito</TableHead>
                <TableHead className="min-w-[130px] text-xs font-semibold text-foreground py-2.5 uppercase">Tipo de Dieta</TableHead>
                <TableHead className="text-center min-w-[90px] text-xs font-semibold text-foreground py-2.5 uppercase">Acompanhante</TableHead>
                <TableHead className="text-center min-w-[60px] text-xs font-semibold text-foreground py-2.5 uppercase">Extra</TableHead>
                <TableHead className="min-w-[190px] text-xs font-semibold text-foreground py-2.5 uppercase">Refeições</TableHead>
                <TableHead className="min-w-[130px] text-xs font-semibold text-foreground py-2.5 uppercase">Restrições</TableHead>
                <TableHead className="min-w-[130px] text-xs font-semibold text-foreground py-2.5 uppercase">Observações</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((linha, idx) => {
                const isValid = linha.is_extra ? !!linha.tipo_dieta : (linha.paciente_nome.trim() && linha.quarto_leito.trim() && linha.tipo_dieta);
                return (
                  <TableRow
                    key={linha.id}
                    className={`border-b border-border/40 bg-background hover:bg-muted/10`}
                  >
                    <TableCell className="text-center text-xs font-mono text-muted-foreground py-1.5">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="py-1 px-1">
                      <Input
                        placeholder={linha.is_extra ? "Opcional" : "Nome do paciente"}
                        value={linha.paciente_nome}
                        onChange={e => atualizarLinha(linha.id, "paciente_nome", e.target.value)}
                        className="h-8 text-sm"
                        disabled={false}
                      />
                    </TableCell>
                    <TableCell className="py-1 px-1">
                      <Input
                        placeholder={linha.is_extra ? "Opcional" : "Ex: 101-A"}
                        value={linha.quarto_leito}
                        onChange={e => atualizarLinha(linha.id, "quarto_leito", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell className="py-1 px-1">
                      <Select value={linha.tipo_dieta} onValueChange={v => atualizarLinha(linha.id, "tipo_dieta", v)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tipoDietaOptions.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-1 px-1 text-center">
                      <Checkbox
                        checked={linha.tem_acompanhante}
                        onCheckedChange={v => atualizarLinha(linha.id, "tem_acompanhante", !!v)}
                      />
                    </TableCell>
                    <TableCell className="py-1 px-1 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <Checkbox
                          checked={linha.is_extra}
                          onCheckedChange={v => atualizarLinha(linha.id, "is_extra", !!v)}
                        />
                        {linha.is_extra && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-purple-100 text-purple-700 border-purple-200">
                            Extra
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1 px-1">
                      <div className="flex gap-1 flex-wrap">
                        {refeicaoOptions.map(r => (
                          <Badge
                            key={r.value}
                            variant={linha.horarios_refeicoes.includes(r.value) ? "default" : "outline"}
                            className="cursor-pointer text-xs select-none"
                            onClick={() => toggleRefeicao(linha.id, r.value)}
                          >
                            {r.label}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-1 px-1">
                      <Input
                        placeholder="Restrições"
                        value={linha.restricoes_alimentares}
                        onChange={e => atualizarLinha(linha.id, "restricoes_alimentares", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell className="py-1 px-1">
                      <Input
                        placeholder="Obs."
                        value={linha.observacoes}
                        onChange={e => atualizarLinha(linha.id, "observacoes", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell className="py-1 px-0.5">
                      {linhas.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removerLinha(linha.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => adicionarLinhas(1)}>
              <Plus className="h-3.5 w-3.5 mr-0.5" />
              +1 Linha
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => adicionarLinhas(5)}>
              <Plus className="h-3.5 w-3.5 mr-0.5" />
              +5 Linhas
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => adicionarLinhas(10)}>
              <Plus className="h-3.5 w-3.5 mr-0.5" />
              +10 Linhas
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {linhasValidas.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {linhasValidas.length} dieta(s) preenchida(s)
              </span>
            )}
            <Button onClick={handleSalvarTodas} disabled={isSubmitting || linhasValidas.length === 0}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Todas ({linhasValidas.length})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
