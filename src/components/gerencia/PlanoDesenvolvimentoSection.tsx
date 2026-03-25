import { useState, useMemo, useEffect, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Star, Download, Edit, Plus, Save, X, Wand2, Users, TrendingUp, Award } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createStandardPdf, savePdfWithFooter } from '@/lib/export-utils';
import autoTable from 'jspdf-autotable';

interface AvaliacaoSalva {
  id: string;
  colaborador: string;
  cargo: string;
  avaliador: string;
  data_avaliacao: string;
  nota_geral: number;
  pontos_fortes: string;
  oportunidades: string;
  acoes_desenvolvimento: Array<{ competencia: string; acao: string; prazo: string }>;
}

interface Atestado {
  data_inicio: string;
  data_fim: string;
  dias_afastamento: number;
  tipo: string;
  status: string;
}

interface BancoHora {
  data: string;
  tipo: string;
  horas: number;
  motivo: string;
}

interface DISCData {
  perfil_predominante: string;
  perfil_secundario: string;
  leadership_score: number;
  experiencia_lideranca: string;
  score_d: number;
  score_i: number;
  score_s: number;
  score_c: number;
}

interface PlanoDesenvolvimento {
  id: string;
  colaborador_nome: string;
  avaliacao_id: string;
  data_criacao: string;
  data_proxima_revisao: string;
  template_versao: 'ona_nivel1';
  
  // Seção 1: Identificação
  objetivo_geral: string;
  periodo_execucao_inicio: string;
  periodo_execucao_fim: string;
  
  // Seção 2: Competências
  competencia_principal: string;
  competencia_secundaria: string;
  
  // Seção 3: ONA Nível 1 - Estrutura
  ambiente_trabalho: string; // Como está o ambiente de trabalho?
  recursos_disponiveis: string; // Quais recursos estão disponíveis?
  
  // Seção 4: ONA Nível 1 - Processo
  fluxo_atividades: string; // Como é o fluxo de suas atividades?
  pontos_melhorias: string; // Quais pontos precisam melhorar?
  
  // Seção 5: ONA Nível 1 - Resultado
  indicadores_sucesso: string; // Qual será a forma de verificar o sucesso?
  meta_esperada: string; // Qual é a meta esperada?
  
  // Seção 6: Ações
  acoes_detalhadas: Array<{
    id: string;
    competencia: string;
    acao: string;
    responsavel: string;
    prazo: string;
    indicador_medida: string;
  }>;
  
  status: 'rascunho' | 'em_execucao' | 'concluido';
  criado_por: string;
}

const ONA_TEMPLATE_SEÇÕES = {
  estrutura: {
    titulo: '1. DIMENSÃO ESTRUTURA (Requisitos)',
    descricao: 'Como estão organizados os recursos (ambiente, materiais, tecnologia)?',
    perguntas: [
      'Qual é o ambiente de trabalho disponível?',
      'Quais recursos (materiais, tecnológicos, humanos) estão disponíveis?',
      'Como está estruturado o fornecimento de insumos necessários?',
    ],
  },
  processo: {
    titulo: '2. DIMENSÃO PROCESSO (Organização)',
    descricao: 'Como os processos são organizados e executados?',
    perguntas: [
      'Como as atividades estão organizadas e sequenciadas?',
      'Qual é o fluxo de trabalho e comunicação entre setores?',
      'Quais pontos de falha ou melhoria foram identificados?',
    ],
  },
  resultado: {
    titulo: '3. DIMENSÃO RESULTADO (Efetividade)',
    descricao: 'Qual é o impacto esperado das ações?',
    perguntas: [
      'Qual será a forma de verificar o sucesso das ações?',
      'Quais indicadores de desempenho serão monitorados?',
      'Qual é a meta esperada e o prazo de alcance?',
    ],
  },
};

const PlanoDesenvolvimentoSectionContent = () => {
  const queryClient = useQueryClient();
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<string | null>(null);
  const [editandoPlano, setEditandoPlano] = useState<PlanoDesenvolvimento | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [periodo, setPeriodo] = useState({
    mes: format(new Date(), 'MMMM').toLowerCase(),
    ano: new Date().getFullYear().toString(),
  });

  // Buscar avaliações com nota > 4.8
  const { data: avaliacoesAltas, isLoading: loadingAvaliacoes } = useQuery({
    queryKey: ['avaliacoes-altas'],
    staleTime: 5 * 60 * 1000, // 5 min - evita refetch ao trocar aba
    gcTime: 30 * 60 * 1000, // 30 min
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avaliacoes_desempenho')
        .select('*')
        .gt('nota_geral', 4.8)
        .order('data_avaliacao', { ascending: false });
      if (error) throw error;
      return ((data || []) as unknown as Array<Record<string, any>>).map(d => ({
        id: d.id,
        colaborador: d.colaborador,
        cargo: d.cargo,
        avaliador: d.avaliador,
        data_avaliacao: d.data_avaliacao,
        nota_geral: d.nota_geral,
        pontos_fortes: d.pontos_fortes || '',
        oportunidades: d.oportunidades || '',
        acoes_desenvolvimento: Array.isArray(d.acoes_desenvolvimento) ? d.acoes_desenvolvimento : [],
      }));
    },
  });

  // Buscar dados do colaborador selecionado
  const { data: colaboradorData, isLoading: loadingColaborador } = useQuery({
    queryKey: ['colaborador-detalhes', colaboradorSelecionado],
    staleTime: 5 * 60 * 1000, // 5 min - evita refetch ao trocar aba
    gcTime: 30 * 60 * 1000, // 30 min
    queryFn: async () => {
      if (!colaboradorSelecionado) return null;

      const avaliacao = avaliacoesAltas?.find(a => a.colaborador === colaboradorSelecionado);
      if (!avaliacao) return null;

      // Buscar atestados
      const { data: atestados } = await supabase
        .from('atestados')
        .select('*')
        .eq('funcionario_nome', colaboradorSelecionado)
        .order('data_inicio', { ascending: false })
        .limit(5);

      // Buscar banco de horas
      const { data: bancoHoras } = await supabase
        .from('banco_horas')
        .select('*')
        .eq('funcionario_nome', colaboradorSelecionado)
        .order('data', { ascending: false })
        .limit(10);

      // Buscar plano de desenvolvimento existente
      const { data: planosExistentes } = await (supabase as any)
        .from('planos_desenvolvimento')
        .select('*')
        .eq('colaborador_nome', colaboradorSelecionado)
        .order('data_criacao', { ascending: false })
        .limit(1);

      // Buscar dados DISC de liderança
      const { data: discData } = await (supabase as any)
        .from('disc_results')
        .select('*')
        .eq('colaborador', colaboradorSelecionado)
        .order('created_at', { ascending: false })
        .limit(1);

      return {
        avaliacao,
        atestados: (atestados || []) as Atestado[],
        bancoHoras: (bancoHoras || []) as BancoHora[],
        planoExistente: planosExistentes?.[0] as PlanoDesenvolvimento | undefined,
        disc: discData?.[0] as DISCData | undefined,
      };
    },
    enabled: !!colaboradorSelecionado && !!avaliacoesAltas,
  });

  const handleNovoPlano = () => {
    if (!colaboradorData?.avaliacao) return;
    
    const novoPlano: PlanoDesenvolvimento = {
      id: crypto.randomUUID(),
      colaborador_nome: colaboradorData.avaliacao.colaborador,
      avaliacao_id: colaboradorData.avaliacao.id,
      data_criacao: format(new Date(), 'yyyy-MM-dd'),
      data_proxima_revisao: format(new Date().setMonth(new Date().getMonth() + 3), 'yyyy-MM-dd'),
      template_versao: 'ona_nivel1',
      
      objetivo_geral: '',
      periodo_execucao_inicio: format(new Date(), 'yyyy-MM-dd'),
      periodo_execucao_fim: format(new Date().setMonth(new Date().getMonth() + 3), 'yyyy-MM-dd'),
      
      competencia_principal: colaboradorData.avaliacao.oportunidades || '',
      competencia_secundaria: '',
      
      ambiente_trabalho: '',
      recursos_disponiveis: '',
      fluxo_atividades: '',
      pontos_melhorias: '',
      indicadores_sucesso: '',
      meta_esperada: '',
      
      acoes_detalhadas: [
        { id: '1', competencia: '', acao: '', responsavel: '', prazo: '', indicador_medida: '' },
      ],
      
      status: 'rascunho',
      criado_por: 'system',
    };

    setEditandoPlano(novoPlano);
    setDialogAberto(true);
  };

  const handleGerarComIA = async () => {
    if (!colaboradorData?.avaliacao) return;
    
    setGerando(true);
    try {
      // Simular chamada à IA (integração futura com Claude/OpenAI)
      const prompt = `Gere um Plano de Desenvolvimento baseado em ONA Nível 1 para:
      
Colaborador: ${colaboradorData.avaliacao.colaborador}
Cargo: ${colaboradorData.avaliacao.cargo}
Nota de Avaliação: ${colaboradorData.avaliacao.nota_geral}

Pontos Fortes: ${colaboradorData.avaliacao.pontos_fortes}
Oportunidades: ${colaboradorData.avaliacao.oportunidades}

Gere respostas para cada dimensão:
1. ESTRUTURA: ambiente e recursos disponíveis
2. PROCESSO: fluxo de atividades e pontos de melhoria
3. RESULTADO: indicadores e metas

Responda em JSON com as chaves: ambiente_trabalho, recursos_disponiveis, fluxo_atividades, pontos_melhorias, indicadores_sucesso, meta_esperada`;

      // TODO: Integração real com API de IA
      toast.info('Integração com IA em desenvolvimento');
    } catch (error) {
      toast.error('Erro ao gerar plano com IA');
    } finally {
      setGerando(false);
    }
  };

  const handleSalvarPlano = async () => {
    if (!editandoPlano) return;

    try {
      const { error } = await (supabase as any)
        .from('planos_desenvolvimento')
        .upsert({
          id: editandoPlano.id,
          colaborador_nome: editandoPlano.colaborador_nome,
          avaliacao_id: editandoPlano.avaliacao_id,
          data_criacao: editandoPlano.data_criacao,
          data_proxima_revisao: editandoPlano.data_proxima_revisao,
          template_versao: editandoPlano.template_versao,
          objetivo_geral: editandoPlano.objetivo_geral,
          periodo_execucao_inicio: editandoPlano.periodo_execucao_inicio,
          periodo_execucao_fim: editandoPlano.periodo_execucao_fim,
          competencia_principal: editandoPlano.competencia_principal,
          competencia_secundaria: editandoPlano.competencia_secundaria,
          ambiente_trabalho: editandoPlano.ambiente_trabalho,
          recursos_disponiveis: editandoPlano.recursos_disponiveis,
          fluxo_atividades: editandoPlano.fluxo_atividades,
          pontos_melhorias: editandoPlano.pontos_melhorias,
          indicadores_sucesso: editandoPlano.indicadores_sucesso,
          meta_esperada: editandoPlano.meta_esperada,
          acoes_detalhadas: editandoPlano.acoes_detalhadas,
          status: editandoPlano.status,
          criado_por: editandoPlano.criado_por,
        });

      if (error) throw error;
      
      toast.success('Plano salvo com sucesso!');
      setDialogAberto(false);
      setEditandoPlano(null);
      
      // Recarregar dados do colaborador
      if (colaboradorSelecionado) {
        queryClient.invalidateQueries({ queryKey: ['colaborador-detalhes', colaboradorSelecionado] });
      }
    } catch (error) {
      toast.error('Erro ao salvar plano');
      console.error(error);
    }
  };

  const handleExportarIndividual = async () => {
    if (!editandoPlano || !colaboradorData?.avaliacao) return;

    try {
      const { doc, logoImg } = await createStandardPdf(
        `Plano de Desenvolvimento Individual - ${editandoPlano.colaborador_nome}`,
        'portrait'
      );

      let y = 32;
      const pageWidth = doc.internal.pageSize.width;

      // Header
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('PLANO DE DESENVOLVIMENTO INDIVIDUAL (PDI)', 14, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Colaborador: ${editandoPlano.colaborador_nome}`, 14, y);
      y += 5;
      doc.text(`Cargo: ${colaboradorData.avaliacao.cargo}`, 14, y);
      y += 5;
      doc.text(`Data: ${format(new Date(editandoPlano.data_criacao), 'dd/MM/yyyy')}`, 14, y);
      y += 5;
      doc.text(`Nota de Avaliação: ${colaboradorData.avaliacao.nota_geral.toFixed(2)}`, 14, y);
      y += 8;

      // Objetivo Geral
      doc.setFont('helvetica', 'bold');
      doc.text('OBJETIVO GERAL', 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const objetovoText = doc.splitTextToSize(editandoPlano.objetivo_geral || '—', pageWidth - 28);
      doc.text(objetovoText, 14, y);
      y += objetovoText.length * 4 + 5;

      // Dimensões ONA
      ['estrutura', 'processo', 'resultado'].forEach((dim: string) => {
        const secao = ONA_TEMPLATE_SEÇÕES[dim as keyof typeof ONA_TEMPLATE_SEÇÕES];
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(secao.titulo, 14, y);
        y += 5;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        const textChunks = doc.splitTextToSize(secao.descricao, pageWidth - 28);
        doc.text(textChunks, 14, y);
        y += textChunks.length * 4 + 3;

        let fieldValue = '';
        switch (dim) {
          case 'estrutura':
            fieldValue = `Ambiente: ${editandoPlano.ambiente_trabalho}\nRecursos: ${editandoPlano.recursos_disponiveis}`;
            break;
          case 'processo':
            fieldValue = `Fluxo: ${editandoPlano.fluxo_atividades}\nMelhorias: ${editandoPlano.pontos_melhorias}`;
            break;
          case 'resultado':
            fieldValue = `Indicadores: ${editandoPlano.indicadores_sucesso}\nMeta: ${editandoPlano.meta_esperada}`;
            break;
        }

        const fieldText = doc.splitTextToSize(fieldValue, pageWidth - 28);
        doc.text(fieldText, 14, y);
        y += fieldText.length * 4 + 8;

        if (y > doc.internal.pageSize.height - 40) {
          doc.addPage();
          y = 32;
        }
      });

      // Ações
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('AÇÕES DETALHADAS', 14, y);
      y += 8;

      const acoesRows = editandoPlano.acoes_detalhadas.map(a => [
        a.competencia,
        a.acao,
        a.responsavel,
        a.prazo,
        a.indicador_medida,
      ]);

      autoTable(doc, {
        head: [['Competência', 'Ação', 'Responsável', 'Prazo', 'Indicador']],
        body: acoesRows,
        startY: y,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        margin: { bottom: 28 },
      });

      savePdfWithFooter(doc, `PDI_${editandoPlano.colaborador_nome.replace(/\s+/g, '_')}`, 'plano_desenvolvimento', logoImg);
      toast.success('Plano exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar plano');
    }
  };

  if (loadingAvaliacoes) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const colaboradoresComNotaAlta = avaliacoesAltas?.filter(a => a.nota_geral > 4.8) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Plano de Desenvolvimento
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Colaboradores com nota de avaliação acima de 4.8
          </p>
        </CardHeader>
      </Card>

      {/* Seleção de Colaborador */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selecionar Colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="mb-2 block">Colaborador</Label>
              <Select value={colaboradorSelecionado || ''} onValueChange={setColaboradorSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um colaborador..." />
                </SelectTrigger>
                <SelectContent>
                  {colaboradoresComNotaAlta.map(c => (
                    <SelectItem key={c.id} value={c.colaborador}>
                      {c.colaborador} - {c.nota_geral.toFixed(2)} ⭐
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalhes do Colaborador */}
      {colaboradorSelecionado && loadingColaborador ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : colaboradorData ? (
        <div className="space-y-6">
          {/* Resumo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{colaboradorData.avaliacao.colaborador}</span>
                <Badge className="bg-yellow-500">Nota: {colaboradorData.avaliacao.nota_geral.toFixed(2)}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{colaboradorData.avaliacao.cargo}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Pontos Fortes</h4>
                  <p className="text-sm text-muted-foreground">{colaboradorData.avaliacao.pontos_fortes}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">Oportunidades</h4>
                  <p className="text-sm text-muted-foreground">{colaboradorData.avaliacao.oportunidades}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Atestados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atestados Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {colaboradorData.atestados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem atestados recentes</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colaboradorData.atestados.slice(0, 5).map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">
                          {format(new Date(a.data_inicio), 'dd/MM/yy')} a {format(new Date(a.data_fim), 'dd/MM/yy')}
                        </TableCell>
                        <TableCell>{a.dias_afastamento}d</TableCell>
                        <TableCell className="text-sm capitalize">{a.tipo}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{a.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Banco de Horas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Banco de Horas</CardTitle>
            </CardHeader>
            <CardContent>
              {colaboradorData.bancoHoras.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem registros</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colaboradorData.bancoHoras.slice(0, 5).map((b, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{format(new Date(b.data), 'dd/MM/yy')}</TableCell>
                        <TableCell>
                          <Badge variant={b.tipo === 'credito' ? 'secondary' : 'outline'} className="text-xs">
                            {b.tipo === 'credito' ? 'Crédito' : 'Débito'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{Math.abs(b.horas)}h</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.motivo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Dados de Liderança DISC */}
          {colaboradorData.disc && (
            <Card className={colaboradorData.disc.leadership_score >= 35 ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Perfil de Liderança (DISC)
                  {colaboradorData.disc.experiencia_lideranca?.includes('Sim') && (
                    <Badge className="ml-auto bg-blue-600">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Líder Ativo
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Perfil Predominante</p>
                    <p className="text-lg font-bold">{colaboradorData.disc.perfil_predominante || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Perfil Secundário</p>
                    <p className="text-lg font-bold">{colaboradorData.disc.perfil_secundario || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 bg-gray-100 rounded text-center">
                    <p className="text-xs text-muted-foreground">D</p>
                    <p className="font-bold">{colaboradorData.disc.score_d}</p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded text-center">
                    <p className="text-xs text-muted-foreground">I</p>
                    <p className="font-bold">{colaboradorData.disc.score_i}</p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded text-center">
                    <p className="text-xs text-muted-foreground">S</p>
                    <p className="font-bold">{colaboradorData.disc.score_s}</p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded text-center">
                    <p className="text-xs text-muted-foreground">C</p>
                    <p className="font-bold">{colaboradorData.disc.score_c}</p>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Award className="h-4 w-4 text-yellow-500" />
                      Score de Liderança
                    </p>
                    <Badge className={colaboradorData.disc.leadership_score >= 35 ? 'bg-blue-600' : 'bg-gray-600'}>
                      {colaboradorData.disc.leadership_score}/50
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded h-2">
                    <div
                      className="bg-blue-600 h-2 rounded transition-all"
                      style={{ width: `${(colaboradorData.disc.leadership_score / 50) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-1">Experiência de Liderança</p>
                  <Badge variant="outline">{colaboradorData.disc.experiencia_lideranca || 'Não informada'}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plano Existente ou Novo */}
          {colaboradorData.planoExistente ? (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="text-base">Plano Existente</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Criado em {format(new Date(colaboradorData.planoExistente.data_criacao), 'dd/MM/yyyy')}
                </p>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button onClick={() => {
                  setEditandoPlano(colaboradorData.planoExistente!);
                  setDialogAberto(true);
                }} variant="outline" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Editar Plano
                </Button>
                <Button onClick={handleExportarIndividual} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Criar Novo Plano</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button onClick={handleNovoPlano} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Plano Manual
                </Button>
                <Button onClick={handleGerarComIA} variant="outline" className="gap-2" disabled={gerando}>
                  {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Gerar com IA
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Dialog de Edição */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plano de Desenvolvimento - {editandoPlano?.colaborador_nome}</DialogTitle>
          </DialogHeader>

          {editandoPlano && (
            <div className="space-y-6">
              {/* Seção Objetivo */}
              <div className="space-y-2">
                <Label className="font-semibold">Objetivo Geral</Label>
                <Textarea
                  value={editandoPlano.objetivo_geral}
                  onChange={(e) => setEditandoPlano({ ...editandoPlano, objetivo_geral: e.target.value })}
                  placeholder="Descreva o objetivo geral do desenvolvimento..."
                  rows={3}
                />
              </div>

              {/* Competências */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Competência Principal</Label>
                  <Input
                    value={editandoPlano.competencia_principal}
                    onChange={(e) => setEditandoPlano({ ...editandoPlano, competencia_principal: e.target.value })}
                    placeholder="Ex: Liderança"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Competência Secundária</Label>
                  <Input
                    value={editandoPlano.competencia_secundaria}
                    onChange={(e) => setEditandoPlano({ ...editandoPlano, competencia_secundaria: e.target.value })}
                    placeholder="Ex: Comunicação"
                  />
                </div>
              </div>

              {/* ONA Dimensões */}
              <Alert>
                <AlertDescription className="text-sm">
                  Preencha as três dimensões de acordo com o modelo ONA Nível 1
                </AlertDescription>
              </Alert>

              {/* Estrutura */}
              <div className="space-y-3 border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-sm">1. DIMENSÃO ESTRUTURA</h3>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Ambiente de Trabalho</Label>
                  <Textarea
                    value={editandoPlano.ambiente_trabalho}
                    onChange={(e) => setEditandoPlano({ ...editandoPlano, ambiente_trabalho: e.target.value })}
                    placeholder="Como está o ambiente de trabalho?"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Recursos Disponíveis</Label>
                  <Textarea
                    value={editandoPlano.recursos_disponiveis}
                    onChange={(e) => setEditandoPlano({ ...editandoPlano, recursos_disponiveis: e.target.value })}
                    placeholder="Quais recursos estão disponíveis?"
                    rows={2}
                  />
                </div>
              </div>

              {/* Processo */}
              <div className="space-y-3 border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-sm">2. DIMENSÃO PROCESSO</h3>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Fluxo de Atividades</Label>
                  <Textarea
                    value={editandoPlano.fluxo_atividades}
                    onChange={(e) => setEditandoPlano({ ...editandoPlano, fluxo_atividades: e.target.value })}
                    placeholder="Como é o fluxo de suas atividades?"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Pontos de Melhoria</Label>
                  <Textarea
                    value={editandoPlano.pontos_melhorias}
                    onChange={(e) => setEditandoPlano({ ...editandoPlano, pontos_melhorias: e.target.value })}
                    placeholder="Quais pontos precisam melhorar?"
                    rows={2}
                  />
                </div>
              </div>

              {/* Resultado */}
              <div className="space-y-3 border-l-4 border-orange-500 pl-4">
                <h3 className="font-semibold text-sm">3. DIMENSÃO RESULTADO</h3>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Indicadores de Sucesso</Label>
                  <Textarea
                    value={editandoPlano.indicadores_sucesso}
                    onChange={(e) => setEditandoPlano({ ...editandoPlano, indicadores_sucesso: e.target.value })}
                    placeholder="Qual será a forma de verificar o sucesso?"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Meta Esperada</Label>
                  <Textarea
                    value={editandoPlano.meta_esperada}
                    onChange={(e) => setEditandoPlano({ ...editandoPlano, meta_esperada: e.target.value })}
                    placeholder="Qual é a meta esperada?"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSalvarPlano} className="gap-2">
              <Save className="h-4 w-4" />
              Salvar Plano
            </Button>
            {editandoPlano && (
              <Button onClick={handleExportarIndividual} variant="secondary" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const PlanoDesenvolvimentoSection = memo(PlanoDesenvolvimentoSectionContent);
PlanoDesenvolvimentoSection.displayName = 'PlanoDesenvolvimentoSection';
