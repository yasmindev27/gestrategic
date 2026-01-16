import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SECTORS } from '@/types/bed';

interface Solicitacao {
  id: string;
  numero_solicitacao: string;
  tipo: 'entrada' | 'saida';
  status: string;
  paciente_nome: string;
  paciente_idade: number | null;
  paciente_sexo: string | null;
  hipotese_diagnostica: string | null;
  cid: string | null;
  quadro_clinico: string | null;
  estabelecimento_origem: string | null;
  estabelecimento_destino: string | null;
  setor_destino: string | null;
  telefone_contato: string | null;
  medico_solicitante: string | null;
  prioridade: string;
  observacoes: string | null;
}

interface SusFacilFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'entrada' | 'saida';
  solicitacao?: Solicitacao | null;
  onSuccess: () => void;
}

const generateNumeroSolicitacao = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `SF-${year}${month}${day}-${random}`;
};

export function SusFacilFormDialog({ isOpen, onClose, tipo, solicitacao, onSuccess }: SusFacilFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    paciente_nome: '',
    paciente_idade: '',
    paciente_sexo: '',
    hipotese_diagnostica: '',
    cid: '',
    quadro_clinico: '',
    procedimentos_necessarios: '',
    estabelecimento_origem: '',
    estabelecimento_destino: '',
    setor_destino: '',
    telefone_contato: '',
    medico_solicitante: '',
    prioridade: 'media',
    observacoes: '',
  });

  useEffect(() => {
    if (solicitacao) {
      setFormData({
        paciente_nome: solicitacao.paciente_nome || '',
        paciente_idade: solicitacao.paciente_idade?.toString() || '',
        paciente_sexo: solicitacao.paciente_sexo || '',
        hipotese_diagnostica: solicitacao.hipotese_diagnostica || '',
        cid: solicitacao.cid || '',
        quadro_clinico: solicitacao.quadro_clinico || '',
        procedimentos_necessarios: '',
        estabelecimento_origem: solicitacao.estabelecimento_origem || '',
        estabelecimento_destino: solicitacao.estabelecimento_destino || '',
        setor_destino: solicitacao.setor_destino || '',
        telefone_contato: solicitacao.telefone_contato || '',
        medico_solicitante: solicitacao.medico_solicitante || '',
        prioridade: solicitacao.prioridade || 'media',
        observacoes: solicitacao.observacoes || '',
      });
    } else {
      setFormData({
        paciente_nome: '',
        paciente_idade: '',
        paciente_sexo: '',
        hipotese_diagnostica: '',
        cid: '',
        quadro_clinico: '',
        procedimentos_necessarios: '',
        estabelecimento_origem: '',
        estabelecimento_destino: '',
        setor_destino: '',
        telefone_contato: '',
        medico_solicitante: '',
        prioridade: 'media',
        observacoes: '',
      });
    }
  }, [solicitacao, isOpen]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.paciente_nome.trim()) {
      toast.error('Nome do paciente é obrigatório');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        numero_solicitacao: solicitacao?.numero_solicitacao || generateNumeroSolicitacao(),
        tipo,
        status: 'pendente',
        paciente_nome: formData.paciente_nome,
        paciente_idade: formData.paciente_idade ? parseInt(formData.paciente_idade) : null,
        paciente_sexo: formData.paciente_sexo || null,
        hipotese_diagnostica: formData.hipotese_diagnostica || null,
        cid: formData.cid || null,
        quadro_clinico: formData.quadro_clinico || null,
        procedimentos_necessarios: formData.procedimentos_necessarios || null,
        estabelecimento_origem: formData.estabelecimento_origem || null,
        estabelecimento_destino: formData.estabelecimento_destino || null,
        setor_destino: formData.setor_destino || null,
        telefone_contato: formData.telefone_contato || null,
        medico_solicitante: formData.medico_solicitante || null,
        prioridade: formData.prioridade,
        observacoes: formData.observacoes || null,
        created_by: user?.id,
      };

      if (solicitacao) {
        const { error } = await supabase
          .from('regulacao_sus_facil')
          .update(payload)
          .eq('id', solicitacao.id);
        
        if (error) throw error;
        toast.success('Solicitação atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('regulacao_sus_facil')
          .insert(payload);
        
        if (error) throw error;
        toast.success('Solicitação criada com sucesso');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar solicitação:', error);
      toast.error('Erro ao salvar solicitação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {solicitacao ? 'Editar' : 'Nova'} Solicitação de {tipo === 'entrada' ? 'Entrada' : 'Saída'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Dados do Paciente */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Dados do Paciente</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="paciente_nome">Nome do Paciente *</Label>
                <Input
                  id="paciente_nome"
                  value={formData.paciente_nome}
                  onChange={(e) => handleChange('paciente_nome', e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paciente_idade">Idade</Label>
                <Input
                  id="paciente_idade"
                  type="number"
                  value={formData.paciente_idade}
                  onChange={(e) => handleChange('paciente_idade', e.target.value)}
                  placeholder="Anos"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select value={formData.paciente_sexo} onValueChange={(v) => handleChange('paciente_sexo', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={formData.prioridade} onValueChange={(v) => handleChange('prioridade', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dados Clínicos */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Dados Clínicos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hipotese_diagnostica">Hipótese Diagnóstica</Label>
                <Input
                  id="hipotese_diagnostica"
                  value={formData.hipotese_diagnostica}
                  onChange={(e) => handleChange('hipotese_diagnostica', e.target.value)}
                  placeholder="HD principal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cid">CID</Label>
                <Input
                  id="cid"
                  value={formData.cid}
                  onChange={(e) => handleChange('cid', e.target.value)}
                  placeholder="Ex: J18.9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quadro_clinico">Quadro Clínico</Label>
              <Textarea
                id="quadro_clinico"
                value={formData.quadro_clinico}
                onChange={(e) => handleChange('quadro_clinico', e.target.value)}
                placeholder="Descreva o quadro clínico do paciente"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="procedimentos_necessarios">Procedimentos Necessários</Label>
              <Textarea
                id="procedimentos_necessarios"
                value={formData.procedimentos_necessarios}
                onChange={(e) => handleChange('procedimentos_necessarios', e.target.value)}
                placeholder="Procedimentos ou cuidados necessários"
                rows={2}
              />
            </div>
          </div>

          {/* Origem/Destino */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">
              {tipo === 'entrada' ? 'Origem da Solicitação' : 'Destino da Transferência'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tipo === 'entrada' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="estabelecimento_origem">Estabelecimento de Origem</Label>
                    <Input
                      id="estabelecimento_origem"
                      value={formData.estabelecimento_origem}
                      onChange={(e) => handleChange('estabelecimento_origem', e.target.value)}
                      placeholder="Nome do hospital/UPA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Setor de Destino</Label>
                    <Select value={formData.setor_destino} onValueChange={(v) => handleChange('setor_destino', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTORS.map((sector) => (
                          <SelectItem key={sector.id} value={sector.id}>
                            {sector.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="estabelecimento_destino">Estabelecimento de Destino</Label>
                    <Input
                      id="estabelecimento_destino"
                      value={formData.estabelecimento_destino}
                      onChange={(e) => handleChange('estabelecimento_destino', e.target.value)}
                      placeholder="Nome do hospital/UPA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setor_destino">Setor de Destino</Label>
                    <Input
                      id="setor_destino"
                      value={formData.setor_destino}
                      onChange={(e) => handleChange('setor_destino', e.target.value)}
                      placeholder="UTI, Enfermaria, etc."
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Informações de Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medico_solicitante">Médico Solicitante</Label>
                <Input
                  id="medico_solicitante"
                  value={formData.medico_solicitante}
                  onChange={(e) => handleChange('medico_solicitante', e.target.value)}
                  placeholder="Nome do médico"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone_contato">Telefone de Contato</Label>
                <Input
                  id="telefone_contato"
                  value={formData.telefone_contato}
                  onChange={(e) => handleChange('telefone_contato', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Informações adicionais"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar Solicitação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
