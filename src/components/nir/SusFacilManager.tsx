import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SusFacilFormDialog } from './SusFacilFormDialog';
import { SusFacilDetailDialog } from './SusFacilDetailDialog';

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

export function SusFacilManager() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<'entrada' | 'saida'>('entrada');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<Solicitacao | null>(null);
  const [formType, setFormType] = useState<'entrada' | 'saida'>('entrada');

  useEffect(() => {
    loadSolicitacoes();
  }, []);

  const loadSolicitacoes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('regulacao_sus_facil')
        .select('*')
        .order('data_solicitacao', { ascending: false });

      if (error) throw error;
      
      // Type assertion to handle string literals
      const typedData = (data || []).map(item => ({
        ...item,
        tipo: item.tipo as 'entrada' | 'saida',
        status: item.status as 'pendente' | 'aprovada' | 'negada' | 'cancelada' | 'efetivada',
        prioridade: item.prioridade as 'baixa' | 'media' | 'alta' | 'urgente',
      }));
      
      setSolicitacoes(typedData);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForm = (tipo: 'entrada' | 'saida') => {
    setFormType(tipo);
    setSelectedSolicitacao(null);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (solicitacao: Solicitacao) => {
    setSelectedSolicitacao(solicitacao);
    setIsDetailOpen(true);
  };

  const filteredSolicitacoes = solicitacoes.filter(s => {
    const matchesTipo = s.tipo === activeTab;
    const matchesSearch = 
      s.paciente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.numero_solicitacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.estabelecimento_origem?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (s.estabelecimento_destino?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesStatus = statusFilter === 'todos' || s.status === statusFilter;
    
    return matchesTipo && matchesSearch && matchesStatus;
  });

  const countByStatus = (tipo: 'entrada' | 'saida') => {
    const tipoSolicitacoes = solicitacoes.filter(s => s.tipo === tipo);
    return {
      total: tipoSolicitacoes.length,
      pendentes: tipoSolicitacoes.filter(s => s.status === 'pendente').length,
      aprovadas: tipoSolicitacoes.filter(s => s.status === 'aprovada').length,
      efetivadas: tipoSolicitacoes.filter(s => s.status === 'efetivada').length,
    };
  };

  const entradaStats = countByStatus('entrada');
  const saidaStats = countByStatus('saida');

  return (
    <div className="space-y-6">
      {/* Header com KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-success">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <ArrowDownLeft className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entradas Pendentes</p>
                <p className="text-2xl font-bold">{entradaStats.pendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <ArrowUpRight className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saídas Pendentes</p>
                <p className="text-2xl font-bold">{saidaStats.pendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Efetivadas Hoje</p>
                <p className="text-2xl font-bold">
                  {solicitacoes.filter(s => 
                    s.status === 'efetivada' && 
                    s.data_resposta?.startsWith(new Date().toISOString().split('T')[0])
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Urgentes</p>
                <p className="text-2xl font-bold">
                  {solicitacoes.filter(s => s.prioridade === 'urgente' && s.status === 'pendente').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs e Ações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Central de Regulação - SUS Fácil
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={loadSolicitacoes} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={() => handleOpenForm('entrada')} size="sm" className="bg-success hover:bg-success/90">
                <ArrowDownLeft className="h-4 w-4 mr-2" />
                Nova Entrada
              </Button>
              <Button onClick={() => handleOpenForm('saida')} size="sm" variant="outline">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Nova Saída
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'entrada' | 'saida')}>
            <TabsList className="mb-4">
              <TabsTrigger value="entrada" className="gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Solicitações de Entrada
                <Badge variant="secondary">{entradaStats.total}</Badge>
              </TabsTrigger>
              <TabsTrigger value="saida" className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Solicitações de Saída
                <Badge variant="secondary">{saidaStats.total}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, número ou estabelecimento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="negada">Negada</SelectItem>
                  <SelectItem value="efetivada">Efetivada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="entrada">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredSolicitacoes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma solicitação de entrada encontrada</p>
                </div>
              ) : (
                <SolicitacaoList 
                  solicitacoes={filteredSolicitacoes} 
                  onOpenDetail={handleOpenDetail}
                />
              )}
            </TabsContent>

            <TabsContent value="saida">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredSolicitacoes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma solicitação de saída encontrada</p>
                </div>
              ) : (
                <SolicitacaoList 
                  solicitacoes={filteredSolicitacoes} 
                  onOpenDetail={handleOpenDetail}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SusFacilFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        tipo={formType}
        solicitacao={selectedSolicitacao}
        onSuccess={loadSolicitacoes}
      />

      <SusFacilDetailDialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        solicitacao={selectedSolicitacao}
        onUpdate={loadSolicitacoes}
      />
    </div>
  );
}

interface SolicitacaoListProps {
  solicitacoes: Solicitacao[];
  onOpenDetail: (s: Solicitacao) => void;
}

function SolicitacaoList({ solicitacoes, onOpenDetail }: SolicitacaoListProps) {
  return (
    <div className="space-y-3">
      {solicitacoes.map((s) => {
        const StatusIcon = statusConfig[s.status].icon;
        
        return (
          <div
            key={s.id}
            onClick={() => onOpenDetail(s)}
            className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm text-muted-foreground">
                    {s.numero_solicitacao}
                  </span>
                  <Badge className={prioridadeConfig[s.prioridade].color}>
                    {prioridadeConfig[s.prioridade].label}
                  </Badge>
                  <Badge variant="outline" className={statusConfig[s.status].color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig[s.status].label}
                  </Badge>
                </div>
                <p className="font-semibold text-foreground">{s.paciente_nome}</p>
                <p className="text-sm text-muted-foreground">
                  {s.hipotese_diagnostica || 'Sem hipótese diagnóstica'}
                </p>
              </div>
              
              <div className="flex flex-col items-end gap-1 text-sm">
                {s.tipo === 'entrada' ? (
                  <span className="text-muted-foreground">
                    De: <span className="text-foreground">{s.estabelecimento_origem || '-'}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Para: <span className="text-foreground">{s.estabelecimento_destino || '-'}</span>
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(s.data_solicitacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
