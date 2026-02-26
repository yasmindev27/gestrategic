import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Plus, Save, Trash2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SETOR_CODES = [
  { code: '', label: 'Folga', color: 'bg-gray-50 text-gray-400' },
  { code: 'U', label: 'Urgência', color: 'bg-red-100 text-red-800' },
  { code: 'S', label: 'Sutura', color: 'bg-blue-100 text-blue-800' },
  { code: 'I', label: 'Internação', color: 'bg-purple-100 text-purple-800' },
  { code: 'C/M', label: 'CME / Medicação', color: 'bg-amber-100 text-amber-800' },
  { code: 'M1', label: 'Medicação / Acolhimento', color: 'bg-teal-100 text-teal-800' },
  { code: 'M2', label: 'Lab / Medicação', color: 'bg-cyan-100 text-cyan-800' },
  { code: 'T', label: 'Transporte', color: 'bg-orange-100 text-orange-800' },
  { code: 'A', label: 'Acolhimento', color: 'bg-green-100 text-green-800' },
  { code: 'LAB', label: 'Laboratório', color: 'bg-indigo-100 text-indigo-800' },
  { code: 'CME', label: 'CME', color: 'bg-yellow-100 text-yellow-800' },
  { code: 'AF', label: 'Afastamento', color: 'bg-gray-200 text-gray-700' },
  { code: 'M6', label: 'M6', color: 'bg-pink-100 text-pink-800' },
];

const GRUPOS = [
  { value: 'noturno_impar', label: 'Noturno (Ímpares)', horario: '19:00 AS 07:00' },
  { value: 'noturno_par', label: 'Noturno (Pares)', horario: '19:00 AS 07:00' },
  { value: 'diurno_impar', label: 'Diurno (Ímpares)', horario: '07:00 AS 19:00' },
  { value: 'diurno_par', label: 'Diurno (Pares)', horario: '07:00 AS 19:00' },
  { value: 'especial', label: 'Especial', horario: '' },
];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface Profissional {
  id: string;
  escala_id: string;
  nome: string;
  coren: string;
  horario: string;
  grupo: string;
  ordem: number;
  dias: Record<number, string>;
}

interface EscalaData {
  id: string;
  mes: number;
  ano: number;
  titulo: string;
  unidade: string;
  mensagem_motivacional: string | null;
  coordenadora_nome: string | null;
  coordenadora_coren: string | null;
}

function getSetorColor(code: string) {
  return SETOR_CODES.find(s => s.code === code)?.color || 'bg-gray-50';
}

export function EscalaTecEnfermagem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [editingCell, setEditingCell] = useState<{ profId: string; dia: number } | null>(null);
  const [addProfOpen, setAddProfOpen] = useState(false);
  const [newProf, setNewProf] = useState({ nome: '', coren: '', grupo: 'noturno_impar', horario: '19:00 AS 07:00' });
  const [hasChanges, setHasChanges] = useState(false);
  const [localDias, setLocalDias] = useState<Record<string, Record<number, string>>>({});

  const daysInMonth = new Date(ano, mes, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Fetch escala
  const { data: escala, isLoading: escalaLoading } = useQuery({
    queryKey: ['escala-tec-enf', mes, ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escalas_tec_enfermagem')
        .select('*')
        .eq('mes', mes)
        .eq('ano', ano)
        .maybeSingle();
      if (error) throw error;
      return data as EscalaData | null;
    },
  });

  // Fetch profissionais + dias
  const { data: profissionais = [], isLoading: profsLoading } = useQuery({
    queryKey: ['escala-tec-enf-profs', escala?.id],
    queryFn: async () => {
      if (!escala?.id) return [];
      const { data: profs, error } = await supabase
        .from('escala_tec_enf_profissionais')
        .select('*')
        .eq('escala_id', escala.id)
        .order('grupo')
        .order('ordem');
      if (error) throw error;

      // Fetch all dias for these professionals
      const profIds = profs.map(p => p.id);
      if (profIds.length === 0) return [];

      const { data: diasData, error: diasError } = await supabase
        .from('escala_tec_enf_dias')
        .select('*')
        .in('profissional_id', profIds);
      if (diasError) throw diasError;

      // Map dias to professionals
      return profs.map(p => {
        const profDias: Record<number, string> = {};
        diasData?.filter(d => d.profissional_id === p.id).forEach(d => {
          profDias[d.dia] = d.setor_codigo;
        });
        return { ...p, dias: profDias } as Profissional;
      });
    },
    enabled: !!escala?.id,
  });

  // Initialize local dias from fetched data
  useEffect(() => {
    const mapped: Record<string, Record<number, string>> = {};
    profissionais.forEach(p => {
      mapped[p.id] = { ...p.dias };
    });
    setLocalDias(mapped);
    setHasChanges(false);
  }, [profissionais]);

  // Create escala for month
  const createEscalaMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('escalas_tec_enfermagem')
        .insert({
          mes,
          ano,
          created_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escala-tec-enf', mes, ano] });
      toast({ title: 'Escala criada para ' + MESES[mes - 1] + '/' + ano });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });

  // Add professional
  const addProfMutation = useMutation({
    mutationFn: async (data: typeof newProf) => {
      if (!escala?.id) throw new Error('Escala não encontrada');
      const maxOrdem = profissionais.filter(p => p.grupo === data.grupo).length;
      const { error } = await supabase
        .from('escala_tec_enf_profissionais')
        .insert({
          escala_id: escala.id,
          nome: data.nome,
          coren: data.coren,
          horario: data.horario,
          grupo: data.grupo,
          ordem: maxOrdem,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escala-tec-enf-profs'] });
      setAddProfOpen(false);
      setNewProf({ nome: '', coren: '', grupo: 'noturno_impar', horario: '19:00 AS 07:00' });
      toast({ title: 'Profissional adicionado!' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });

  // Remove professional
  const removeProfMutation = useMutation({
    mutationFn: async (profId: string) => {
      const { error } = await supabase
        .from('escala_tec_enf_profissionais')
        .delete()
        .eq('id', profId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escala-tec-enf-profs'] });
      toast({ title: 'Profissional removido' });
    },
  });

  // Save all changes
  const saveMutation = useMutation({
    mutationFn: async () => {
      // For each professional, upsert their dias
      for (const profId of Object.keys(localDias)) {
        const profDias = localDias[profId];
        for (let dia = 1; dia <= daysInMonth; dia++) {
          const code = profDias[dia] || '';
          // Upsert
          const { error } = await supabase
            .from('escala_tec_enf_dias')
            .upsert({
              profissional_id: profId,
              dia,
              setor_codigo: code,
            }, { onConflict: 'profissional_id,dia' });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escala-tec-enf-profs'] });
      setHasChanges(false);
      toast({ title: 'Escala salva com sucesso!' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    },
  });

  const handleCellChange = (profId: string, dia: number, value: string) => {
    setLocalDias(prev => ({
      ...prev,
      [profId]: { ...(prev[profId] || {}), [dia]: value },
    }));
    setHasChanges(true);
    setEditingCell(null);
  };

  const getDayOfWeek = (dia: number) => {
    const date = new Date(ano, mes - 1, dia);
    return ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][date.getDay()];
  };

  const groupedProfs = useMemo(() => {
    const groups: Record<string, Profissional[]> = {};
    GRUPOS.forEach(g => { groups[g.value] = []; });
    profissionais.forEach(p => {
      if (!groups[p.grupo]) groups[p.grupo] = [];
      groups[p.grupo].push(p);
    });
    return groups;
  }, [profissionais]);

  // PDF Export
  const exportPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(12);
    doc.text(escala?.unidade || 'UNIDADE DE PRONTO ATENDIMENTO', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.text(escala?.titulo || 'ESCALA DE SERVIÇO DE TECNICO DE ENFERMAGEM', pageWidth / 2, 18, { align: 'center' });
    doc.text(`MÊS: ${MESES[mes - 1].toUpperCase()} ${ano}`, pageWidth / 2, 24, { align: 'center' });

    let startY = 28;

    GRUPOS.forEach(grupo => {
      const profs = groupedProfs[grupo.value] || [];
      if (profs.length === 0) return;

      // Header row
      const headers = ['NOME DO PROFISSIONAL', 'COREN-MG', ...days.map(d => String(d)), 'HORÁRIO'];

      const body = profs.map(p => {
        const profDias = localDias[p.id] || p.dias || {};
        return [
          p.nome,
          p.coren,
          ...days.map(d => profDias[d] || ''),
          p.horario,
        ];
      });

      autoTable(doc, {
        head: [headers],
        body,
        startY,
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 0.5, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 5 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 45 },
          1: { cellWidth: 14 },
          [days.length + 2]: { cellWidth: 20 },
        },
        margin: { left: 5, right: 5 },
      });

      startY = (doc as any).lastAutoTable.finalY + 4;
    });

    // Legenda
    doc.setFontSize(6);
    const legendItems = SETOR_CODES.filter(s => s.code).map(s => `${s.code} - ${s.label}`);
    doc.text('LEGENDA: ' + legendItems.join('  |  '), 5, startY + 2);

    if (escala?.coordenadora_nome) {
      doc.text(`${escala.coordenadora_nome}`, pageWidth - 60, startY + 6);
      if (escala.coordenadora_coren) {
        doc.text(`COREN-MG ${escala.coordenadora_coren}`, pageWidth - 60, startY + 10);
      }
      doc.text('COORDENADORA DE ENFERMAGEM', pageWidth - 60, startY + 14);
    }

    // LGPD footer
    doc.setFontSize(5);
    doc.text(
      'Documento gerado pelo sistema GEStrategic. Confidencial – LGPD Art. 46.',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    );

    doc.save(`Escala_Tec_Enfermagem_${MESES[mes - 1]}_${ano}.pdf`);
    toast({ title: 'PDF exportado com sucesso!' });
  }, [escala, mes, ano, groupedProfs, localDias, days, toast]);

  const isLoading = escalaLoading || profsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Escala de Técnico de Enfermagem
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              className="w-[80px]"
            />
            {escala && (
              <>
                <Button size="sm" variant="outline" onClick={() => setAddProfOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1" /> Profissional
                </Button>
                {hasChanges && (
                  <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" /> Salvar
                  </Button>
                )}
                <ExportDropdown onExportPDF={exportPDF} />
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!escala ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">Nenhuma escala encontrada para {MESES[mes - 1]}/{ano}.</p>
            <Button onClick={() => createEscalaMutation.mutate()} disabled={createEscalaMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" /> Criar Escala para {MESES[mes - 1]}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header info */}
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold">{escala.unidade}</p>
              <p className="text-sm">{escala.titulo}</p>
              <p className="text-sm font-medium">MÊS: {MESES[mes - 1].toUpperCase()} {ano}</p>
            </div>

            {/* Schedule grid per group */}
            {GRUPOS.map(grupo => {
              const profs = groupedProfs[grupo.value] || [];
              if (profs.length === 0) return null;

              return (
                <div key={grupo.value} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">{grupo.label}</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="text-xs w-full border-collapse">
                      <thead>
                        <tr className="bg-primary/10">
                          <th className="border px-2 py-1 text-left sticky left-0 bg-primary/10 z-10 min-w-[180px]">
                            NOME DO PROFISSIONAL
                          </th>
                          <th className="border px-1 py-1 min-w-[70px]">COREN-MG</th>
                          {days.map(d => (
                            <th key={d} className="border px-0.5 py-1 min-w-[28px]">
                              <div>{d}</div>
                              <div className="text-[9px] text-muted-foreground">{getDayOfWeek(d)}</div>
                            </th>
                          ))}
                          <th className="border px-1 py-1 min-w-[90px]">HORÁRIO</th>
                          <th className="border px-1 py-1 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {profs.map(prof => {
                          const profDias = localDias[prof.id] || prof.dias || {};
                          return (
                            <tr key={prof.id} className="hover:bg-muted/30">
                              <td className="border px-2 py-0.5 font-medium sticky left-0 bg-background z-10 whitespace-nowrap">
                                {prof.nome}
                              </td>
                              <td className="border px-1 py-0.5 text-center">{prof.coren}</td>
                              {days.map(d => {
                                const code = profDias[d] || '';
                                const isEditing = editingCell?.profId === prof.id && editingCell?.dia === d;
                                return (
                                  <td
                                    key={d}
                                    className={cn(
                                      'border px-0 py-0 text-center cursor-pointer transition-colors',
                                      getSetorColor(code)
                                    )}
                                    onClick={() => setEditingCell({ profId: prof.id, dia: d })}
                                  >
                                    {isEditing ? (
                                      <select
                                        autoFocus
                                        className="w-full text-xs bg-transparent border-none p-0 text-center"
                                        value={code}
                                        onChange={e => handleCellChange(prof.id, d, e.target.value)}
                                        onBlur={() => setEditingCell(null)}
                                      >
                                        {SETOR_CODES.map(s => (
                                          <option key={s.code} value={s.code}>
                                            {s.code || '-'}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span className="text-[10px] font-medium">{code}</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="border px-1 py-0.5 text-center text-[10px]">{prof.horario}</td>
                              <td className="border px-0.5 py-0.5 text-center">
                                <button
                                  className="text-destructive hover:text-destructive/80"
                                  onClick={() => {
                                    if (confirm('Remover ' + prof.nome + '?')) {
                                      removeProfMutation.mutate(prof.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Legenda */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-xs font-semibold text-muted-foreground">LEGENDA:</span>
              {SETOR_CODES.filter(s => s.code).map(s => (
                <Badge key={s.code} variant="outline" className={cn('text-[10px]', s.color)}>
                  {s.code} - {s.label}
                </Badge>
              ))}
            </div>

            {/* Coordenadora */}
            {escala.coordenadora_nome && (
              <div className="text-right text-xs space-y-0.5 pt-4">
                <p className="font-semibold">{escala.coordenadora_nome}</p>
                {escala.coordenadora_coren && <p>COREN-MG {escala.coordenadora_coren}</p>}
                <p>COORDENADORA DE ENFERMAGEM</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Add Professional Dialog */}
      <Dialog open={addProfOpen} onOpenChange={setAddProfOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Profissional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome Completo *</Label>
              <Input
                value={newProf.nome}
                onChange={e => setNewProf({ ...newProf, nome: e.target.value })}
                placeholder="Nome do profissional"
              />
            </div>
            <div>
              <Label>COREN-MG *</Label>
              <Input
                value={newProf.coren}
                onChange={e => setNewProf({ ...newProf, coren: e.target.value })}
                placeholder="Número do COREN"
              />
            </div>
            <div>
              <Label>Grupo / Turno</Label>
              <Select
                value={newProf.grupo}
                onValueChange={v => {
                  const grp = GRUPOS.find(g => g.value === v);
                  setNewProf({ ...newProf, grupo: v, horario: grp?.horario || newProf.horario });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRUPOS.map(g => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Horário</Label>
              <Input
                value={newProf.horario}
                onChange={e => setNewProf({ ...newProf, horario: e.target.value })}
                placeholder="Ex: 19:00 AS 07:00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProfOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => addProfMutation.mutate(newProf)}
              disabled={!newProf.nome || !newProf.coren || addProfMutation.isPending}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
