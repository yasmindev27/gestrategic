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
import { Calendar, Copy, Edit2, Plus, Save, Trash2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* =====================================================
   CONFIGURAÇÕES POR TIPO DE ESCALA
   ===================================================== */

export type EscalaTipo = 'tecnicos' | 'enfermeiros' | 'radiologia' | 'administrativa';

interface SetorCode {
  code: string;
  label: string;
  color: string;
}

interface GrupoConfig {
  value: string;
  label: string;
  horario: string;
}

interface EscalaTipoConfig {
  titulo: string;
  tituloCard: string;
  setorCodes: SetorCode[];
  grupos: GrupoConfig[];
  registroLabel: string; // ex: COREN-MG, CRM, Matrícula
  pdfFilename: string;
}

const ESCALA_CONFIGS: Record<EscalaTipo, EscalaTipoConfig> = {
  tecnicos: {
    titulo: 'ESCALA DE SERVIÇO DE TECNICO DE ENFERMAGEM',
    tituloCard: 'Escala de Técnico de Enfermagem',
    registroLabel: 'COREN-MG',
    pdfFilename: 'Escala_Tec_Enfermagem',
    setorCodes: [
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
    ],
    grupos: [
      { value: 'noturno_impar', label: 'Noturno (Ímpares)', horario: '19:00 AS 07:00' },
      { value: 'noturno_par', label: 'Noturno (Pares)', horario: '19:00 AS 07:00' },
      { value: 'diurno_impar', label: 'Diurno (Ímpares)', horario: '07:00 AS 19:00' },
      { value: 'diurno_par', label: 'Diurno (Pares)', horario: '07:00 AS 19:00' },
      { value: 'especial', label: 'Especial', horario: '' },
    ],
  },
  enfermeiros: {
    titulo: 'ESCALA DE SERVIÇO DE ENFERMEIROS',
    tituloCard: 'Escala de Enfermeiros',
    registroLabel: 'COREN-MG',
    pdfFilename: 'Escala_Enfermeiros',
    setorCodes: [
      { code: '', label: 'Folga', color: 'bg-gray-50 text-gray-400' },
      { code: 'U', label: 'Urgência', color: 'bg-red-100 text-red-800' },
      { code: 'I', label: 'Internação', color: 'bg-purple-100 text-purple-800' },
      { code: 'S', label: 'Sutura', color: 'bg-blue-100 text-blue-800' },
      { code: 'RT', label: 'RT (Resp. Técnico)', color: 'bg-emerald-100 text-emerald-800' },
      { code: 'SUP', label: 'Supervisão', color: 'bg-sky-100 text-sky-800' },
      { code: 'AC', label: 'Acolhimento', color: 'bg-green-100 text-green-800' },
      { code: 'M', label: 'Medicação', color: 'bg-amber-100 text-amber-800' },
      { code: 'T', label: 'Transporte', color: 'bg-orange-100 text-orange-800' },
      { code: 'AF', label: 'Afastamento', color: 'bg-gray-200 text-gray-700' },
    ],
    grupos: [
      { value: 'noturno_impar', label: 'Noturno (Ímpares)', horario: '19:00 AS 07:00' },
      { value: 'noturno_par', label: 'Noturno (Pares)', horario: '19:00 AS 07:00' },
      { value: 'diurno_impar', label: 'Diurno (Ímpares)', horario: '07:00 AS 19:00' },
      { value: 'diurno_par', label: 'Diurno (Pares)', horario: '07:00 AS 19:00' },
      { value: 'especial', label: 'Especial', horario: '' },
    ],
  },
  radiologia: {
    titulo: 'ESCALA DE SERVIÇO DE RADIOLOGIA',
    tituloCard: 'Escala de Radiologia',
    registroLabel: 'CRTR',
    pdfFilename: 'Escala_Radiologia',
    setorCodes: [
      { code: '', label: 'Folga', color: 'bg-gray-50 text-gray-400' },
      { code: 'RX', label: 'Raio-X', color: 'bg-blue-100 text-blue-800' },
      { code: 'TC', label: 'Tomografia', color: 'bg-purple-100 text-purple-800' },
      { code: 'US', label: 'Ultrassom', color: 'bg-teal-100 text-teal-800' },
      { code: 'PL', label: 'Plantão', color: 'bg-red-100 text-red-800' },
      { code: 'ADM', label: 'Administrativo', color: 'bg-amber-100 text-amber-800' },
      { code: 'AF', label: 'Afastamento', color: 'bg-gray-200 text-gray-700' },
    ],
    grupos: [
      { value: 'noturno_impar', label: 'Noturno (Ímpares)', horario: '19:00 AS 07:00' },
      { value: 'noturno_par', label: 'Noturno (Pares)', horario: '19:00 AS 07:00' },
      { value: 'diurno_impar', label: 'Diurno (Ímpares)', horario: '07:00 AS 19:00' },
      { value: 'diurno_par', label: 'Diurno (Pares)', horario: '07:00 AS 19:00' },
      { value: 'especial', label: 'Especial', horario: '' },
    ],
  },
  administrativa: {
    titulo: 'ESCALA ADMINISTRATIVA',
    tituloCard: 'Escala Administrativa',
    registroLabel: 'Matrícula',
    pdfFilename: 'Escala_Administrativa',
    setorCodes: [
      { code: '', label: 'Folga', color: 'bg-gray-50 text-gray-400' },
      { code: 'REC', label: 'Recepção', color: 'bg-blue-100 text-blue-800' },
      { code: 'NIR', label: 'NIR', color: 'bg-purple-100 text-purple-800' },
      { code: 'FAT', label: 'Faturamento', color: 'bg-amber-100 text-amber-800' },
      { code: 'ADM', label: 'Administração', color: 'bg-green-100 text-green-800' },
      { code: 'ALM', label: 'Almoxarifado', color: 'bg-orange-100 text-orange-800' },
      { code: 'SEG', label: 'Segurança', color: 'bg-red-100 text-red-800' },
      { code: 'LIM', label: 'Limpeza', color: 'bg-teal-100 text-teal-800' },
      { code: 'RES', label: 'Restaurante', color: 'bg-cyan-100 text-cyan-800' },
      { code: 'MAN', label: 'Manutenção', color: 'bg-indigo-100 text-indigo-800' },
      { code: 'AF', label: 'Afastamento', color: 'bg-gray-200 text-gray-700' },
    ],
    grupos: [
      { value: 'noturno_impar', label: 'Noturno (Ímpares)', horario: '19:00 AS 07:00' },
      { value: 'noturno_par', label: 'Noturno (Pares)', horario: '19:00 AS 07:00' },
      { value: 'diurno_impar', label: 'Diurno (Ímpares)', horario: '07:00 AS 19:00' },
      { value: 'diurno_par', label: 'Diurno (Pares)', horario: '07:00 AS 19:00' },
      { value: 'especial', label: 'Especial', horario: '' },
    ],
  },
};

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

interface EscalaTecEnfermagemProps {
  tipo?: EscalaTipo;
}

export function EscalaTecEnfermagem({ tipo = 'tecnicos' }: EscalaTecEnfermagemProps) {
  const config = ESCALA_CONFIGS[tipo];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [editingCell, setEditingCell] = useState<{ profId: string; dia: number } | null>(null);
  const [addProfOpen, setAddProfOpen] = useState(false);
  const [editProfOpen, setEditProfOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<Profissional | null>(null);
  const [newProf, setNewProf] = useState({ nome: '', coren: '', grupo: config.grupos[0]?.value || 'noturno_impar', horario: config.grupos[0]?.horario || '' });
  const [hasChanges, setHasChanges] = useState(false);
  const [localDias, setLocalDias] = useState<Record<string, Record<number, string>>>({});

  const daysInMonth = new Date(ano, mes, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function getSetorColor(code: string) {
    return config.setorCodes.find(s => s.code === code)?.color || 'bg-gray-50';
  }

  // Fetch escala filtered by tipo
  const { data: escala, isLoading: escalaLoading } = useQuery({
    queryKey: ['escala-tec-enf', mes, ano, tipo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escalas_tec_enfermagem')
        .select('*')
        .eq('mes', mes)
        .eq('ano', ano)
        .eq('tipo', tipo)
        .maybeSingle();
      if (error) throw error;
      return data as EscalaData | null;
    },
  });

  // Fetch profissionais + dias
  const { data: profissionais = [], isLoading: profsLoading } = useQuery({
    queryKey: ['escala-tec-enf-profs', escala?.id, tipo],
    queryFn: async () => {
      if (!escala?.id) return [];
      const { data: profs, error } = await supabase
        .from('escala_tec_enf_profissionais')
        .select('*')
        .eq('escala_id', escala.id)
        .order('grupo')
        .order('ordem');
      if (error) throw error;

      const profIds = profs.map(p => p.id);
      if (profIds.length === 0) return [];

      const { data: diasData, error: diasError } = await supabase
        .from('escala_tec_enf_dias')
        .select('*')
        .in('profissional_id', profIds);
      if (diasError) throw diasError;

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
          tipo,
          titulo: config.titulo,
          created_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escala-tec-enf', mes, ano, tipo] });
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
      setNewProf({ nome: '', coren: '', grupo: config.grupos[0]?.value || 'noturno_impar', horario: config.grupos[0]?.horario || '' });
      toast({ title: 'Profissional adicionado!' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });

  // Remove professional
  const removeProfMutation = useMutation({
    mutationFn: async (profId: string) => {
      // Delete dias first
      await supabase.from('escala_tec_enf_dias').delete().eq('profissional_id', profId);
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

  // Edit professional
  const editProfMutation = useMutation({
    mutationFn: async (data: { id: string; nome: string; coren: string; grupo: string; horario: string }) => {
      const { error } = await supabase
        .from('escala_tec_enf_profissionais')
        .update({ nome: data.nome, coren: data.coren, grupo: data.grupo, horario: data.horario })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escala-tec-enf-profs'] });
      setEditProfOpen(false);
      setEditingProf(null);
      toast({ title: 'Profissional atualizado!' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });

  // Delete entire escala for current month
  const deleteEscalaMutation = useMutation({
    mutationFn: async () => {
      if (!escala?.id) throw new Error('Nenhuma escala para excluir');
      const { data: profs } = await supabase
        .from('escala_tec_enf_profissionais')
        .select('id')
        .eq('escala_id', escala.id);
      if (profs && profs.length > 0) {
        const profIds = profs.map(p => p.id);
        await supabase.from('escala_tec_enf_dias').delete().in('profissional_id', profIds);
        await supabase.from('escala_tec_enf_profissionais').delete().eq('escala_id', escala.id);
      }
      const { error } = await supabase.from('escalas_tec_enfermagem').delete().eq('id', escala.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escala-tec-enf', mes, ano, tipo] });
      queryClient.invalidateQueries({ queryKey: ['escala-tec-enf-profs'] });
      toast({ title: `Escala de ${MESES[mes - 1]}/${ano} excluída com sucesso.` });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' });
    },
  });

  // Copy from previous month (professionals only)
  const copyFromPreviousMonth = useMutation({
    mutationFn: async () => {
      const prevMes = mes === 1 ? 12 : mes - 1;
      const prevAno = mes === 1 ? ano - 1 : ano;
      
      const { data: prevEscala } = await supabase
        .from('escalas_tec_enfermagem')
        .select('id')
        .eq('mes', prevMes)
        .eq('ano', prevAno)
        .eq('tipo', tipo)
        .maybeSingle();
      
      if (!prevEscala) throw new Error(`Nenhuma escala encontrada para ${MESES[prevMes - 1]}/${prevAno}`);
      
      const { data: prevProfs } = await supabase
        .from('escala_tec_enf_profissionais')
        .select('*')
        .eq('escala_id', prevEscala.id);
      
      if (!prevProfs || prevProfs.length === 0) throw new Error('Nenhum profissional na escala anterior');
      
      let currentEscalaId = escala?.id;
      if (!currentEscalaId) {
        const { data: userData } = await supabase.auth.getUser();
        const { data: newEscala, error } = await supabase
          .from('escalas_tec_enfermagem')
          .insert({ mes, ano, tipo, titulo: config.titulo, created_by: userData.user?.id })
          .select()
          .single();
        if (error) throw error;
        currentEscalaId = newEscala.id;
      }
      
      for (const prof of prevProfs) {
        await supabase
          .from('escala_tec_enf_profissionais')
          .insert({
            escala_id: currentEscalaId,
            nome: prof.nome,
            coren: prof.coren,
            horario: prof.horario,
            grupo: prof.grupo,
            ordem: prof.ordem,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escala-tec-enf', mes, ano, tipo] });
      queryClient.invalidateQueries({ queryKey: ['escala-tec-enf-profs'] });
      toast({ title: 'Profissionais copiados do mês anterior! Preencha os setores.' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });

  // Duplicate full escala
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [targetMes, setTargetMes] = useState(mes === 12 ? 1 : mes + 1);
  const [targetAno, setTargetAno] = useState(mes === 12 ? ano + 1 : ano);

  useEffect(() => {
    setTargetMes(mes === 12 ? 1 : mes + 1);
    setTargetAno(mes === 12 ? ano + 1 : ano);
  }, [mes, ano]);

  const duplicateEscalaMutation = useMutation({
    mutationFn: async () => {
      if (!escala?.id) throw new Error('Nenhuma escala atual para duplicar');

      const { data: existing } = await supabase
        .from('escalas_tec_enfermagem')
        .select('id')
        .eq('mes', targetMes)
        .eq('ano', targetAno)
        .eq('tipo', tipo)
        .maybeSingle();

      if (existing) throw new Error(`Já existe uma escala para ${MESES[targetMes - 1]}/${targetAno}. Exclua-a primeiro ou escolha outro mês.`);

      const { data: userData } = await supabase.auth.getUser();
      const { data: newEscala, error: escErr } = await supabase
        .from('escalas_tec_enfermagem')
        .insert({
          mes: targetMes,
          ano: targetAno,
          tipo,
          created_by: userData.user?.id,
          unidade: escala.unidade,
          titulo: escala.titulo,
          coordenadora_nome: escala.coordenadora_nome,
          coordenadora_coren: escala.coordenadora_coren,
          mensagem_motivacional: escala.mensagem_motivacional,
        })
        .select()
        .single();
      if (escErr) throw escErr;

      const { data: curProfs } = await supabase
        .from('escala_tec_enf_profissionais')
        .select('*')
        .eq('escala_id', escala.id);

      if (!curProfs || curProfs.length === 0) return;

      const targetDaysInMonth = new Date(targetAno, targetMes, 0).getDate();

      for (const prof of curProfs) {
        const { data: newProfData, error: profErr } = await supabase
          .from('escala_tec_enf_profissionais')
          .insert({
            escala_id: newEscala.id,
            nome: prof.nome,
            coren: prof.coren,
            horario: prof.horario,
            grupo: prof.grupo,
            ordem: prof.ordem,
          })
          .select()
          .single();
        if (profErr) throw profErr;

        const profDias = localDias[prof.id] || {};
        const diasToInsert: { profissional_id: string; dia: number; setor_codigo: string }[] = [];

        for (let dia = 1; dia <= targetDaysInMonth; dia++) {
          const code = profDias[dia] || '';
          if (code) {
            diasToInsert.push({
              profissional_id: newProfData.id,
              dia,
              setor_codigo: code,
            });
          }
        }

        if (diasToInsert.length > 0) {
          for (let i = 0; i < diasToInsert.length; i += 50) {
            const batch = diasToInsert.slice(i, i + 50);
            const { error: diaErr } = await supabase
              .from('escala_tec_enf_dias')
              .insert(batch);
            if (diaErr) throw diaErr;
          }
        }
      }
    },
    onSuccess: () => {
      setDuplicateDialogOpen(false);
      setMes(targetMes);
      setAno(targetAno);
      queryClient.invalidateQueries({ queryKey: ['escala-tec-enf'] });
      queryClient.invalidateQueries({ queryKey: ['escala-tec-enf-profs'] });
      toast({ title: `Escala duplicada para ${MESES[targetMes - 1]}/${targetAno}! Edite conforme necessário.` });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao duplicar', description: e.message, variant: 'destructive' });
    },
  });

  // Save all changes
  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const profId of Object.keys(localDias)) {
        const profDias = localDias[profId];
        for (let dia = 1; dia <= daysInMonth; dia++) {
          const code = profDias[dia] || '';
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
    config.grupos.forEach(g => { groups[g.value] = []; });
    profissionais.forEach(p => {
      if (!groups[p.grupo]) groups[p.grupo] = [];
      groups[p.grupo].push(p);
    });
    return groups;
  }, [profissionais, config.grupos]);

  // PDF Export
  const exportPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(12);
    doc.text(escala?.unidade || 'UNIDADE DE PRONTO ATENDIMENTO', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.text(escala?.titulo || config.titulo, pageWidth / 2, 18, { align: 'center' });
    doc.text(`MÊS: ${MESES[mes - 1].toUpperCase()} ${ano}`, pageWidth / 2, 24, { align: 'center' });

    let startY = 28;

    config.grupos.forEach(grupo => {
      const profs = groupedProfs[grupo.value] || [];
      if (profs.length === 0) return;

      const headers = ['NOME DO PROFISSIONAL', config.registroLabel, ...days.map(d => String(d)), 'HORÁRIO'];

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

    doc.setFontSize(6);
    const legendItems = config.setorCodes.filter(s => s.code).map(s => `${s.code} - ${s.label}`);
    doc.text('LEGENDA: ' + legendItems.join('  |  '), 5, startY + 2);

    if (escala?.coordenadora_nome) {
      doc.text(`${escala.coordenadora_nome}`, pageWidth - 60, startY + 6);
      if (escala.coordenadora_coren) {
        doc.text(`${config.registroLabel} ${escala.coordenadora_coren}`, pageWidth - 60, startY + 10);
      }
      doc.text('COORDENADORA DE ENFERMAGEM', pageWidth - 60, startY + 14);
    }

    doc.setFontSize(5);
    doc.text(
      'Documento gerado pelo sistema GEStrategic. Confidencial – LGPD Art. 46.',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    );

    doc.save(`${config.pdfFilename}_${MESES[mes - 1]}_${ano}.pdf`);
    toast({ title: 'PDF exportado com sucesso!' });
  }, [escala, mes, ano, groupedProfs, localDias, days, toast, config]);

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
            {config.tituloCard}
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
                <Button size="sm" variant="outline" onClick={() => setDuplicateDialogOpen(true)}>
                  <Copy className="h-4 w-4 mr-1" /> Duplicar Escala
                </Button>
                <Button size="sm" variant="destructive" onClick={() => {
                  if (confirm(`Tem certeza que deseja excluir toda a escala de ${MESES[mes - 1]}/${ano}? Esta ação não pode ser desfeita.`)) {
                    deleteEscalaMutation.mutate();
                  }
                }} disabled={deleteEscalaMutation.isPending}>
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir Escala
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
            <div className="flex gap-2 justify-center">
              <Button onClick={() => createEscalaMutation.mutate()} disabled={createEscalaMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" /> Criar Escala Vazia
              </Button>
              <Button variant="outline" onClick={() => copyFromPreviousMonth.mutate()} disabled={copyFromPreviousMonth.isPending}>
                <Copy className="h-4 w-4 mr-2" /> Copiar do Mês Anterior
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold">{escala.unidade}</p>
              <p className="text-sm">{escala.titulo}</p>
              <p className="text-sm font-medium">MÊS: {MESES[mes - 1].toUpperCase()} {ano}</p>
            </div>

            {config.grupos.map(grupo => {
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
                          <th className="border px-1 py-1 min-w-[70px]">{config.registroLabel}</th>
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
                                        {config.setorCodes.map(s => (
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
                                <div className="flex items-center gap-0.5 justify-center">
                                  <button
                                    className="text-primary hover:text-primary/80"
                                    onClick={() => {
                                      setEditingProf(prof);
                                      setEditProfOpen(true);
                                    }}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
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
                                </div>
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
              {config.setorCodes.filter(s => s.code).map(s => (
                <Badge key={s.code} variant="outline" className={cn('text-[10px]', s.color)}>
                  {s.code} - {s.label}
                </Badge>
              ))}
            </div>

            {/* Coordenadora */}
            {escala.coordenadora_nome && (
              <div className="text-right text-xs space-y-0.5 pt-4">
                <p className="font-semibold">{escala.coordenadora_nome}</p>
                {escala.coordenadora_coren && <p>{config.registroLabel} {escala.coordenadora_coren}</p>}
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
              <Label>{config.registroLabel} *</Label>
              <Input
                value={newProf.coren}
                onChange={e => setNewProf({ ...newProf, coren: e.target.value })}
                placeholder={`Número do ${config.registroLabel}`}
              />
            </div>
            <div>
              <Label>Grupo / Turno</Label>
              <Select
                value={newProf.grupo}
                onValueChange={v => {
                  const grp = config.grupos.find(g => g.value === v);
                  setNewProf({ ...newProf, grupo: v, horario: grp?.horario || newProf.horario });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {config.grupos.map(g => (
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

      {/* Edit Professional Dialog */}
      <Dialog open={editProfOpen} onOpenChange={(open) => { setEditProfOpen(open); if (!open) setEditingProf(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Profissional</DialogTitle>
          </DialogHeader>
          {editingProf && (
            <div className="space-y-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input
                  value={editingProf.nome}
                  onChange={e => setEditingProf({ ...editingProf, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>{config.registroLabel} *</Label>
                <Input
                  value={editingProf.coren}
                  onChange={e => setEditingProf({ ...editingProf, coren: e.target.value })}
                />
              </div>
              <div>
                <Label>Grupo / Turno</Label>
                <Select
                  value={editingProf.grupo}
                  onValueChange={v => {
                    const grp = config.grupos.find(g => g.value === v);
                    setEditingProf({ ...editingProf, grupo: v, horario: grp?.horario || editingProf.horario });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {config.grupos.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Horário</Label>
                <Input
                  value={editingProf.horario}
                  onChange={e => setEditingProf({ ...editingProf, horario: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditProfOpen(false); setEditingProf(null); }}>Cancelar</Button>
            <Button
              onClick={() => editingProf && editProfMutation.mutate({ id: editingProf.id, nome: editingProf.nome, coren: editingProf.coren, grupo: editingProf.grupo, horario: editingProf.horario })}
              disabled={!editingProf?.nome || !editingProf?.coren || editProfMutation.isPending}
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Escala Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicar Escala Completa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Todos os profissionais e seus setores diários serão copiados para o mês destino. Depois, você poderá editar nomes, turnos, setores e dias livremente.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Mês Destino</Label>
              <Select value={String(targetMes)} onValueChange={v => setTargetMes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano Destino</Label>
              <Input
                type="number"
                value={targetAno}
                onChange={e => setTargetAno(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => duplicateEscalaMutation.mutate()}
              disabled={duplicateEscalaMutation.isPending}
            >
              {duplicateEscalaMutation.isPending ? 'Duplicando...' : 'Duplicar Escala'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
