import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileSpreadsheet, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface ImportEquipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "colaboradores" | "escala";
}

const ImportEquipeDialog = ({ open, onOpenChange, type }: ImportEquipeDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importColaboradoresMutation = useMutation({
    mutationFn: async (records: any[]) => {
      const { error } = await supabase.from("profissionais_saude").insert(records);
      if (error) throw error;
      return records.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["profissionais_saude"] });
      queryClient.invalidateQueries({ queryKey: ["profissionais_medicos"] });
      toast({ title: "Sucesso", description: `${count} colaboradores importados!` });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const importEscalaMutation = useMutation({
    mutationFn: async ({ medicos, enfermagem }: { medicos: any[]; enfermagem: any[] }) => {
      let count = 0;
      
      if (medicos.length > 0) {
        const { error } = await supabase.from("escalas_medicos").insert(medicos);
        if (error) throw error;
        count += medicos.length;
      }
      
      if (enfermagem.length > 0) {
        const { error } = await supabase.from("enfermagem_escalas").insert(enfermagem);
        if (error) throw error;
        count += enfermagem.length;
      }
      
      return count;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["escalas_medicos_equipe"] });
      queryClient.invalidateQueries({ queryKey: ["escalas_enfermagem_equipe"] });
      toast({ title: "Sucesso", description: `${count} escalas importadas!` });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const downloadTemplateColaboradores = () => {
    const template = [
      { Nome: "JOÃO DA SILVA", Tipo: "medico", "Registro Profissional": "CRM 12345", Especialidade: "Clínico Geral", Telefone: "(14) 99999-9999", Email: "joao@email.com" },
      { Nome: "MARIA SANTOS", Tipo: "enfermagem", "Registro Profissional": "COREN 54321", Especialidade: "UTI", Telefone: "(14) 88888-8888", Email: "maria@email.com" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Colaboradores");
    XLSX.writeFile(wb, "modelo_importacao_colaboradores.xlsx");
  };

  const downloadTemplateEscala = () => {
    const template = [
      { Nome: "JOÃO DA SILVA", Tipo: "medico", Data: "2026-02-10", "Hora Início": "07:00", "Hora Fim": "19:00", Setor: "Emergência" },
      { Nome: "MARIA SANTOS", Tipo: "enfermagem", Data: "2026-02-10", "Hora Início": "19:00", "Hora Fim": "07:00", Setor: "UTI" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Escala");
    XLSX.writeFile(wb, "modelo_importacao_escala.xlsx");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (type === "colaboradores") {
          const records = jsonData.map((row: any) => ({
            nome: (row.Nome || row.NOME || row.nome || "").toString().toUpperCase(),
            tipo: (row.Tipo || row.TIPO || row.tipo || "medico").toString().toLowerCase(),
            registro_profissional: (row["Registro Profissional"] || row.CRM || row.COREN || "").toString() || null,
            especialidade: (row.Especialidade || row.ESPECIALIDADE || "").toString() || null,
            status: "ativo",
            telefone: (row.Telefone || row.TELEFONE || "").toString() || null,
            email: (row.Email || row.EMAIL || "").toString() || null,
          })).filter((r: any) => r.nome);

          if (records.length > 0) {
            importColaboradoresMutation.mutate(records);
          } else {
            toast({ title: "Erro", description: "Nenhum registro válido", variant: "destructive" });
          }
        } else {
          // Importar escala - buscar profissionais primeiro
          const { data: profissionais } = await supabase
            .from("profissionais_saude")
            .select("id, nome, tipo")
            .eq("status", "ativo");

          const { data: userData } = await supabase.auth.getUser();
          const userId = userData.user?.id;

          const medicos: any[] = [];
          const enfermagem: any[] = [];

          jsonData.forEach((row: any) => {
            const nome = (row.Nome || row.NOME || "").toString().toUpperCase();
            const tipo = (row.Tipo || row.TIPO || "medico").toString().toLowerCase();
            const prof = profissionais?.find((p) => p.nome.toUpperCase() === nome);

            if (prof) {
              const escalaRecord = {
                profissional_id: prof.id,
                data_plantao: row.Data || row.DATA,
                hora_inicio: row["Hora Início"] || row.HoraInicio || "07:00",
                hora_fim: row["Hora Fim"] || row.HoraFim || "19:00",
                setor: row.Setor || row.SETOR || "Emergência",
                tipo_plantao: "regular",
                status: "confirmado",
              };

              if (tipo === "medico" || prof.tipo === "medico") {
                medicos.push(escalaRecord);
              } else {
                enfermagem.push({
                  ...escalaRecord,
                  profissional_saude_id: prof.id,
                  profissional_nome: prof.nome,
                  created_by: userId,
                });
              }
            }
          });

          if (medicos.length > 0 || enfermagem.length > 0) {
            importEscalaMutation.mutate({ medicos, enfermagem });
          } else {
            toast({ 
              title: "Aviso", 
              description: "Nenhum profissional encontrado. Cadastre os colaboradores primeiro.", 
              variant: "destructive" 
            });
          }
        }
      } catch (error) {
        toast({ title: "Erro", description: "Erro ao processar arquivo", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const isColaboradores = type === "colaboradores";
  const Icon = isColaboradores ? Users : Calendar;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {isColaboradores ? "Importar Colaboradores" : "Importar Escala"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isColaboradores 
              ? "Importe uma planilha com os dados dos colaboradores (médicos e enfermagem). Eles serão cadastrados na base do RH."
              : "Importe uma planilha com as escalas. Os colaboradores devem estar previamente cadastrados."}
          </p>
          <Button 
            variant="outline" 
            onClick={isColaboradores ? downloadTemplateColaboradores : downloadTemplateEscala} 
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar Modelo
          </Button>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Arraste ou selecione o arquivo
            </p>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            <p><strong>Colunas esperadas:</strong></p>
            {isColaboradores ? (
              <p>Nome, Tipo (medico/enfermagem), Registro Profissional, Especialidade, Telefone, Email</p>
            ) : (
              <p>Nome, Tipo (medico/enfermagem), Data, Hora Início, Hora Fim, Setor</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportEquipeDialog;
