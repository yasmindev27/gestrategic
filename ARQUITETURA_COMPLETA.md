# 📊 Arquitetura Completa do Gestrategic

**Data da Análise:** 19 de março de 2026  
**Status:** Projeto hospitalar em produção (185 migrations, 30+ módulos)

---

## 1️⃣ ESTRUTURA DE TIPOS DE DADOS E INTERFACES

### 📝 Arquivos de Tipos Centralizados
- **`src/types/global.ts`** - Tipos globais exportados do Supabase
- **`src/types/bed.ts`** - Tipos para leitos e pacientes
- **`src/types/indicators.ts`** - Tipos para indicadores UPA/NSP
- **`src/types/disc.ts`** - Testes DISC de liderança

### 🔷 Tipos Principais do Sistema

#### **Autenticação & Perfis**
```typescript
interface Profile {
  id: UUID
  user_id: UUID
  full_name: TEXT
  cargo: TEXT
  setor: TEXT
  telefone: TEXT
  avatar_url: TEXT
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

interface UserRole {
  id: UUID
  user_id: UUID
  role: app_role  // 'admin' | 'gestor' | 'funcionario' + 10 roles específicas
}

type AppRole = 
  | 'admin'
  | 'gestor'
  | 'funcionario'
  | 'nir'
  | 'faturamento'
  | 'enfermagem'
  | 'recepcao'
  | 'classificacao'
  | 'ti'
  | 'manutencao'
  | 'engenharia_clinica'
  | 'laboratorio'  // +outras roles específicas
```

#### **Leitos & Pacientes (NIR)**
```typescript
interface Patient {
  nome: string
  hipoteseDiagnostica: string
  dataNascimento: string
  dataInternacao: string
  susFacil: 'sim' | 'nao'
  numeroSusFacil: string
  cti: 'sim' | 'nao'
  motivoAlta: 'alta-melhorada' | 'evasao' | 'transferencia' | 'obito'
  observacao: string
}

interface Bed {
  id: string  // "{sector-id}-{bed-number}"
  number: number | string
  sector: Sector
  patient: Patient | null
}

type Sector = 
  | 'enfermaria-masculina'
  | 'enfermaria-feminina'
  | 'pediatria'
  | 'isolamento'
  | 'urgencia'
```

#### **Indicadores (UPA/NSP)**
```typescript
interface IndicatorData {
  id: UUID
  mes: string
  ano: number
  categoria: string  // 'Indicadores de Estrutura', 'Processo', 'Resultado', 'Gestão'
  indicador: string
  valor_numero: number | null
  valor_percentual: number | null
  meta: number | null
  unidade_medida: string
}

interface ActionPlan {
  id: UUID
  indicator_id: UUID | null
  analise_critica: string
  fator_causa: string
  plano_acao: string
  responsavel: string
  prazo: string
  status: string
}
```

#### **DISC - Teste de Liderança**
```typescript
interface DISCResult {
  scores: {
    D: number  // Dominância
    I: number  // Influência
    S: number  // Estabilidade
    C: number  // Conformidade
  }
  primaryProfile: 'D' | 'I' | 'S' | 'C'
  secondaryProfile: 'D' | 'I' | 'S' | 'C'
  leadershipScore: number
  identification: {
    nomeCompleto: string
    cargoAtual: string
    setor: string
    tempoAtuacao: string
    formacao: string
    experienciaLideranca: string
  }
}
```

#### **Chamados/Tickets**
```typescript
interface Chamado {
  id: UUID
  numero_chamado: TEXT
  titulo: TEXT
  descricao: TEXT
  categoria: TEXT  // 'ti', 'manutencao', 'engenharia_clinica'
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  status: 'aberto' | 'em_andamento' | 'pendente' | 'resolvido' | 'cancelado'
  solicitante_id: UUID
  atribuido_para: UUID | null
  data_resolucao: TIMESTAMP | null
}
```

#### **Enfermagem**
```typescript
interface Escala {
  id: UUID
  profissional_id: UUID
  data_plantao: DATE
  periodo: 'manhã' | 'tarde' | 'noite'
  status: 'confirmada' | 'cancelada' | 'pendente'
}

interface Troca {
  id: UUID
  escala_id: UUID
  ofertante_id: UUID
  aceitante_id: UUID | null
  status: 'aberta' | 'aceita' | 'recusada' | 'pendente_aprovacao'
}
```

#### **Módulos RBAC**
```typescript
type ModuleId =
  | 'dashboard'
  | 'gerencia'
  | 'nir'  // Núcleo de Internação
  | 'medicos'
  | 'enfermagem'
  | 'assistencia-social'
  | 'faturamento'
  | 'mapa-leitos'
  | 'laboratorio'
  | 'rouparia'
  | 'restaurante'
  | 'tecnico-manutencao'
  | 'tecnico-engenharia'
  | 'seguranca-patrimonial'
  | 'qualidade'
  | 'seguranca-trabalho'
  | 'reuniao'
  | 'documentos-interact'
  | 'rhdp'  // Recursos Humanos/DP
  | 'colaborador'
  | 'lms'  // Learning Management System
  | 'tecnico-ti'
  | 'controle-fichas'
  | 'admin'
  | 'chat'
  | 'abrir-chamado'
  | 'agenda'
  | 'salus'
  | 'reportar-incidente'
  | 'recepcao'
  | 'equipe'

type ModuleCategory = 
  | 'assistencial'
  | 'apoio_logistica'
  | 'governanca'
  | 'administrativo'
  | 'comunicacao'
```

---

## 2️⃣ HOOKS CUSTOMIZADOS PARA SUPABASE

### 📚 Hooks Disponíveis (23 principais)

#### **Autenticação & User**
| Hook | Propósito | Retorna |
|------|----------|---------|
| `useUserRole()` | Obter roles do usuário autenticado | `{ roles[], primaryRole, isLoading }` |
| `useMFA()` | Gerenciar autenticação multi-fator | `{ enabled, setup, verify }` |
| `useSessionTimeout()` | Controlar timeout de sessão | `{ isExpired, remainingTime }` |
| `useLocalStorage()` | Persistência local sincronizada | `[value, setValue]` |

#### **Leitos & NIR**
| Hook | Propósito | Retorna |
|------|----------|---------|
| `useBeds(shiftDate, shiftType)` | Carregar leitos com pacientes | `{ beds[], updateBed, isLoading }` |
| `useBedRecords(date, shift)` | Registros de leitos por turno | `{ records[], create, update }` |
| `useDataValidation(supabase)` | Validação integridade de dados | `{ status, runValidations }` |

#### **Enfermagem**
| Hook | Propósito | Retorna |
|------|----------|---------|
| `useEscalas(mes, ano)` | Escalas do mês | `data: Escala[]` |
| `useMinhasEscalas(userId)` | Escalas do profissional | `data: Escala[]` |
| `useTrocasDisponiveis()` | Trocas abertas no sistema | `data: Troca[]` |
| `useMinhasTrocas(userId)` | Trocas do usuário | `data: Troca[]` |
| `useTrocasPendentes()` | Trocas aguardando aprovação | `data: Troca[]` |

#### **Indicadores**
| Hook | Propósito | Retorna |
|------|----------|---------|
| `useUPAIndicators(mes, ano)` | Indicadores UPA | `data: IndicatorData[]` |
| `useNSPIndicators(mes, ano)` | Indicadores NSP | `data: IndicatorData[]` |
| `useConformidadeIndicadores()` | Conformidade com metas | `{ conformes[], naoConformes[] }` |

#### **Permissões & RBAC**
| Hook | Propósito | Retorna |
|------|----------|---------|
| `usePermissoes()` | Calcular permissões do usuário | `{ canAccess, canView, canWrite }` |
| `usePerfis()` | Listar perfis do sistema | `data: PerfilSistema[]` |
| `useModulos()` | Listar módulos disponíveis | `data: ModuloSistema[]` |
| `useFerramentas()` | Ferramentas por módulo | `data: FerramentaModulo[]` |

#### **Infraestrutura**
| Hook | Propósito | Retorna |
|------|----------|---------|
| `useSetores()` | Listar setores do hospital | `data: { id, nome }[]` |
| `useProfissionais()` | Profissionais cadastrados | `data: Profile[]` |
| `useLogAccess()` | Logs de acesso do usuário | `data: LogAcesso[]` |

#### **Tempo Real & Sincronização**
| Hook | Propósito | Retorna |
|------|----------|---------|
| `useRealtimeSync(tables)` | Escuta mudanças em tempo real | invalidação automática de queries |
| `usePushNotifications()` | Notificações push do navegador | `{ subscribe, unsubscribe }` |

### 🔌 Padrão de Query com React Query
```typescript
// Padrão padrão em todos os hooks
function useExample() {
  return useQuery({
    queryKey: ['unique-key', deps],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_name')
        .select('*')
        .order('coluna', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,  // Cache por 5 min
  });
}
```

---

## 3️⃣ TABELAS DO BANCO DE DADOS (185 Migrations)

### 🗂️ Categorias de Tabelas

#### **A. Autenticação & Perfis** (7 tabelas)
```
┌─ profiles
│  └─ Dados pessoais do usuário
├─ user_roles
│  └─ Roles do aplicativo por usuário
├─ perfis_sistema
│  └─ Perfis RBAC do sistema
├─ usuario_perfil
│  └─ Vínculo usuário ← → perfil
├─ modulos_sistema
│  └─ Módulos/features do sistema
├─ ferramentas_modulo
│  └─ Ações/ferramentas por módulo
└─ logs_permissoes
   └─ Auditoria de mudanças de permissões
```

#### **B. NIR / Leitos** (4 tabelas)
```
├─ bed_records
│  ├─ Patient name, diagnosis, discharge info
│  ├─ shift_date, shift_type (diurno/noturno)
│  └─ Carryover automático entre turnos
├─ shift_configurations
│  └─ Setup: médicos, enfermeiros, regulador NIR
├─ setores
│  └─ Unidades: Enfermaria M/F, Pediatria, Isolamento, Urgência
└─ cargos
   └─ Posições: Médico, Enfermeiro, Técnico
```

#### **C. Enfermagem** (4 tabelas)
```
├─ enfermagem_escalas
│  ├─ Profissional, data, período (M/T/N)
│  └─ Status: confirmada/cancelada/pendente
├─ enfermagem_trocas
│  ├─ Ofertante, aceitante, status
│  └─ Com FK para escala
├─ enfermagem_configuracoes
│  └─ Parâmetros de funcionamento
└─ escalas_medicos
   └─ Escalas específicas de médicos
```

#### **D. Indicadores** (6 tabelas)
```
├─ indicadores_upa
│  ├─ Estrutura, Processo, Resultado, Gestão
│  └─ Meta, valor, unidade_medida
├─ indicadores_nsp
│  └─ Indicadores de Segurança do Paciente
├─ indicadores_conformidade
│  └─ Análise de conformidade com metas
├─ planos_acao_indicadores
│  └─ Ações corretivas por indicador
├─ analises_criticas
│  └─ Análise crítica do performance
└─ daily_statistics
   └─ Agregação diária de KPIs
```

#### **E. Incidentes & Qualidade** (7 tabelas)
```
├─ incidentes_nsp
│  ├─ Reporte de segurança do paciente
│  └─ Status, severidade, investigação
├─ analises_incidentes
│  └─ Root cause analysis
├─ acoes_incidentes
│  └─ Planos de ação gerados
├─ auditorias_qualidade
│  └─ Auditorias periódicas
├─ achados_auditoria
│  └─ Não conformidades encontradas
├─ auditorias_seguranca_paciente
│  └─ Auditorias específicas de segurança
└─ alertas_seguranca
   └─ Alertas em tempo real
```

#### **F. Prontuário & Faturamento** (5 tabelas)
```
├─ prontuarios
│  ├─ Registro mestre de atendimento
│  └─ Número, paciente, data, status
├─ saida_prontuarios
│  ├─ Fluxo entre setores
│  └─ Tracking de localização
├─ avaliacoes_prontuarios
│  └─ QA/auditoria de prontuários
├─ historico_prontuarios
│  └─ Versioning e histórico
└─ movimentacoes_prontuarios
   └─ Rastreabilidade de movimentos
```

#### **G. RH & DP** (6 tabelas)
```
├─ atestados
│  └─ Atestados médicos
├─ banco_horas
│  ├─ Saldo de horas por funcionário
│  └─ Entrada/saída creditada/debitada
├─ avaliacoes_desempenho
│  ├─ Performance reviews
│  └─ Competências, metas atingidas
├─ avaliacoes_experiencia
│  └─ Feedback 360°
├─ gestor_cargos
│  └─ Vínculo gestor ← → cargos supervisionados
└─ disc_results
   └─ Resultados teste DISC
```

#### **H. Restaurante** (5 tabelas)
```
├─ cardapios
│  ├─ Menu por tipo refeição
│  └─ Data vigência
├─ refeicoes_registros
│  ├─ Refeições preparadas/servidas por dia
│  └─ Quantidade por categoria
├─ colaboradores_restaurante
│  └─ Equipe específica restaurante
├─ quantitativo_ajustes
│  └─ Ajustes manuais de quantitativo
└─ alergias_intolerancias
   └─ Restrições dietéticas
```

#### **I. Chat & Comunicação** (4 tabelas)
```
├─ chat_conversas
│  └─ Thread/conversa principal
├─ chat_mensagens
│  ├─ Mensagem individual
│  └─ Com suporte a arquivo
├─ chat_participantes
│  └─ Membros da conversa
└─ agenda_items
   ├─ Tarefas, reuniões, anotações
   ├─ Prioridade, status
   └─ Com destinatários
```

#### **J. Assistência Social** (2 tabelas)
```
├─ assistencia_social_pacientes
│  └─ Dados de cadastro/acompanhamento
└─ assistencia_social_atendimentos
   ├─ Registro de atendimentos
   └─ Tipo, duração, observações
```

#### **K. Rouparia** (3 tabelas)
```
├─ rouparia_itens
│  ├─ Inventário de peças
│  └─ Localização, quantidade
├─ rouparia_movimentacoes
│  └─ Entrada/saída de itens
└─ rouparia_manutencao
   └─ Reparo/descarte de peças
```

#### **L. Ativos & Manutenção** (4 tabelas)
```
├─ ativos
│  ├─ Equipamentos/infraestrutura
│  ├─ Localização, número de série
│  └─ Status operacional
├─ manutencoes_preventivas
│  ├─ Agendamento de manutenção
│  └─ Periodicidade
├─ manutencoes_corretivas
│  └─ Reparo em resposta a defeito
└─ pedidos_compra
   ├─ Gestão de compras
   └─ Status: solicitado/aprovado/recebido
```

#### **M. Estoque & Compras** (2 tabelas)
```
├─ produtos
│  ├─ Catálogo: nome, código, categoria
│  └─ Quantidades min/atual
└─ movimentacoes_estoque
   ├─ Entrada/saída de itens
   └─ Rastreabilidade por usuário/setor
```

#### **N. LMS (Treinamentos)** (3 tabelas)
```
├─ lms_treinamentos
│  ├─ Curso/módulo de aprendizagem
│  └─ Conteúdo, min conceito aprovação
├─ lms_participantes
│  └─ Inscrição, progresso, resultado
└─ lms_certificados
   └─ Certificados emitidos
```

#### **O. Logs & Auditoria** (3 tabelas)
```
├─ logs_acesso
│  ├─ IP, user_id, módulo acessado
│  └─ Timestamp de entrada/saída
├─ validation_logs
│  └─ Histórico de validações de dados
└─ integrity_alerts
   └─ Alertas de integridade gerados
```

### 📊 Resumo de Tabelas
- **Total de Tabelas:** 60+
- **Total de Views:** 5+
- **Total de Functions:** 40+
- **Total de Triggers:** 25+
- **Total de RLS Policies:** 150+

---

## 4️⃣ AUTENTICAÇÃO & AUTORIZAÇÃO POR ROLES

### 🔐 Arquitetura de Segurança

#### **Modelo de Autenticação**
```
┌─────────────────────────────────────────────────┐
│       Supabase Auth (Firebase-like)             │
│    ↓                                             │
│  auth.users (tabela do Auth0)                   │
│    ↓                                             │
│  ┌──────────────────────────────────────────┐   │
│  │ profiles (dados do usuário)              │   │
│  │  ├─ id (UUID PK)                         │   │
│  │  ├─ user_id (FK auth.users)              │   │
│  │  ├─ full_name                            │   │
│  │  ├─ cargo                                │   │
│  │  └─ setor                                │   │
│  └──────────────────────────────────────────┘   │
│    ↓                                             │
│  ┌──────────────────────────────────────────┐   │
│  │ user_roles (roles do user)               │   │
│  │  ├─ user_id (FK auth.users)              │   │
│  │  ├─ role (enum app_role)                 │   │
│  │  └─ UNIQUE(user_id, role)                │   │
│  └──────────────────────────────────────────┘   │
│    ↓                                             │
│  ┌──────────────────────────────────────────┐   │
│  │ usuario_perfil (new RBAC)                │   │
│  │  ├─ user_id (FK auth.users)              │   │
│  │  ├─ perfil_id (FK perfis_sistema)        │   │
│  │  └─ UNIQUE(user_id, perfil_id)           │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### **Enum app_role** (13 roles)
```sql
CREATE TYPE app_role AS ENUM (
    'admin',                 -- Acesso total
    'gestor',               -- Gerencia equipe
    'funcionario',          -- Usuário padrão
    'nir',                  -- Núcleo de Internação
    'faturamento',          -- Departamento de Faturamento
    'enfermagem',           -- Equipe de Enfermagem
    'recepcao',             -- Recepção/Acolhimento
    'classificacao',        -- Triagem/Classificação Risco
    'ti',                   -- Departamento TI
    'manutencao',           -- Manutenção/Engenharia
    'engenharia_clinica',   -- Engenharia Clínica
    'laboratorio',          -- Laboratório
    'rh'                    -- Recursos Humanos
);
```

### 🛡️ Funções de Segurança (Security Definer)

#### **1. has_role(_user_id UUID, _role app_role)**
```sql
-- Verifica se usuário tem uma role específica
-- Retorna BOOLEAN
-- Permite verificação:
--   ✓ Próprio usuário (sempre)
--   ✓ Admins (de qualquer um)
--   ✗ Outros usuários (negado)
```

#### **2. get_user_role(_user_id UUID)**
```sql
-- Obtém role primária do usuário
-- Retorna app_role (primeira encontrada)
-- Usado como fallback para RPC quando RLS nega
```

#### **3. usuario_pode_acessar_modulo(_user_id UUID, _modulo_codigo TEXT)**
```sql
-- Verifica se usuário pode acessar módulo
-- Retorna JSONB com:
--   ├─ pode_visualizar: BOOLEAN
--   ├─ pode_acessar: BOOLEAN
--   └─ comportamento: 'ocultar' | 'desabilitar'
```

#### **4. obter_permissoes_usuario(_user_id UUID)**
```sql
-- Retorna todas as permissões consolidadas
-- Retorna JSONB:
-- {
--   "perfis": [...],
--   "modulos": {
--     "nir": { "pode_visualizar": true, "pode_acessar": true },
--     "chat": { "pode_visualizar": true, "pode_acessar": false }
--   },
--   "ferramentas": {...}
-- }
```

### 🔑 Row Level Security (RLS) - Estratégias

#### **Padrão 1: Acesso Próprio**
```sql
-- Usuário vê apenas seus próprios registros
CREATE POLICY "user_own_data"
ON table_name FOR SELECT
USING (auth.uid() = user_id);
```

#### **Padrão 2: Acesso por Role**
```sql
-- Admins e gestores veem tudo
CREATE POLICY "admin_gestores_all"
ON table_name FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role)
);
```

#### **Padrão 3: Acesso por Setor**
```sql
-- Usuário vê dados do seu setor
CREATE POLICY "setor_access"
ON table_name FOR SELECT
USING (
    setor = (
        SELECT setor FROM profiles
        WHERE user_id = auth.uid()
    )
);
```

#### **Padrão 4: Acesso por Role de Departamento**
```sql
-- Cada departamento gerencia seus dados
CREATE POLICY "depart_specific"
ON produtos FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    (has_role(auth.uid(), 'ti'::app_role) 
     AND setor_responsavel = 'ti')
);
```

### 🔄 Fluxo de Autenticação no Frontend

#### **useUserRole() Hook**
```typescript
// 1. Tenta ler diretamente user_roles (quando RLS permite)
// 2. Se falhar, chama RPC get_user_role() como fallback
// 3. Resolve primaryRole (prioridade: admin > gestor > outros)
// 4. Retorna { roles[], primaryRole, isLoading }

const { primaryRole } = useUserRole();

// Usa para:
if (primaryRole === 'admin') {
  // Mostrar painel administrativo
}
```

#### **usePermissoes() Hook**
```typescript
// 1. Chama RPC obter_permissoes_usuario()
// 2. Retorna todas as permissões consolidadas
// 3. Usado para renderização condicional de UI

const { canAccess, canWrite } = usePermissoes();

// Usa para:
{canAccess('nir') && <NIRModule />}
{canWrite('chamados') && <BadgeCriar />}
```

### 🆕 Sistema Novo: RBAC Granular (perfis_sistema)

#### **Evolução de Segurança**
```
OLD (Baseado apenas em user_roles.role)
└─ 13 roles fixas → muita rigidez

NEW (Baseado em perfis_sistema customizáveis)
├─ Perfis customizáveis
├─ Módulos associados
├─ Ferramentas fine-grained
└─ Permissões granulares
```

#### **Perfis Pré-configurados**
```sql
INSERT INTO perfis_sistema (nome, is_sistema, is_master) VALUES
    ('Administrador', true, true),    -- Master
    ('Gestor', true, false),          -- Super user
    ('NIR', true, false),             -- Triagem/Internação
    ('Faturamento', true, false),     -- Faturamento
    ('Enfermagem', true, false),      -- Enfermagem
    ('Recepção', true, false),        -- Acolhimento
    ('Classificação', true, false),   -- Triagem Risco
    ('TI', true, false),              -- TI/Suporte
    ('Manutenção', true, false),      -- Manutenção
    ('Engenharia Clínica', true, false),
    ('Laboratório', true, false),
    ('RH/DP', true, false),
    ('Funcionário', true, false);     -- Acesso básico
```

#### **Hierarquia de Permissões**
```
┌─ Perfil
│  └─ Módulos permitidos
│     └─ Ferramentas disponíveis
│        ├─ pode_visualizar
│        ├─ pode_acessar
│        ├─ pode_escrever
│        └─ comportamento_sem_acesso: 'ocultar' | 'desabilitar'
```

---

## 5️⃣ TIPOS DE DADOS CAPTURADOS

### 📋 Visão Geral de Dados por Domínio

#### **A. PACIENTES & ATENDIMENTOS**

**Dados Capturados:**
```
┌─ NIR (Núcleo de Internação)
│  ├─ Identificação: nome, data nascimento, CPF
│  ├─ Internação: data, motivo, hipótese diagnóstica
│  ├─ Localização: leito, setor, turno
│  ├─ Status: ativo, alta, transferência, óbito
│  ├─ Saúde: hipótese diagnóstica, observações clínicas
│  └─ Triage: SUS Fácil, CTI, motivoAlta
│
├─ Prontuários
│  ├─ Número único do prontuário
│  ├─ Histórico de movimentação entre setores
│  ├─ Saídas registradas (localização atual)
│  ├─ Avaliação de conformidade (QA)
│  └─ Arquivamento/faltante
│
└─ Assistência Social
   ├─ Dados sociodemográficos
   ├─ Registro de atendimentos
   ├─ Referências/contrarreferências
   └─ Observações de acompanhamento
```

**Volume:** ~2000-5000 registros ativos  
**Frequência Atualização:** Em tempo real (leitos), diária (prontuários)

---

#### **B. ENFERMAGEM & ESCALAS**

**Dados Capturados:**
```
┌─ Escalas de Enfermagem
│  ├─ Profissional (ID, nome, cargo)
│  ├─ Data/período plantão (M/T/N)
│  ├─ Status (confirmada, cancelada, pendente)
│  ├─ Configuração: médicos, enfermeiros, regulador
│  └─ Turnos: diurno 7h-19h, noturno 19h-7h
│
└─ Trocas de Plantão
   ├─ Ofertante e aceitante
   ├─ Escala envolvida
   ├─ Status (aberta, aceita, recusada, pendente aprovação)
   └─ Auditoria: quem ofertou, quando, status
```

**Volume:** ~200-500 escalas/mês, ~50-100 trocas/mês  
**Frequência:** Entrada contínua, trocas sob demanda

---

#### **C. INDICADORES & QUALIDADE**

**Dados Capturados:**
```
┌─ Indicadores UPA (180+ tipos)
│  ├─ Categoria: Estrutura, Processo, Resultado, Gestão
│  ├─ Métricas
│  │  ├─ Número de leitos (emergência, observação, isolamento)
│  │  ├─ Staffing: enfermeiros, técnicos
│  │  ├─ Acolhimentos e atendimentos
│  │  ├─ Classificação de risco (azul, verde, amarelo, laranja, vermelho)
│  │  ├─ Perfil etário (RN, lactante, criança, adolescente, adulto, idoso)
│  │  ├─ Patologias por sistema (respiratória, GI, neurológica, cardiológica, etc.)
│  │  └─ CIDs por faixa etária (adulto, pediátrico)
│  ├─ Meta esperada (quando houver)
│  └─ Unidade de medida (número, percentual, dias)
│
├─ Indicadores NSP (Segurança)
│  ├─ Incidentes reportados
│  ├─ Severidade (LEVE, MODERADO, GRAVE, ÓBITO)
│  ├─ Análise de causa raiz
│  └─ Planos de ação
│
├─ Conformidade
│  ├─ Comparação meta vs. realizado
│  ├─ Variação percentual
│  └─ Status: conforme, não conforme, alerta
│
└─ Planos de Ação
   ├─ Análise crítica
   ├─ Fator causa
   ├─ Ação corretiva
   ├─ Responsável
   └─ Prazo
```

**Volume:** ~400-500 indicadores/mês (180+ tipos)  
**Frequência:** Mensalmente (agregação), diária (alguns KPIs)

---

#### **D. RECURSOS HUMANOS**

**Dados Capturados:**
```
┌─ Perfil do Colaborador
│  ├─ Identificação: nome, data nascimento, CPF
│  ├─ Profissão: cargo, setor, matricula
│  ├─ Status: ativo, afastado, demitido
│  └─ Contato: telefone, email
│
├─ Atestados Médicos
│  ├─ Data, validade
│  ├─ CID (diagnóstico)
│  └─ Número de dias
│
├─ Banco de Horas
│  ├─ Saldo por colaborador
│  ├─ Movimentação: entrada/saída creditada/debitada
│  └─ Histórico completo
│
├─ Avaliações de Desempenho
│  ├─ Competências avaliadas
│  ├─ Nota atribuída
│  ├─ Feedback
│  └─ Metas atingidas (%)
│
├─ Avaliações de Experiência (360°)
│  ├─ Feedback de pares
│  ├─ Feedback de superior
│  └─ Comentários
│
└─ DISC (Perfil Comportamental)
   ├─ Teste respondido: 66 questões
   ├─ Scores: D, I, S, C
   ├─ Perfil primário/secundário
   ├─ Score de liderança
   └─ Cargos sugeridos
```

**Volume:** ~300-500 colaboradores, 800-1200 indicadores/ano  
**Frequência:** Contínua, avaliações anuais, DISC sob demanda

---

#### **E. INCIDENTES & SEGURANÇA**

**Dados Capturados:**
```
┌─ Incidentes NSP (Segurança do Paciente)
│  ├─ Tipo: erro medicação, queda, infecção, outro
│  ├─ Severidade: leve, moderado, grave, óbito
│  ├─ Local: setor onde ocorreu
│  ├─ Envolvidos: profissionais, paciente
│  └─ Descrição/circunstâncias
│
├─ Análise de Incidente
│  ├─ Arvore de causa (root cause analysis)
│  ├─ Fatores contribuintes
│  ├─ Classificação
│  └─ Data análise
│
├─ Ações Corretivas
│  ├─ Ação proposta
│  ├─ Responsável
│  ├─ Prazo
│  ├─ Status (aberta, fechada, verificada)
│  └─ Resultado
│
├─ Auditorias de Qualidade
│  ├─ Tipo: compliance, processo, estrutura
│  ├─ Setor/processo auditado
│  ├─ Achados (conformidade/não conformidade)
│  ├─ Fotos/evidências
│  └─ Auditores
│
└─ Alertas de Segurança
   ├─ Tipo: acesso não autorizado, perda dados, outro
   ├─ Severidade
   ├─ Descrição
   └─ Status
```

**Volume:** ~20-50 incidentes/mês, ~5-10 auditorias/mês  
**Frequência:** Contínua (incidentes), agendada (auditorias)

---

#### **F. OPERACIONAL: ROUPARIA, RESTAURANTE, MANUTENÇÃO**

**Rouparia:**
```
├─ Itens: cama, roupa de cama, toalhas, aventais
├─ Quantidade por localização
├─ Movimentações: entrada/saída
├─ Status: operacional, em reparo, descartado
└─ Auditoria de saldos
```

**Restaurante:**
```
├─ Cardápio: tipo refeição, data vigência
├─ Preparação: quantidades por categoria
├─ Restrições: alergias, intolerancias dietéticas
├─ Registros diários: preparado, servido, descartado
└─ Ajustes de quantitativo
```

**Manutenção & Engenharia:**
```
├─ Ativos: equipamentos, infraestrutura
│  ├─ Número série, localização
│  ├─ Status operacional
│  └─ Histórico manutenção
├─ Manutenção Preventiva: agendamento, execução
├─ Manutenção Corretiva: chamados de defeito
└─ Pedidos de Compra: status, aprovações
```

**Volume:** ~100-200 movimentações/dia (rouparia, restaurante)  
**Frequência:** Diária

---

#### **G. COMUNICAÇÃO & COORDENAÇÃO**

**Dados Capturados:**
```
┌─ Chat
│  ├─ Conversas por grupo/tema
│  ├─ Participantes
│  ├─ Mensagens com timestamp
│  ├─ Arquivos anexados
│  └─ Busca/histórico
│
├─ Chamados
│  ├─ Número único
│  ├─ Categoria: TI, Manutenção, Engenharia
│  ├─ Prioridade: baixa, média, alta, urgente
│  ├─ Status: aberto, em andamento, resolvido
│  ├─ Solicitante e responsável
│  ├─ Comentários com auditoria
│  └─ SLA tracking
│
└─ Agenda
   ├─ Tipo: tarefa, reunião, anotação
   ├─ Prioridade e status
   ├─ Data/hora
   ├─ Destinatários
   └─ Notificações
```

**Volume:** ~500-1000 mensagens/dia, ~50-100 chamados/mês  
**Frequência:** Em tempo real

---

#### **H. APRENDIZAGEM (LMS)**

**Dados Capturados:**
```
├─ Treinamentos: código, nome, conteúdo, min conceito
├─ Participantes: inscrição, progresso, notas
├─ Certificados: emitidos, com validade
└─ Relatórios: conformidade treinamentos obrigatórios
```

**Volume:** ~500-1000 inscritos/ano  
**Frequência:** Contínua

---

#### **I. TESTES & AVALIAÇÕES**

**DISC (Teste Comportamental):**
```
├─ Teste: 66 questões (A, B, C, D)
├─ Scores: D (Dominância), I (Influência), S (Estabilidade), C (Conformidade)
├─ Perfil: primário (maior score), secundário (2º maior)
├─ Leadership Score: 1-25 (baseado em questões específicas)
└─ Identificação: nome, cargo, setor, formação, experiência liderança
```

**Volume:** ~200-300/ano (sob demanda)  
**Frequência:** Sob demanda

---

### 🎯 Resumo de Volumes de Dados

| Domínio | Tabelas | Registros/Mês | Freq. Atualização |
|---------|---------|---------------|------------------|
| Pacientes | 4 | 2-5K | Real-time |
| Enfermagem | 4 | 200-500 escalas | Contínua |
| Indicadores | 6 | 400-500 | Diária/Mensal |
| RH | 6 | 800-1.2K eventos | Contínua |
| Incidentes | 3 | 20-50 | Contínua |
| Operacional | 9 | 100-200/dia | Diária |
| Comunicação | 5 | 1K+ mensagens/dia | Real-time |
| LMS | 3 | 500-1K/ano | Contínua |
| Logs | 3 | 10K+ acesso/dia | Real-time |

---

### 🔐 Dados Sensíveis (LGPD/HIPAA)

```
PII (Personally Identifiable Information):
├─ Nome, CPF, RG
├─ Data de nascimento
├─ Email, telefone
├─ Endereço

PHI (Protected Health Information - HIPAA):
├─ Diagnósticos (CID)
├─ Prontuário número
├─ Alergias/intolerancias
├─ Status de HIV/AIDS/outra doença contagiosa
└─ Histórico de atestados

SUI (Special Unique Identifiers):
├─ Número de matrícula
└─ Número de prontuário

Controles Implementados:
├─ RLS (Row Level Security) por perfil
├─ Criptografia em repouso (Supabase)
├─ Criptografia em trânsito (HTTPS)
├─ Logs de acesso auditados
├─ MFA (Multi-Factor Authentication)
├─ Timeout de sessão
└─ Consentimento LGPD registrado
```

---

## 📐 ARQUITETURA TÉCNICA GERAL

### 🏗️ Stack Tecnológico
```
┌─────────────────────────────────────────────┐
│ Frontend (React/TypeScript)                 │
│ ├─ Vite (build tool)                        │
│ ├─ TailwindCSS + shadcn/ui (UI)             │
│ ├─ React Query (state management)           │
│ └─ Supabase JS Client                       │
├─────────────────────────────────────────────┤
│ Backend (Supabase)                          │
│ ├─ PostgreSQL 15+                           │
│ ├─ Built-in Auth (Supabase Auth)            │
│ ├─ Realtime subscriptions                   │
│ ├─ Row Level Security (RLS)                 │
│ └─ PL/pgSQL functions                       │
├─────────────────────────────────────────────┤
│ Deployment                                  │
│ ├─ GitHub Actions (CI/CD)                   │
│ └─ Netlify/Vercel (Frontend)                │
└─────────────────────────────────────────────┘
```

### 🔄 Fluxos de Dados Principais

```
USER LOGIN
  ↓
Supabase Auth.signInWithPassword()
  ↓
auth.users (session JWT)
  ↓
profiles + user_roles (RLS validates)
  ↓
useUserRole() hook
  ↓
UI components render based on roles
  ↓
CRUD operations with RLS enforcement

REAL-TIME UPDATES
  ↓
Table change (INSERT/UPDATE/DELETE)
  ↓
Trigger + Function
  ↓
Supabase Realtime channel
  ↓
useRealtimeSync() invalidates React Query
  ↓
UI refreshes
```

---

## ✅ CHECKLIST ARQUITETURAL

- [x] **30+ Módulos** operacionais
- [x] **185 Migrations** de banco de dados
- [x] **RLS Policies** em todas as tabelas sensíveis
- [x] **Security Definer** functions para autenticação
- [x] **LGPD Consent** tracking
- [x] **MFA** suportada
- [x] **Real-time Sync** por WebSocket
- [x] **Data Validation** hooks
- [x] **Audit Logging** por usuário/ação
- [x] **Role-based Access Control** (RBAC)
- [x] **Session Timeout** segurança
- [x] **Error Boundaries** para tolerância a falhas
- [x] **Custom Hooks** para cada domínio

---

## 📞 REFERÊNCIAS RÁPIDAS

### Diretórios Chave
```
src/
├─ types/              # Tipagem centralizada
├─ hooks/              # 23+ custom hooks
├─ components/         # Componentes por módulo (30+)
├─ lib/                # Utilities, validators
├─ integrations/       # Supabase client
└─ pages/              # Rotas/páginas

supabase/
├─ migrations/         # 185 .sql files
└─ functions/          # Edge functions (optional)

public/
└─ *.sql               # Backups do schema
```

### Migrações Importantes
- `20260112162151` - Auth setup (profiles, user_roles, RLS)
- `20260112182955` - Products, chamados, inventory
- `20260112173640` - Prontuários, faturamento
- `20260113141431` - Setores, cargos, gestores
- `20260113142213` - Agenda, chat
- `20260204124318` - **RBAC System** (perfis_sistema, modulos, ferramentas)

### Documentação Adicional
- [DOCUMENTACAO_TECNICA.md](DOCUMENTACAO_TECNICA.md)
- [ROADMAP_IMPLEMENTACAO.md](ROADMAP_IMPLEMENTACAO.md)
- [DATA_INTEGRITY_VALIDATION.md](DATA_INTEGRITY_VALIDATION.md)
- [PII_ENCRYPTION_IMPLEMENTATION.md](PII_ENCRYPTION_IMPLEMENTATION.md)

---

**Última Atualização:** 19/03/2026  
**Próximos Passos:** Implementação de mais validações, relatórios avançados, mobile app

