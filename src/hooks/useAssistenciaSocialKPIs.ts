import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

interface TipoAtendimento {
  name: string;
  value: number;
  color: string;
}

interface LocalAtendimento {
  local: string;
  demanda: number;
}

interface ProdutividadeProfissional {
  nome: string;
  atendimentos: number;
  meta: number;
  taxa: number;
}

interface MotivoFrequente {
  motivo: string;
  frequencia: number;
  percentual: number;
}

interface EvoluçaoMensal {
  mes: string;
  total: number;
  acolhimento: number;
  orientacao: number;
  acompanhamento: number;
  encaminhamento: number;
}

interface AssistenciaSocialKPIs {
  tiposAtendimento: TipoAtendimento[];
  localAtendimento: LocalAtendimento[];
  produtividadeProfissional: ProdutividadeProfissional[];
  motivosMais: MotivoFrequente[];
  evolucaoMensal: EvoluçaoMensal[];
  totalAtendimentos: number;
  mediaAtendimentos: number;
  profComMaisProdutividade: ProdutividadeProfissional | null;
}

const CORES_TIPO = {
  'acolhimento': '#0ea5e9',
  'orientacao': '#22c55e',
  'acompanhamento': '#f59e0b',
  'encaminhamento': '#ef4444',
  'avaliacao_psicossocial': '#8b5cf6',
  'atendimento_crise': '#ec4899',
  'outros': '#64748b',
};

export const useAssistenciaSocialKPIs = () => {
  const [data, setData] = useState<AssistenciaSocialKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssistenciaSocialData = async () => {
      try {
        const threeMonthsAgo = subDays(new Date(), 90).toISOString();
        const oneMonthAgo = subDays(new Date(), 30).toISOString();

        // Fetch atendimentos dos últimos 90 dias
        const { data: atendimentos, error: err1 } = await supabase
          .from('assistencia_social_atendimentos')
          .select('id, profissional_nome, tipo_atendimento, status, motivo, data_atendimento')
          .gte('data_atendimento', threeMonthsAgo)
          .order('data_atendimento', { ascending: false });

        if (err1) throw err1;

        const allAtendimentos = atendimentos || [];

        // 1. Calcular tipos de atendimento
        const tiposMap = new Map<string, number>();
        allAtendimentos.forEach(a => {
          const tipo = a.tipo_atendimento || 'outros';
          tiposMap.set(tipo, (tiposMap.get(tipo) || 0) + 1);
        });

        const totalTipos = Array.from(tiposMap.values()).reduce((a, b) => a + b, 0);
        const tiposAtendimento: TipoAtendimento[] = Array.from(tiposMap.entries())
          .map(([tipo, count]) => ({
            name: tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/_/g, ' '),
            value: Math.round((count / totalTipos) * 100),
            color: (CORES_TIPO[tipo as keyof typeof CORES_TIPO] || CORES_TIPO['outros']),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 4); // Top 4

        // 2. Calcular demanda por tipo de atendimento (agrupado por tipo)
        const tiposMapDemanda = new Map<string, number>();
        allAtendimentos.forEach(a => {
          const tipo = a.tipo_atendimento || 'Outros';
          tiposMapDemanda.set(tipo, (tiposMapDemanda.get(tipo) || 0) + 1);
        });

        const localAtendimento: LocalAtendimento[] = Array.from(tiposMapDemanda.entries())
          .map(([tipo, demanda]) => ({
            local: tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/_/g, ' '),
            demanda,
          }))
          .sort((a, b) => b.demanda - a.demanda)
          .slice(0, 5); // Top 5

        // 3. Calcular produtividade por profissional (últimos 30 dias)
        const profissionaisMap = new Map<string, { atendimentos: number }>();
        allAtendimentos
          .filter(a => new Date(a.data_atendimento) >= new Date(oneMonthAgo))
          .forEach(a => {
            const prof = a.profissional_nome || 'Não atribuído';
            if (!profissionaisMap.has(prof)) {
              profissionaisMap.set(prof, { atendimentos: 0 });
            }
            profissionaisMap.get(prof)!.atendimentos++;
          });

        const meta = 50; // Meta mensal
        const produtividadeProfissional: ProdutividadeProfissional[] = Array.from(profissionaisMap.entries())
          .map(([nome, stats]) => ({
            nome,
            atendimentos: stats.atendimentos,
            meta,
            taxa: Math.round((stats.atendimentos / meta) * 100),
          }))
          .sort((a, b) => b.atendimentos - a.atendimentos)
          .slice(0, 4); // Top 4

        const profComMaisProdutividade = produtividadeProfissional[0] || null;

        // 4. Motivos mais frequentes
        const motivosMap = new Map<string, number>();
        allAtendimentos.forEach(a => {
          const motivo = a.motivo || 'Sem especificação';
          motivosMap.set(motivo, (motivosMap.get(motivo) || 0) + 1);
        });

        const totalMotivos = Array.from(motivosMap.values()).reduce((a, b) => a + b, 0);
        const motivosMais: MotivoFrequente[] = Array.from(motivosMap.entries())
          .map(([motivo, freq]) => ({
            motivo,
            frequencia: freq,
            percentual: Math.round((freq / totalMotivos) * 100),
          }))
          .sort((a, b) => b.frequencia - a.frequencia)
          .slice(0, 6); // Top 6

        // 5. Evolução mensal (últimos 6 meses)
        const evolucaoMap = new Map<string, {
          total: number;
          acolhimento: number;
          orientacao: number;
          acompanhamento: number;
          encaminhamento: number;
        }>();

        for (let i = 5; i >= 0; i--) {
          const d = subDays(new Date(), i * 30);
          const mes = format(d, 'MMM').toUpperCase();
          evolucaoMap.set(mes, {
            total: 0,
            acolhimento: 0,
            orientacao: 0,
            acompanhamento: 0,
            encaminhamento: 0,
          });
        }

        allAtendimentos.forEach(a => {
          const d = new Date(a.data_atendimento);
          const mes = format(d, 'MMM').toUpperCase();
          if (evolucaoMap.has(mes)) {
            const slot = evolucaoMap.get(mes)!;
            slot.total++;
            const tipo = a.tipo_atendimento?.toLowerCase() || 'outro';
            if (tipo === 'acolhimento') slot.acolhimento++;
            else if (tipo === 'orientacao') slot.orientacao++;
            else if (tipo === 'acompanhamento') slot.acompanhamento++;
            else if (tipo === 'encaminhamento') slot.encaminhamento++;
          }
        });

        const evolucaoMensal: EvoluçaoMensal[] = Array.from(evolucaoMap.entries())
          .map(([mes, vals]) => ({ mes, ...vals }));

        const totalAtendimentos = allAtendimentos.length;
        const mediaAtendimentos = Math.round(totalAtendimentos / 3); // 3 meses

        setData({
          tiposAtendimento,
          localAtendimento,
          produtividadeProfissional,
          motivosMais,
          evolucaoMensal,
          totalAtendimentos,
          mediaAtendimentos,
          profComMaisProdutividade,
        });

        setError(null);
      } catch (err) {
        console.error('Erro ao buscar dados de assistência social:', err);
        setError(err instanceof Error ? err.message : 'Erro ao buscar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchAssistenciaSocialData();
  }, []);

  return { data, loading, error };
};
