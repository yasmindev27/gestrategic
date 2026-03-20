import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

interface OcupacaoPorSetor {
  name: string;
  occupied: number;
  total: number;
  rate: number;
}

interface DistribuicaoPacientes {
  total: number;
  altas: number;
  internacoes: number;
  transferencias: number;
}

interface EvolucaoInternacoes {
  date: string;
  internacoes: number;
  altas: number;
  total: number;
}

interface DesempenhoPorColaborador {
  name: string;
  atendimentos: number;
  meta: number;
  taxa: number;
}

interface DistribuicaoAtividade {
  name: string;
  value: number;
  color: string;
}

interface ComparativoColaboradores {
  mes: string;
  [key: string]: number | string;
}

interface NIRDashboardData {
  ocupacaoPorSetor: OcupacaoPorSetor[];
  distribuicaoPacientes: DistribuicaoPacientes;
  evolucaoInternacoes: EvolucaoInternacoes[];
  desempenhoPorColaborador: DesempenhoPorColaborador[];
  distribuicaoAtividade: DistribuicaoAtividade[];
  comparativoColaboradores: ComparativoColaboradores[];
  loading: boolean;
  error: string | null;
}

export function useNIRKPIs(): NIRDashboardData {
  const [data, setData] = useState<NIRDashboardData>({
    ocupacaoPorSetor: [],
    distribuicaoPacientes: { total: 0, altas: 0, internacoes: 0, transferencias: 0 },
    evolucaoInternacoes: [],
    desempenhoPorColaborador: [],
    distribuicaoAtividade: [],
    comparativoColaboradores: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchNIRData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        const today = new Date();
        const sevenDaysAgo = subDays(today, 7);
        const thirtyDaysAgo = subDays(today, 30);
        const threeMonthsAgo = subDays(today, 90);

        // ========== TELA 1: Dashboard de Internações ==========

        // 1. Ocupação por Setor (ATUAL)
        const { data: bedsData, error: bedsError } = await supabase
          .from('bed_records')
          .select('sector, patient_name, motivo_alta, data_alta')
          .or(`and(patient_name.is.not.null,motivo_alta.is.null,data_alta.is.null),and(sector.eq.enfermaria-masculina),and(sector.eq.pediatria),and(sector.eq.uti),and(sector.eq.maternidade)`);

        if (bedsError) throw bedsError;

        // Contar ocupação por setor
        const setoresDisponiveis = ['enfermaria-masculina', 'pediatria', 'uti', 'maternidade'];
        const ocupacaoPorSetor: OcupacaoPorSetor[] = setoresDisponiveis.map(setor => {
          const ocupados = (bedsData || []).filter(
            b => b.sector === setor && b.patient_name && !b.motivo_alta && !b.data_alta
          ).length;

          // Totais aproximados (pode ser ajustado conforme necessário)
          const totais: { [key: string]: number } = {
            'enfermaria-masculina': 50,
            'pediatria': 25,
            'uti': 30,
            'maternidade': 15,
          };

          const total = totais[setor] || 25;
          const rate = Math.round((ocupados / total) * 100);

          return {
            name: setor.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            occupied: ocupados,
            total,
            rate,
          };
        });

        // 2. Distribuição de Pacientes (Hoje e últimos 7 dias)
        const { data: statsData, error: statsError } = await supabase
          .from('bed_records')
          .select('motivo_alta, data_alta, data_internacao')
          .gte('shift_date', format(today, 'yyyy-MM-dd'));

        if (statsError) throw statsError;

        const totalPacientes = (bedsData || []).filter(b => b.patient_name).length;
        const altasHoje = (statsData || []).filter(
          b => b.motivo_alta === 'alta-melhorada' && b.data_alta === format(today, 'yyyy-MM-dd')
        ).length;
        const internacoes = (statsData || []).filter(
          b => b.data_internacao === format(today, 'yyyy-MM-dd')
        ).length;
        const transferencias = (statsData || []).filter(
          b => b.motivo_alta === 'transferencia' && b.data_alta >= format(sevenDaysAgo, 'yyyy-MM-dd')
        ).length;

        const distribuicaoPacientes: DistribuicaoPacientes = {
          total: totalPacientes,
          altas: altasHoje,
          internacoes,
          transferencias,
        };

        // 3. Evolução de 7 dias
        const { data: evolutionData, error: evolutionError } = await supabase
          .from('bed_records')
          .select('shift_date, motivo_alta, data_internacao, data_alta')
          .gte('shift_date', format(sevenDaysAgo, 'yyyy-MM-dd'))
          .lte('shift_date', format(today, 'yyyy-MM-dd'));

        if (evolutionError) throw evolutionError;

        const diadasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        const evolucaoInternacoes: EvolucaoInternacoes[] = [];

        for (let i = 0; i < 7; i++) {
          const dia = subDays(today, 6 - i);
          const diaStr = format(dia, 'yyyy-MM-dd');
          const diaaSemanaIdx = dia.getDay() || 6; // Ajusta Sunday (0) para 6
          const diaaSemana = diadasSemana[diaaSemanaIdx === 0 ? 6 : diaaSemanaIdx - 1];

          const internacoesDia = (evolutionData || []).filter(
            r => r.data_internacao === diaStr
          ).length;
          const altasDia = (evolutionData || []).filter(
            r => r.data_alta === diaStr
          ).length;
          const totalDia = (evolutionData || []).filter(
            r => r.shift_date === diaStr && r.motivo_alta === null && r.data_alta === null
          ).length + (internacoesDia - altasDia);

          evolucaoInternacoes.push({
            date: diaaSemana,
            internacoes: internacoesDia,
            altas: altasDia,
            total: Math.max(totalDia, 0),
          });
        }

        // ========== TELA 2: Produtividade ==========

        // 4. Desempenho por Colaborador (últimos 30 dias)
        const { data: prodData, error: prodError } = await supabase
          .from('nir_registros_producao')
          .select('colaborador, quantidade, data')
          .gte('data', format(thirtyDaysAgo, 'yyyy-MM-dd'))
          .lte('data', format(today, 'yyyy-MM-dd'))
          .order('data', { ascending: false });

        if (prodError) throw prodError;

        const prodPorColaborador = new Map<string, number>();
        (prodData || []).forEach(r => {
          const current = prodPorColaborador.get(r.colaborador) || 0;
          prodPorColaborador.set(r.colaborador, current + (r.quantidade || 0));
        });

        const metaPorColaborador = 100; // Meta mensal
        const desempenhoPorColaborador: DesempenhoPorColaborador[] = Array.from(prodPorColaborador)
          .map(([name, atendimentos]) => ({
            name,
            atendimentos,
            meta: metaPorColaborador,
            taxa: Math.round((atendimentos / (metaPorColaborador || 1)) * 100),
          }))
          .sort((a, b) => b.atendimentos - a.atendimentos)
          .slice(0, 5);

        // 5. Distribuição por Atividade (últimos 30 dias)
        const { data: atividadesData, error: atividadesError } = await supabase
          .from('nir_registros_producao')
          .select('atividade, quantidade')
          .gte('data', format(thirtyDaysAgo, 'yyyy-MM-dd'))
          .lte('data', format(today, 'yyyy-MM-dd'));

        if (atividadesError) throw atividadesError;

        const atividadesCores: { [key: string]: string } = {
          'Conferência de Documentos': '#0ea5e9',
          'Cadastro SUSFácil': '#22c55e',
          'Gestão de Vagas': '#f59e0b',
          'Solicitação de Transferência': '#ef4444',
          'Contato com Estabelecimentos': '#8b5cf6',
          'Encaminhamento para Exame': '#ec4899',
        };

        const atividadesMap = new Map<string, number>();
        (atividadesData || []).forEach(r => {
          const current = atividadesMap.get(r.atividade) || 0;
          atividadesMap.set(r.atividade, current + (r.quantidade || 0));
        });

        const distribuicaoAtividade: DistribuicaoAtividade[] = Array.from(atividadesMap)
          .map(([name, value]) => ({
            name,
            value,
            color: atividadesCores[name] || '#64748b',
          }))
          .sort((a, b) => b.value - a.value);

        // 6. Comparativo entre Colaboradores (3 meses)
        const { data: comparativoRaw, error: comparativoError } = await supabase
          .from('nir_registros_producao')
          .select('colaborador, quantidade, data')
          .gte('data', format(threeMonthsAgo, 'yyyy-MM-dd'))
          .lte('data', format(today, 'yyyy-MM-dd'))
          .order('data', { ascending: true });

        if (comparativoError) throw comparativoError;

        // Agrupar por mês e colaborador
        const mesesMap = new Map<string, { mes: string; [key: string]: any }>();
        (comparativoRaw || []).forEach(r => {
          const mes = format(new Date(r.data), 'MMM', { locale: ptBR });
          const mesKey = mes.charAt(0).toUpperCase() + mes.slice(1);

          if (!mesesMap.has(mesKey)) {
            mesesMap.set(mesKey, { mes: mesKey });
          }

          const mesData = mesesMap.get(mesKey)!;
          const colaborKey = `colab_${r.colaborador.split(' ')[0]}`;
          mesData[colaborKey] = (mesData[colaborKey] || 0) + (r.quantidade || 0);
        });

        // Adicionar meta (fixa em 100) e converter para array
        const comparativoColaboradores: ComparativoColaboradores[] = Array.from(mesesMap.values())
          .map(m => ({
            mes: m.mes,
            ...Object.keys(m)
              .filter(k => k !== 'mes')
              .reduce((acc, k) => ({ ...acc, [k]: m[k] }), {}),
            meta: 100,
          }))
          .slice(-3); // Últimos 3 meses

        setData({
          ocupacaoPorSetor,
          distribuicaoPacientes,
          evolucaoInternacoes,
          desempenhoPorColaborador,
          distribuicaoAtividade,
          comparativoColaboradores,
          loading: false,
          error: null,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar dados NIR';
        console.error('useNIRKPIs error:', err);
        setData(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    };

    fetchNIRData();
    const interval = setInterval(fetchNIRData, 5 * 60 * 1000); // Refresh a cada 5 minutos

    return () => clearInterval(interval);
  }, []);

  return data;
}
