import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { Treinamento, Inscricao } from "./types";
import { exportToCSV } from "@/lib/export-utils";

const statusColors: Record<string, string> = {
  capacitado: "bg-green-100 text-green-800",
  pendente: "bg-gray-100 text-gray-800",
  material_acessado: "bg-blue-100 text-blue-800",
  em_avaliacao: "bg-yellow-100 text-yellow-800",
  reprovado: "bg-red-100 text-red-800",
};

export default function ListaPresenca() {
  const [selectedTreinamento, setSelectedTreinamento] = useState<string>("todos");

  const { data: treinamentos = [] } = useQuery({
    queryKey: ["lms-treinamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lms_treinamentos").select("*").order("titulo");
      if (error) throw error;
      return data as Treinamento[];
    },
  });

  const { data: inscricoes = [], isLoading } = useQuery({
    queryKey: ["lms-inscricoes-admin", selectedTreinamento],
    queryFn: async () => {
      let query = supabase.from("lms_inscricoes").select("*").order("usuario_nome");
      if (selectedTreinamento !== "todos") query = query.eq("treinamento_id", selectedTreinamento);
      const { data, error } = await query;
      if (error) throw error;
      return data as Inscricao[];
    },
  });

  const enrichedInscricoes = inscricoes.map(i => {
    const treinamento = treinamentos.find(t => t.id === i.treinamento_id);
    return { ...i, treinamento_titulo: treinamento?.titulo || "—" };
  });

  const handleExport = () => {
    const headers = ["Colaborador", "Setor", "Treinamento", "Status", "Nota", "Data Conclusão"];
    const rows = enrichedInscricoes.map(i => [
      i.usuario_nome,
      i.setor || "—",
      i.treinamento_titulo,
      i.status,
      i.nota != null ? `${i.nota}%` : "—",
      i.data_conclusao ? new Date(i.data_conclusao).toLocaleDateString("pt-BR") : "—",
    ]);
    exportToCSV({ title: "Lista de Presença LMS", headers, rows, fileName: "lista-presenca-lms" });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Lista de Presença Digital</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={selectedTreinamento} onValueChange={setSelectedTreinamento}>
              <SelectTrigger className="w-[250px]"><SelectValue placeholder="Filtrar por treinamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Treinamentos</SelectItem>
                {treinamentos.map(t => <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport}>Exportar CSV</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : enrichedInscricoes.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma inscrição encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Treinamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Data Conclusão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedInscricoes.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.usuario_nome}</TableCell>
                    <TableCell>{i.setor || "—"}</TableCell>
                    <TableCell>{i.treinamento_titulo}</TableCell>
                    <TableCell><Badge className={statusColors[i.status] || ""}>{i.status === "capacitado" ? "Capacitado" : i.status === "material_acessado" ? "Material Acessado" : i.status === "reprovado" ? "Reprovado" : "Pendente"}</Badge></TableCell>
                    <TableCell>{i.nota != null ? `${i.nota}%` : "—"}</TableCell>
                    <TableCell>{i.data_conclusao ? new Date(i.data_conclusao).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
