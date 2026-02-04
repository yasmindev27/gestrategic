import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCriarEscala } from '@/hooks/useEnfermagem';
import { supabase } from '@/integrations/supabase/client';
import { TIPOS_PLANTAO } from './types';

interface NovaEscalaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  creatorId: string;
}

interface Profile {
  user_id: string;
  full_name: string;
  setor: string | null;
}

interface ProfissionalSaude {
  id: string;
  nome: string;
  user_id: string | null;
  especialidade: string | null;
}

export function NovaEscalaDialog({ open, onOpenChange, selectedDate, creatorId }: NovaEscalaDialogProps) {
  const criarEscala = useCriarEscala();
  const [profissionaisSaude, setProfissionaisSaude] = useState<ProfissionalSaude[]>([]);
  const [profissionaisProfiles, setProfissionaisProfiles] = useState<Profile[]>([]);
  const [usarCadastroRH, setUsarCadastroRH] = useState(true);
  const [setores, setSetores] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    profissional_id: '',
    profissional_nome: '',
    setor: '',
    data_plantao: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    hora_inicio: '07:00',
    hora_fim: '19:00',
    tipo_plantao: 'diurno' as const,
    observacoes: '',
  });

  useEffect(() => {
    if (selectedDate) {
      setForm(prev => ({ ...prev, data_plantao: format(selectedDate, 'yyyy-MM-dd') }));
    }
  }, [selectedDate]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Carregar profissionais de saúde do RH (tipo enfermagem)
        const { data: profSaude } = await supabase
          .from('profissionais_saude')
          .select('id, nome, user_id, especialidade')
          .eq('tipo', 'enfermagem')
          .eq('status', 'ativo')
          .order('nome');

        if (profSaude && profSaude.length > 0) {
          setProfissionaisSaude(profSaude);
          setUsarCadastroRH(true);
        } else {
          // Fallback: carregar do profiles se não houver cadastro no RH
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, setor')
            .order('full_name');

          if (profiles) {
            setProfissionaisProfiles(profiles);
          }
          setUsarCadastroRH(false);
        }

        // Carregar setores
        const { data: setoresData } = await supabase
          .from('setores')
          .select('nome')
          .eq('ativo', true)
          .order('nome');

        if (setoresData) {
          setSetores(setoresData.map(s => s.nome));
        }
      } finally {
        setLoading(false);
      }
    }

    if (open) {
      loadData();
    }
  }, [open]);

  const handleTipoChange = (tipo: string) => {
    let horaInicio = '07:00';
    let horaFim = '19:00';

    switch (tipo) {
      case 'diurno':
        horaInicio = '07:00';
        horaFim = '19:00';
        break;
      case 'noturno':
        horaInicio = '19:00';
        horaFim = '07:00';
        break;
      case '12x36':
        horaInicio = '07:00';
        horaFim = '19:00';
        break;
      case 'extra':
      case 'cobertura':
        // Manter horários personalizáveis
        break;
    }

    setForm(prev => ({
      ...prev,
      tipo_plantao: tipo as typeof form.tipo_plantao,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
    }));
  };

  const handleProfissionalChange = (value: string) => {
    if (usarCadastroRH) {
      const prof = profissionaisSaude.find(p => p.id === value);
      setForm(prev => ({
        ...prev,
        profissional_id: prof?.user_id || value, // Usar user_id se vinculado
        profissional_nome: prof?.nome || '',
        setor: prev.setor,
      }));
    } else {
      const prof = profissionaisProfiles.find(p => p.user_id === value);
      setForm(prev => ({
        ...prev,
        profissional_id: value,
        profissional_nome: prof?.full_name || '',
        setor: prof?.setor || prev.setor,
      }));
    }
  };

  const handleSubmit = () => {
    if (!form.profissional_id || !form.setor || !form.data_plantao) {
      return;
    }

    criarEscala.mutate({
      profissional_id: form.profissional_id,
      profissional_nome: form.profissional_nome,
      setor: form.setor,
      data_plantao: form.data_plantao,
      hora_inicio: form.hora_inicio,
      hora_fim: form.hora_fim,
      tipo_plantao: form.tipo_plantao,
      status: 'confirmado',
      observacoes: form.observacoes || undefined,
      created_by: creatorId,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setForm({
          profissional_id: '',
          profissional_nome: '',
          setor: '',
          data_plantao: '',
          hora_inicio: '07:00',
          hora_fim: '19:00',
          tipo_plantao: 'diurno',
          observacoes: '',
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Nova Escala de Plantão
          </DialogTitle>
          <DialogDescription>
            Adicione um novo plantão à escala de enfermagem.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="profissional">Profissional</Label>
            <Select
              value={usarCadastroRH 
                ? profissionaisSaude.find(p => p.user_id === form.profissional_id || p.id === form.profissional_id)?.id || ''
                : form.profissional_id
              }
              onValueChange={handleProfissionalChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {usarCadastroRH ? (
                  profissionaisSaude.map(prof => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.nome} {prof.especialidade && `(${prof.especialidade})`}
                    </SelectItem>
                  ))
                ) : (
                  profissionaisProfiles.map(prof => (
                    <SelectItem key={prof.user_id} value={prof.user_id}>
                      {prof.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {usarCadastroRH && profissionaisSaude.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum profissional de enfermagem cadastrado no RH.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="setor">Setor</Label>
            <Select
              value={form.setor}
              onValueChange={(value) => setForm(prev => ({ ...prev, setor: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {setores.map(setor => (
                  <SelectItem key={setor} value={setor}>
                    {setor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tipo_plantao">Tipo de Plantão</Label>
            <Select
              value={form.tipo_plantao}
              onValueChange={handleTipoChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_PLANTAO.map(tipo => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="data_plantao">Data do Plantão</Label>
            <Input
              id="data_plantao"
              type="date"
              value={form.data_plantao}
              onChange={(e) => setForm(prev => ({ ...prev, data_plantao: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="hora_inicio">Hora Início</Label>
              <Input
                id="hora_inicio"
                type="time"
                value={form.hora_inicio}
                onChange={(e) => setForm(prev => ({ ...prev, hora_inicio: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hora_fim">Hora Fim</Label>
              <Input
                id="hora_fim"
                type="time"
                value={form.hora_fim}
                onChange={(e) => setForm(prev => ({ ...prev, hora_fim: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Informações adicionais..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={criarEscala.isPending || !form.profissional_id || !form.setor || !form.data_plantao}
          >
            Criar Escala
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
