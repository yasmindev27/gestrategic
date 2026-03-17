/**
 * Gestrategic — Tipos Globais do Sistema
 * Centralização de tipagem para as 30+ entidades.
 * Relações: Setor → Colaborador → Chamado → Comentário
 */

import { Database } from "@/integrations/supabase/types";

// ─── Alias para tipos do banco ────────────────────────────────────
export type Tables = Database["public"]["Tables"];
export type Enums = Database["public"]["Enums"];
export type AppRole = Enums["app_role"];

// Row types — extraídos diretamente do schema
export type Profile = Tables["profiles"]["Row"];
export type UserRole = Tables["user_roles"]["Row"];
export type Setor = Tables["setores"]["Row"];
export type Cargo = Tables["cargos"]["Row"];

// Chamados
export type Chamado = Tables["chamados"]["Row"];
export type ChamadoComentario = Tables["chamados_comentarios"]["Row"];
export type ChamadoMaterial = Tables["chamados_materiais"]["Row"];

// NIR / Leitos
export type BedRecord = Tables["bed_records"]["Row"];

// Enfermagem
export type EnfermagemEscala = Tables["enfermagem_escalas"]["Row"];

// Incidentes / NSP
export type Incidente = Tables["incidentes_nsp"]["Row"];
export type AnaliseIncidente = Tables["analises_incidentes"]["Row"];
export type AcaoIncidente = Tables["acoes_incidentes"]["Row"];

// Prontuários / Faturamento
export type Prontuario = Tables["prontuarios"]["Row"];
export type SaidaProntuario = Tables["saida_prontuarios"]["Row"];
export type AvaliacaoProntuario = Tables["avaliacoes_prontuarios"]["Row"];

// RH / DP
export type Atestado = Tables["atestados"]["Row"];
export type BancoHoras = Tables["banco_horas"]["Row"];
export type AvaliacaoDesempenho = Tables["avaliacoes_desempenho"]["Row"];
export type AvaliacaoExperiencia = Tables["avaliacoes_experiencia"]["Row"];

// Restaurante
export type ColaboradorRestaurante = Tables["colaboradores_restaurante"]["Row"];
export type Cardapio = Tables["cardapios"]["Row"];

// Chat
export type ChatConversa = Tables["chat_conversas"]["Row"];
export type ChatMensagem = Tables["chat_mensagens"]["Row"];
export type ChatParticipante = Tables["chat_participantes"]["Row"];

// Agenda
export type AgendaItem = Tables["agenda_items"]["Row"];
export type AgendaDestinatario = Tables["agenda_destinatarios"]["Row"];

// Qualidade / Auditoria
export type AuditoriaQualidade = Tables["auditorias_qualidade"]["Row"];
export type AchadoAuditoria = Tables["achados_auditoria"]["Row"];
export type AuditoriaSegurancaPaciente = Tables["auditorias_seguranca_paciente"]["Row"];

// Assistência Social
export type ASPaciente = Tables["assistencia_social_pacientes"]["Row"];
export type ASAtendimento = Tables["assistencia_social_atendimentos"]["Row"];

// Segurança
export type AlertaSeguranca = Tables["alertas_seguranca"]["Row"];

// Rouparia
export type RoupariaItem = Tables["rouparia_itens"]["Row"];

// Ativos / Infraestrutura
export type Ativo = Tables["ativos"]["Row"];

// LMS
export type Treinamento = Tables["lms_treinamentos"]["Row"];

// Logs
export type LogAcesso = Tables["logs_acesso"]["Row"];

// DISC
export type DISCResult = Tables["disc_results"]["Row"];

// ─── Enums de domínio ─────────────────────────────────────────────

/** Categorias RBAC para agrupamento de módulos */
export type ModuleCategory =
  | "assistencial"
  | "apoio_logistica"
  | "governanca"
  | "administrativo"
  | "comunicacao";

/** IDs dos módulos do sistema */
export type ModuleId =
  | "dashboard" | "gerencia" | "nir" | "medicos" | "enfermagem"
  | "assistencia-social" | "faturamento" | "mapa-leitos" | "laboratorio"
  | "rouparia" | "restaurante" | "tecnico-manutencao" | "tecnico-engenharia"
  | "seguranca-patrimonial" | "qualidade" | "seguranca-trabalho" | "reuniao"
  | "documentos-interact" | "rhdp" | "colaborador" | "lms" | "tecnico-ti"
  | "controle-fichas" | "admin" | "chat" | "abrir-chamado" | "agenda"
  | "salus" | "reportar-incidente" | "recepcao" | "equipe";

/** Mapeamento de módulos para suas categorias RBAC */
export const MODULE_CATEGORIES: Record<ModuleId, ModuleCategory | "dashboard"> = {
  dashboard: "dashboard",
  gerencia: "dashboard",
  // Assistencial
  nir: "assistencial",
  medicos: "assistencial",
  enfermagem: "assistencial",
  "assistencia-social": "assistencial",
  faturamento: "assistencial",
  "mapa-leitos": "assistencial",
  laboratorio: "assistencial",
  recepcao: "assistencial",
  equipe: "assistencial",
  // Apoio e Logística
  rouparia: "apoio_logistica",
  restaurante: "apoio_logistica",
  "tecnico-manutencao": "apoio_logistica",
  "tecnico-engenharia": "apoio_logistica",
  "seguranca-patrimonial": "apoio_logistica",
  // Governança e Qualidade
  qualidade: "governanca",
  "seguranca-trabalho": "governanca",
  reuniao: "governanca",
  "documentos-interact": "governanca",
  "reportar-incidente": "governanca",
  // Administrativo / RH
  rhdp: "administrativo",
  colaborador: "administrativo",
  lms: "administrativo",
  "tecnico-ti": "administrativo",
  "controle-fichas": "administrativo",
  admin: "administrativo",
  // Comunicação / Apoio
  chat: "comunicacao",
  "abrir-chamado": "comunicacao",
  agenda: "comunicacao",
  salus: "comunicacao",
};

// ─── Tipos utilitários ────────────────────────────────────────────

/** Permissão de acesso a módulo */
export interface ModulePermission {
  canView: boolean;
  canAccess: boolean;
  canWrite: boolean;
}

/** Resultado paginado genérico */
export interface PaginatedResult<T> {
  data: T[];
  count: number;
  hasMore: boolean;
}

/** Filtros de período para relatórios */
export interface DateRangeFilter {
  from: Date;
  to: Date;
}
