/**
 * 🏥 Guia de Implementação - Padrão de Qualidade Hospitalar
 * 
 * Este arquivo documenta como aplicar os padrões de qualidade em todos os módulos
 */

// ============================================================================
// 1️⃣ FORMATAÇÃO DE DATAS
// ============================================================================

/*
✅ SEMPRE USE: date-formatter.ts

import { formatDateTime, formatDate, formatTime } from "@/lib/date-formatter";

// Correto:
<p>{formatDateTime(data.created_at)}</p>  // DD/MM/YYYY HH:mm
<p>{formatDate(data.data_nascimento)}</p> // DD/MM/YYYY
<p>{formatTime(data.hora)}</p>            // HH:mm

❌ NUNCA USE:
<p>{new Date(data.created_at).toLocaleString()}</p>
<p>{data.created_at}</p>
*/

// ============================================================================
// 2️⃣ EMPTY STATES
// ============================================================================

/*
import { EmptyState, EmptyData, EmptySearchResults } from "@/components/shared/EmptyState";

// Em uma lista/tabela vazia:
{dados.length === 0 ? (
  <EmptyData entityName="pendências" description="Nenhuma tarefa aguardando" />
) : (
  // Renderizar dados
)}

// Em uma busca sem resultados:
{searchQuery && filteredData.length === 0 ? (
  <EmptySearchResults query={searchQuery} onClear={() => setSearchQuery("")} />
) : (
  // Renderizar dados
)}

// Customizado:
<EmptyState
  title="Nenhum registro encontrado"
  description="Tente filtrar por outro período"
  actionLabel="Limpar filtros"
  onAction={() => setFilters({})}
/>
*/

// ============================================================================
// 3️⃣ TOAST (NOTIFICAÇÕES)
// ============================================================================

/*
import { useToast } from "@/hooks/useToast";

function MeuComponente() {
  const { success, error, warning } = useToast();

  const handleSave = async () => {
    try {
      await api.save(dados);
      success("Dados salvos com sucesso");  // Automáticamente desaparece em 3s
    } catch (err) {
      error("Erro ao salvar dados", {
        description: "Tente novamente ou contacte o suporte"
      });
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(id);
      success("Registro deletado");
    } catch (err) {
      error("Não foi possível deletar");
    }
  };

  return <button onClick={handleSave}>Salvar</button>;
}

// Uso fora de componentes (em funções):
import { showToast } from "@/hooks/useToast";

export const saveData = async (dados) => {
  try {
    await api.save(dados);
    showToast.success("Dados salvos!");
  } catch (err) {
    showToast.error("Erro ao salvar");
  }
};
*/

// ============================================================================
// 4️⃣ STATUS COM TOOLTIPS
// ============================================================================

/*
import { StatusTooltip, HRStatusTooltip, LaundryStatusTooltip, InfoTooltip } from "@/components/shared/StatusTooltip";

// Status de RH/Banco de Horas:
<HRStatusTooltip status="pendente" />
// Mostra: "Status Pendente: Aguardando validação do RH"

// Status de Rouparia:
<LaundryStatusTooltip status="em_lavagem" />
// Mostra: "Em Lavagem: Está sendo lavado"

// Genérico com tooltip:
<StatusTooltip 
  status="pendente"
  label="À Espera"
  tooltip="Aguardando documentação do paciente"
/>

// Info inline com ícone:
<InfoTooltip tooltip="A data será usada para cálculos de performance">
  <span>Entrada: 01/03/2026</span>
</InfoTooltip>
*/

// ============================================================================
// 5️⃣ CHECKLIST DE IMPLEMENTAÇÃO POR MÓDULO
// ============================================================================

/*
□ RH/DP Module:
  □ Todas as datas: formatDateTime()
  □ Seção "Banco de Horas" com empty state se vazio
  □ Badges de status "Pendente/Aprovado/Rejeitado" com HRStatusTooltip
  □ Toast ao salvar/deletar pendência
  □ Toast ao aprovar/rejeitar banco de horas

□ Rouparia Module:
  □ Todas as datas: formatDateTime()
  □ Tabela de estoque com empty state
  □ Status (Disponível/Em Lavagem/Em Reparo) com LaundryStatusTooltip
  □ Toast ao criar requisição
  □ Toast ao mover item entre estados

□ Gerência Module:
  □ Lista de pendências com empty state
  □ Todas as datas formatadas
  □ Status com tooltip
  □ Toast ao confirmar/rejeitar

□ Qualidade (NSP) Module:
  □ Lista de incidentes com empty state
  □ Datas padronizadas
  □ Status "Aberto/Em análise/Fechado" com tooltip
  □ Toast ao registrar novo incidente

□ Faturamento Module:
  □ Datas das folhas: formatDate()
  □ Lista de faltantes com empty state
  □ Status com tooltip
  □ Toast ao confirmar saída

□ Enfermagem Module:
  □ Escalas com datas formatadas
  □ Status de trocas com tooltip
  □ Toast ao aprovar/rejeitar troca
  □ Empty state se sem trocas pendentes
*/

// ============================================================================
// 6️⃣ EXEMPLO PRÁTICO - APLICAR EM UM MÓDULO
// ============================================================================

/*
// ANTES:
function MinhaSeção() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const carregarDados = async () => {
      const result = await api.getDados();
      setDados(result);
    };
    carregarDados();
  }, []);

  if (loading) return <p>Carregando...</p>;
  
  if (!dados.length) {
    return <p>Sem dados</p>;  // ❌ Sem estilo consistente
  }

  return (
    <div>
      {dados.map((item) => (
        <div key={item.id}>
          <p>{item.data_criacao}</p>  // ❌ Data não formatada
          <span className="bg-blue-500">{item.status}</span>  // ❌ Sem tooltip
        </div>
      ))}
    </div>
  );
}

// DEPOIS:
import { formatDateTime } from "@/lib/date-formatter";
import { EmptyData } from "@/components/shared/EmptyState";
import { HRStatusTooltip } from "@/components/shared/StatusTooltip";
import { useToast } from "@/hooks/useToast";

function MinhaSeção() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const result = await api.getDados();
        setDados(result);
        success("Dados carregados com sucesso");
      } catch (err) {
        error("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, []);

  if (loading) return <p>Carregando...</p>;
  
  if (!dados.length) {
    return <EmptyData entityName="registros" />;  // ✅ Padrão consistente
  }

  return (
    <div>
      {dados.map((item) => (
        <div key={item.id}>
          <p>{formatDateTime(item.data_criacao)}</p>  // ✅ Data formatada
          <HRStatusTooltip status={item.status} />     // ✅ Com tooltip
        </div>
      ))}
    </div>
  );
}
*/

export {};
