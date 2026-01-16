import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Building, 
  Phone, 
  FileText,
  AlertTriangle,
  Stethoscope
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Solicitacao {
  id: string;
  numero_solicitacao: string;
  tipo: 'entrada' | 'saida';
  status: 'pendente' | 'aprovada' | 'negada' | 'cancelada' | 'efetivada';
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
  regulador_responsavel: string | null;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  data_solicitacao: string;
  data_resposta: string | null;
  observacoes: string | null;
}

interface SusFacilDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: Solicitacao | null;
  onUpdate: () => void;
}

const statusConfig = {
  pendente: { label: 'Pendente', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  aprovada: { label: 'Aprovada', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle },
  negada: { label: 'Negada', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  cancelada: { label: 'Cancelada', color: 'bg-muted text-muted-foreground border-muted', icon: XCircle },
  efetivada: { label: 'Efetivada', color: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle },
};

const prioridadeConfig = {
  baixa: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  media: { label: 'Média', color: 'bg-info/10 text-info' },
  alta: { label: 'Alta', color: 'bg-warning/10 text-warning' },
  urgente: { label: 'Urgente', color: 'bg-destructive/10 text-destructive' },
};

export function SusFacilDetailDialog({ isOpen, onClose, solicitacao, onUpdate }: SusFacilDetailDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [justificativa, setJustificativa] = useState('');

  if (!solicitacao) return null;

  const StatusIcon = statusConfig[solicitacao.status].icon;

  const handleUpdateStatus = async (newStatus: 'aprovada' | 'negada' | 'efetivada' | 'cancelada') => {
    if (newStatus === 'negada' && !justificativa.trim()) {
      toast.error('Justificativa é obrigatória para negar a solicitação');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user?.id)
        .single();

      const updateData: Record<string, unknown> = {
        status: newStatus,
        data_resposta: new Date().toISOString(),
        regulador_responsavel: profile?.full_name || 'Regulador',
        updated_by: user?.id,
      };

      if (newStatus === 'negada') {
        updateData.justificativa_negativa = justificativa;
      }

      if (newStatus === 'efetivada') {
        updateData.data_efetivacao = new Date().toISOString();
      }

      const { error } = await supabase
        .from('regulacao_sus_facil')
        .update(updateData)
        .eq('id', solicitacao.id);

      if (error) throw error;

      toast.success(`Solicitação ${statusConfig[newStatus].label.toLowerCase()} com sucesso`);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes da Solicitação</span>
            <Badge variant="outline" className={statusConfig[solicitacao.status].color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig[solicitacao.status].label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Header Info */}
          <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Número da Solicitação</p>
              <p className="font-mono font-semibold">{solicitacao.numero_solicitacao}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Data da Solicitação</p>
              <p className="font-semibold">
                {format(new Date(solicitacao.data_solicitacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Tipo e Prioridade */}
          <div className="flex gap-3">
            <Badge variant={solicitacao.tipo === 'entrada' ? 'default' : 'secondary'} className="text-sm">
              {solicitacao.tipo === 'entrada' ? '↓ Entrada' : '↑ Saída'}
            </Badge>
            <Badge className={prioridadeConfig[solicitacao.prioridade].color}>
              {solicitacao.prioridade === 'urgente' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {prioridadeConfig[solicitacao.prioridade].label}
            </Badge>
          </div>

          <Separator />

          {/* Dados do Paciente */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Dados do Paciente
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nome</p>
                <p className="font-medium">{solicitacao.paciente_nome}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Idade / Sexo</p>
                <p className="font-medium">
                  {solicitacao.paciente_idade ? `${solicitacao.paciente_idade} anos` : '-'} / {' '}
                  {solicitacao.paciente_sexo === 'masculino' ? 'M' : solicitacao.paciente_sexo === 'feminino' ? 'F' : '-'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dados Clínicos */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Dados Clínicos
            </h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Hipótese Diagnóstica</p>
                  <p className="font-medium">{solicitacao.hipotese_diagnostica || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CID</p>
                  <p className="font-medium">{solicitacao.cid || '-'}</p>
                </div>
              </div>
              {solicitacao.quadro_clinico && (
                <div>
                  <p className="text-muted-foreground">Quadro Clínico</p>
                  <p className="font-medium">{solicitacao.quadro_clinico}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Origem/Destino */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              {solicitacao.tipo === 'entrada' ? 'Origem' : 'Destino'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {solicitacao.tipo === 'entrada' ? (
                <>
                  <div>
                    <p className="text-muted-foreground">Estabelecimento de Origem</p>
                    <p className="font-medium">{solicitacao.estabelecimento_origem || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Setor de Destino</p>
                    <p className="font-medium">{solicitacao.setor_destino || '-'}</p>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-muted-foreground">Estabelecimento de Destino</p>
                  <p className="font-medium">{solicitacao.estabelecimento_destino || '-'}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Contato */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              Contato
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Médico Solicitante</p>
                <p className="font-medium">{solicitacao.medico_solicitante || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Telefone</p>
                <p className="font-medium">{solicitacao.telefone_contato || '-'}</p>
              </div>
            </div>
          </div>

          {/* Observações */}
          {solicitacao.observacoes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Observações
                </h3>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{solicitacao.observacoes}</p>
              </div>
            </>
          )}

          {/* Ações para Pendentes */}
          {solicitacao.status === 'pendente' && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold">Ações do Regulador</h3>
                <div className="space-y-2">
                  <Label htmlFor="justificativa">Justificativa (obrigatória para negar)</Label>
                  <Textarea
                    id="justificativa"
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    placeholder="Motivo da decisão..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleUpdateStatus('aprovada')} 
                    disabled={isLoading}
                    className="flex-1 bg-success hover:bg-success/90"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                  <Button 
                    onClick={() => handleUpdateStatus('negada')} 
                    disabled={isLoading}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Negar
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Efetivar Aprovada */}
          {solicitacao.status === 'aprovada' && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold">Efetivar Transferência</h3>
                <Button 
                  onClick={() => handleUpdateStatus('efetivada')} 
                  disabled={isLoading}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Efetivação
                </Button>
              </div>
            </>
          )}

          {/* Info do Regulador */}
          {solicitacao.regulador_responsavel && (
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="text-muted-foreground">
                Regulado por: <span className="font-medium text-foreground">{solicitacao.regulador_responsavel}</span>
                {solicitacao.data_resposta && (
                  <> em {format(new Date(solicitacao.data_resposta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                )}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
