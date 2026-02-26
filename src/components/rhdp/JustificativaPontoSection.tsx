import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, FileText, Plus, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useColaboradores } from "@/hooks/useProfissionais";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const JustificativaPontoSection = () => {
  const queryClient = useQueryClient();
  const { data: colaboradores = [] } = useColaboradores();

  const [open, setOpen] = useState(false);
  const [selectedColab, setSelectedColab] = useState<typeof colaboradores[0] | null>(null);
  const [dataOcorrencia, setDataOcorrencia] = useState("");
  const [jornadaEntrada, setJornadaEntrada] = useState("");
  const [jornadaSaida, setJornadaSaida] = useState("");
  const [registradaEntrada, setRegistradaEntrada] = useState("");
  const [registradaSaida, setRegistradaSaida] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Calculate excess minutes
  const minutosExcedentes = useMemo(() => {
    if (!jornadaEntrada || !jornadaSaida || !registradaEntrada || !registradaSaida) return 0;
    const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const contratual = toMin(jornadaSaida) - toMin(jornadaEntrada);
    const registrada = toMin(registradaSaida) - toMin(registradaEntrada);
    return registrada - contratual;
  }, [jornadaEntrada, jornadaSaida, registradaEntrada, registradaSaida]);

  // Fetch existing records
  const { data: registros = [] } = useQuery({
    queryKey: ["justificativas_ponto"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("justificativas_ponto")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const resetForm = () => {
    setSelectedColab(null);
    setDataOcorrencia("");
    setJornadaEntrada("");
    setJornadaSaida("");
    setRegistradaEntrada("");
    setRegistradaSaida("");
    setJustificativa("");
    setObservacoes("");
  };

  const handleSalvar = async () => {
    if (!selectedColab || !dataOcorrencia) {
      toast.error("Preencha colaborador e data da ocorrência.");
      return;
    }
    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("justificativas_ponto").insert({
        colaborador_nome: selectedColab.full_name,
        cargo_funcao: selectedColab.cargo,
        matricula: null,
        setor: selectedColab.setor,
        colaborador_user_id: selectedColab.user_id,
        data_ocorrencia: dataOcorrencia,
        jornada_contratual_entrada: jornadaEntrada || null,
        jornada_contratual_saida: jornadaSaida || null,
        jornada_registrada_entrada: registradaEntrada || null,
        jornada_registrada_saida: registradaSaida || null,
        minutos_excedentes: minutosExcedentes,
        justificativa,
        observacoes,
        registrado_por: user?.id,
        registrado_por_nome: user?.user_metadata?.full_name || user?.email || "",
      });
      if (error) throw error;
      toast.success("Justificativa salva com sucesso!");
      resetForm();
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["justificativas_ponto"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  if (!showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Justificativas de Ponto
          </h3>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Justificativa
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Min. Excedentes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma justificativa registrada.</TableCell></TableRow>
                )}
                {registros.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.data_ocorrencia ? format(new Date(r.data_ocorrencia + "T00:00:00"), "dd/MM/yyyy") : "-"}</TableCell>
                    <TableCell className="font-medium">{r.colaborador_nome}</TableCell>
                    <TableCell>{r.setor || "-"}</TableCell>
                    <TableCell>{r.cargo_funcao || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={r.minutos_excedentes > 0 ? "default" : "secondary"}>
                        {r.minutos_excedentes} min
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "pendente" ? "outline" : "default"}>{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Nova Justificativa de Ponto</h3>
        <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>Voltar</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">JUSTIFICATIVA DE PONTO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Unidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Unidade</Label>
              <Input value="UPA ANTONIO JOSE DOS SANTOS" disabled className="bg-muted" />
            </div>
            <div>
              <Label>Setor</Label>
              <Input value={selectedColab?.setor || ""} disabled placeholder="Preenchido automaticamente" className="bg-muted" />
            </div>
          </div>

          {/* Identificação do Colaborador */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-sm">IDENTIFICAÇÃO DO COLABORADOR</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <Label>Colaborador</Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {selectedColab ? selectedColab.full_name : "Buscar colaborador..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar por nome..." />
                      <CommandList>
                        <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                        <CommandGroup>
                          {colaboradores.map((c) => (
                            <CommandItem
                              key={c.user_id}
                              value={c.full_name || ""}
                              onSelect={() => {
                                setSelectedColab(c);
                                setOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedColab?.user_id === c.user_id ? "opacity-100" : "opacity-0")} />
                              {c.full_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Cargo / Função</Label>
                <Input value={selectedColab?.cargo || ""} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Data da Ocorrência</Label>
                <Input type="date" value={dataOcorrencia} onChange={(e) => setDataOcorrencia(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Jornada */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-sm">JORNADA CONTRATUAL</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Entrada</Label>
                <Input type="time" value={jornadaEntrada} onChange={(e) => setJornadaEntrada(e.target.value)} />
              </div>
              <div>
                <Label>Saída</Label>
                <Input type="time" value={jornadaSaida} onChange={(e) => setJornadaSaida(e.target.value)} />
              </div>
            </div>

            <h4 className="font-semibold text-sm mt-4">JORNADA EFETIVAMENTE REGISTRADA</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Entrada</Label>
                <Input type="time" value={registradaEntrada} onChange={(e) => setRegistradaEntrada(e.target.value)} />
              </div>
              <div>
                <Label>Saída</Label>
                <Input type="time" value={registradaSaida} onChange={(e) => setRegistradaSaida(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 p-3 rounded-md bg-muted flex items-center justify-between">
              <span className="font-medium text-sm">Total de minutos excedentes:</span>
              <Badge variant={minutosExcedentes > 0 ? "default" : "secondary"} className="text-base px-4 py-1">
                {minutosExcedentes} min
              </Badge>
            </div>
          </div>

          {/* Justificativa */}
          <div>
            <Label>Justificativa</Label>
            <Textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Descreva a justificativa..." rows={3} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações adicionais..." rows={2} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar Justificativa"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
