# Análise Detalhada: Roles, Gerentes/Supervisores e Workflows de Aprovação

**Data de Análise**: 24 de março de 2026  
**Projeto**: Gestrategic / UPA 24h  
**Foco**: Estrutura de papéis, relações hierárquicas e sistema de aprovações

---

## 1. DEFINIÇÃO DE ROLES (APP_ROLE ENUM)

### 1.1 Roles Implementados

O sistema utiliza um tipo ENUM PostgreSQL chamado `app_role` que define todos os papéis administrativos:

```sql
CREATE TYPE public.app_role AS ENUM (
  'admin',                    -- Administrador - acesso total
  'gestor',                   -- Gestor de operações/pessoas
  'funcionario',              -- Funcionário genérico
  'recepcao',                 -- Recepção/Triagem
  'classificacao',            -- Classificação de risco
  'nir',                      -- Núcleo de Internação e Regulação
  'faturamento',              -- Faturamento
  'ti',                       -- Tecnologia da Informação
  'manutencao',               -- Manutenção
  'engenharia_clinica',       -- Engenharia Clínica
  'laboratorio',              -- Laboratório
  'restaurante',              -- Restaurante
  'rh_dp',                    -- RH / Desenvolvimento de Pessoas
  'assistencia_social',       -- Assistência Social
  'qualidade',                -- Qualidade / Auditoria
  'nsp',                      -- NSP (Núcleo de Segurança do Paciente)
  'seguranca',                -- Segurança
  'enfermagem',               -- Equipe de enfermagem
  'medicos'                   -- Médicos / Médicos plantonistas
);
```

### 1.2 Roles Especializados para Gerência

Além dos roles acima, há roles **específicos de supervisão** para certos departamentos:

```sql
-- Adicionados em: migrations/20260319102945_...
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gerente_administrativo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'farmaceutico_rt';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenador_medico';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor_operacional';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenador_enfermagem';
```

**Significado especializados:**
- **`coordenador_enfermagem`** - Supervisor de equipe de enfermagem (aprova trocas, extensões de jornada, justificativas)
- **`coordenador_medico`** - Supervisor de médicos (aprova atividades médicas)
- **`gerente_administrativo`** - Gerente de setor administrativo
- **`supervisor_operacional`** - Supervisor de operações gerais
- **`farmaceutico_rt`** - Farmacêutico responsável técnico

### 1.3 Mapeamento no Frontend

Arquivo: [src/hooks/useUserRole.ts](src/hooks/useUserRole.ts#L150-L180)

```typescript
const isAdmin = state.roles.includes("admin");
const isGestor = state.roles.includes("gestor");
const isEnfermagem = state.roles.includes("enfermagem");
const isCoordenadorEnfermagem = state.roles.includes("coordenador_enfermagem");
const isCoordenadorMedico = state.roles.includes("coordenador_medico");
const isSupervisorOperacional = state.roles.includes("supervisor_operacional");
const isGerenteAdministrativo = state.roles.includes("gerente_administrativo");
// ... mais 19 roles
```

---

## 2. ESTRUTURA DE RELAÇÃO GERENTE-SUBORDINADO

### 2.1 Tabelas de Vinculação

A relação **gerente → subordinados** é estabelecida através de **duas tabelas separadas**:

#### Tabela: `gestor_setores`
```sql
CREATE TABLE public.gestor_setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_user_id uuid NOT NULL,        -- ID do gerente/gestor
  setor_id uuid NOT NULL,              -- ID do setor que o gestor gerencia
  created_at timestamp DEFAULT now(),
  created_by uuid
);
```

**Significado:**
- Um gestor pode gerenciar **1 ou múltiplos setores**
- Todos os colaboradores com setor = `gestor_setores.setor` ficam sob sua gestão
- Exemplo: Gestor "João" gerencia setores "Enfermagem" e "Recepção"

#### Tabela: `gestor_cargos`
```sql
CREATE TABLE public.gestor_cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_user_id uuid NOT NULL,        -- ID do gerente/gestor
  cargo_id uuid NOT NULL,              -- ID do cargo que o gestor gerencia
  created_at timestamp DEFAULT now(),
  created_by uuid
);
```

**Significado:**
- Um gestor pode gerenciar **1 ou múltiplos cargos**
- Todos os colaboradores com cargo = `gestor_cargos.cargo` ficam sob sua gestão
- Exemplo: Gestor "Maria" gerencia cargos "Técnico de Enfermagem" e "Enfermeiro"

### 2.2 Relação com Colaboradores

Arquivo: [src/components/admin/GestoresVinculacao.tsx](src/components/admin/GestoresVinculacao.tsx)

A **relação é consultada via a tabela `profiles`** que armazena:

```sql
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  full_name text,
  cargo text,                  -- Nome do cargo (não UUID)
  setor text,                  -- Nome do setor (não UUID)
  -- ... outros campos
);
```

**Fluxo de Associação:**

```
GESTOR (user_id = "abc-123")
  ↓
gestor_setores (gestor_user_id = "abc-123", setor_id = <uuid_enfermagem>)
  ↓ (via profiles.setor = "Enfermagem")
SUBORDINADOS (profiles.setor = "Enfermagem")
```

### 2.3 Funções SQL para Validação de Hierarquia

Arquivo: [public/rls-functions-triggers-export.sql](public/rls-functions-triggers-export.sql#L323-L375)

#### Função: `gestor_gerencia_usuario()`
```sql
CREATE OR REPLACE FUNCTION public.gestor_gerencia_usuario(_gestor_id uuid, _usuario_id uuid)
RETURNS boolean AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.gestor_setores gs ON gs.gestor_user_id = _gestor_id
        JOIN public.setores s ON s.id = gs.setor_id AND s.nome = p.setor
        WHERE p.user_id = _usuario_id
    )
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.gestor_cargos gc ON gc.gestor_user_id = _gestor_id
        JOIN public.cargos c ON c.id = gc.cargo_id AND c.nome = p.cargo
        WHERE p.user_id = _usuario_id
    )
$function$;
```

**O que faz:** Retorna `true` se um gerente gerencia um usuário específico (pelo setor OU cargo)

#### Função: `get_usuarios_sob_gestao()`
```sql
CREATE OR REPLACE FUNCTION public.get_usuarios_sob_gestao(_gestor_id uuid)
RETURNS TABLE(user_id uuid, full_name text, cargo text, setor text) AS $function$
    SELECT DISTINCT p.user_id, p.full_name, p.cargo, p.setor
    FROM public.profiles p
    WHERE (
        EXISTS (
            SELECT 1 FROM public.gestor_setores gs
            JOIN public.setores s ON s.id = gs.setor_id AND s.nome = p.setor
            WHERE gs.gestor_user_id = _gestor_id
        )
        OR EXISTS (
            SELECT 1 FROM public.gestor_cargos gc
            JOIN public.cargos c ON c.id = gc.cargo_id AND c.nome = p.cargo
            WHERE gc.gestor_user_id = _gestor_id
        )
    )
    AND p.user_id != _gestor_id
$function$;
```

**O que faz:** Retorna TODOS os subordinados de um gerente específico

---

## 3. COMPONENTES DE APROVAÇÃO

### 3.1 Fluxo Geral de Aprovação

O sistema possui **3 fluxos principais de aprovação** focados em **Enfermagem**:

```
ENFERMAGEM
├── Trocas de Plantão (AprovacaoTrocas)
├── Extensão de Jornada (AprovacaoExtensaoJornada)
└── Justificativas de Ponto (AprovacaoPontoJustificativa)
```

---

### 3.2 Aprovação de Trocas de Plantão

**Arquivo**: [src/components/enfermagem/AprovacaoTrocas.tsx](src/components/enfermagem/AprovacaoTrocas.tsx)

**Tabela de Dados**: `enfermagem_trocas`

```sql
CREATE TABLE public.enfermagem_trocas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id uuid NOT NULL,
  ofertante_id uuid NOT NULL,          -- Quem está ofertando a troca
  ofertante_nome text NOT NULL,
  aceitante_id uuid,                   -- Quem aceitou
  aceitante_nome text,
  motivo_oferta text,
  status text DEFAULT 'aberta',        -- 'aberta', 'aceita', 'pendente_aprovacao', 'aprovada', 'rejeitada'
  requer_aprovacao boolean DEFAULT true,
  aprovador_id uuid,                   -- Quem aprovou (coordenador)
  aprovador_nome text,
  data_aprovacao timestamp with time zone,
  justificativa_rejeicao text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

**Estados da Troca:**
1. `'aberta'` - Oferta inicial criada
2. `'aceita'` - Outro profissional aceitou
3. `'pendente_aprovacao'` - Aguardando revisão do coord. de enf.
4. `'aprovada'` - Coordenador aprovou ✅
5. `'rejeitada'` - Coordenador rejeitou ❌
6. `'cancelada'` - Cancelada por um dos profissionais
7. `'expirada'` - Expirou o prazo

**Fluxo UI:**

```typescript
export function AprovacaoTrocas({ userId, userName }: AprovacaoTrocasProps) {
  const { data: trocasPendentes = [] } = useTrocasPendentes();
  
  // Obtém trocas que precisam aprovação (status = 'pendente_aprovacao')
  // Mostra para o COORDENADOR DE ENFERMAGEM
  
  const handleAprovar = (trocaId) => {
    // Atualiza troca:
    // - status = 'aprovada'
    // - aprovador_id = userId
    // - data_aprovacao = now()
  };
  
  const handleRejeitar = (trocaId, justificativa) => {
    // Atualiza troca:
    // - status = 'rejeitada'
    // - aprovador_id = userId
    // - justificativa_rejeicao = justificativa
    // - data_aprovacao = now()
  };
}
```

**Quem pode aprovar?**
- `coordenador_enfermagem` role
- Configurável via `requer_aprovacao_troca` em `enfermagem_configuracoes`

---

### 3.3 Aprovação de Extensão de Jornada

**Arquivo**: [src/components/enfermagem/AprovacaoExtensaoJornada.tsx](src/components/enfermagem/AprovacaoExtensaoJornada.tsx)

**Tabela de Dados**: `justificativas_extensao_jornada`

```sql
CREATE TABLE public.justificativas_extensao_jornada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_user_id uuid NOT NULL,
  colaborador_nome text NOT NULL,
  colaborador_cargo text,
  colaborador_setor text,
  data_extensao date NOT NULL,
  hora_inicio_extra text NOT NULL,      -- "14:00"
  hora_fim_extra text NOT NULL,          -- "18:30"
  minutos_extras integer DEFAULT 0,
  motivo text NOT NULL,
  justificativa text NOT NULL,
  status text DEFAULT 'pendente',       -- 'pendente', 'aprovado', 'rejeitado'
  aprovado_por uuid,                    -- Quem aprovou (coordenador)
  aprovado_por_nome text,
  aprovado_em timestamp with time zone,
  observacao_aprovador text,            -- Comentário do aprovador
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

**Fluxo UI:**

```typescript
export function AprovacaoExtensaoJornada() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState("pendente");  // Filter options
  
  const loadSolicitacoes = async () => {
    // Carrega justificativas_extensao_jornada ordenadas por data
    // Permite filtrar por status: "pendente", "aprovado", "rejeitado", "todos"
  };
  
  const handleAction = async (status: "aprovado" | "rejeitado") => {
    // Atualiza solicitação:
    // - status: "aprovado" | "rejeitado"
    // - aprovado_por: user.id
    // - aprovado_por_nome: user.full_name
    // - aprovado_em: now()
    // - observacao_aprovador: (opcional)
  };
}
```

**Quem pode aprovar?**
- `coordenador_enfermagem` role
- `rh_dp` role
- `admin` role

---

### 3.4 Aprovação de Justificativas de Ponto

**Arquivo**: [src/components/enfermagem/AprovacaoPontoJustificativa.tsx](src/components/enfermagem/AprovacaoPontoJustificativa.tsx)

**Tabela de Dados**: `justificativas_ponto`

```sql
CREATE TABLE public.justificativas_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade text DEFAULT 'UPA ANTONIO JOSE DOS SANTOS',
  setor text,
  colaborador_nome text NOT NULL,
  cargo_funcao text,
  matricula text,
  colaborador_user_id uuid,
  data_ocorrencia date NOT NULL,
  jornada_contratual_entrada time,      -- "07:00"
  jornada_contratual_saida time,         -- "19:00"
  jornada_registrada_entrada time,       -- "07:15" (atrasou 15 min)
  jornada_registrada_saida time,         -- "19:00"
  minutos_excedentes integer DEFAULT 0,
  justificativa text,                   -- Por que atrasou?
  observacoes text,
  registrado_por uuid,
  registrado_por_nome text,
  status text DEFAULT 'pendente',       -- 'pendente', 'aprovado', 'reprovado'
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  aprovado_por uuid,                    -- Quem aprovou
  aprovado_por_nome text,
  aprovado_em timestamp with time zone,
  justificativa_aprovacao text          -- Por que o aprovador aprovou/reprovou
);
```

**Fluxo UI - Separação em 2 abas:**

```typescript
export const AprovacaoPontoJustificativa = () => {
  const { data: registros = [] } = useQuery({
    queryKey: ["justificativas_ponto_aprovacao"],
    queryFn: async () => {
      const { data } = await supabase
        .from("justificativas_ponto")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });
  
  // Divide em 2 seções
  const pendentes = registros.filter(r => r.status === "pendente");
  const processados = registros.filter(r => r.status !== "pendente");
  
  // UI mostra PENDENTES na aba de aprovação
  // Cada linha tem: [Colaborador] [Setor] [Min. Excedentes] [Status] [Ações]
  
  const handleAprovar = async (decisao: "aprovado" | "reprovado") => {
    const { error } = await supabase
      .from("justificativas_ponto")
      .update({
        status: decisao,
        aprovado_por: user.id,
        aprovado_por_nome: user.full_name,
        aprovado_em: now(),
        justificativa_aprovacao: observacao_do_aprovador
      })
      .eq("id", record.id);
  };
};
```

**Quem pode aprovar?**
- `coordenador_enfermagem` role
- `rh_dp` role
- `gestor` role (para sua equipe, via `gestor_gerencia_usuario()`)
- `admin` role

---

## 4. POLÍTICAS DE ACESSO (RLS)

### 4.1 Políticas para Gestores

```sql
-- Políticas para tabela 'gestor_setores' e 'gestor_cargos'
ALTER TABLE public.gestor_setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia vínculos de setores" 
  ON public.gestor_setores FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
  
CREATE POLICY "Gestor vê próprias vinculações"
  ON public.gestor_setores FOR SELECT TO authenticated
  USING (gestor_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
```

### 4.2 Políticas para Trocas de Plantão

```sql
ALTER TABLE public.enfermagem_trocas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profissionais veem trocas que envolvem"
  ON public.enfermagem_trocas FOR SELECT TO authenticated
  USING (
    ofertante_id = auth.uid() 
    OR aceitante_id = auth.uid()
    OR has_role(auth.uid(), 'coordenador_enfermagem'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Coordenador aprova trocas"
  ON public.enfermagem_trocas FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'coordenador_enfermagem'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'coordenador_enfermagem'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
```

### 4.3 Políticas para Justificativas

```sql
ALTER TABLE public.justificativas_ponto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Funcionário vê próprias justificativas"
  ON public.justificativas_ponto FOR SELECT TO public
  USING (colaborador_user_id = auth.uid());

CREATE POLICY "Gestor vê justificativas de sua equipe"
  ON public.justificativas_ponto FOR SELECT TO public
  USING (
    has_role(auth.uid(), 'gestor'::app_role) 
    AND gestor_gerencia_usuario(auth.uid(), colaborador_user_id)
  );

CREATE POLICY "RH_DP e Admin gerenciam justificativas"
  ON public.justificativas_ponto FOR ALL TO public
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));
```

---

## 5. CONFIGURAÇÕES POR DEPARTAMENTO

### 5.1 Tabela: `enfermagem_configuracoes`

```sql
CREATE TABLE public.enfermagem_configuracoes (
  id uuid PRIMARY KEY,
  chave text UNIQUE NOT NULL,
  valor text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

**Configurações Disponíveis:**

```
chave: 'requer_aprovacao_troca'
valor: 'true' ou 'false'
-- Quando true: trocas vão para 'pendente_aprovacao' antes de serem efetivadas
-- Quando false: trocas são aprovadas automaticamente (sem supervisor)

chave: 'prazo_oferecimento_troca'
valor: número de dias
-- Quantos dias antes a troca deve ser oferecida

chave: 'permitir_auto_substituicao'
valor: 'true' ou 'false'
-- Se true: Um prof. pode cobrir por outro sem supervisor
```

---

## 6. RESUMO VISUAL: FLUXO DE APROVAÇÃO EM ENFERMAGEM

```
┌─────────────────────────────────────────────────────────────┐
│  MÓDULO ENFERMAGEM → Abas (para coordenador_enfermagem)    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ├─ [Minhas Escalas]                                       │
│  │  │  Mostra escalas do usuário logado                    │
│  │  └─ [Oferecer troca de plantão]                         │
│  │                                                         │
│  ├─ [Trocas Disponíveis]                                   │
│  │  │  Mostra trocas oferecidas por outros profissionais   │
│  │  └─ [Aceitar troca]                                    │
│  │                                                         │
│  ├─ [Histórico de Trocas]                                  │
│  │  │  Mostra aprovadas, rejeitadas, etc.                 │
│  │                                                         │
│  ├─ ⭐ [APROVAÇÕES] (apenas para coordenador)               │
│  │  │                                                     │
│  │  ├─ [Trocas Aguardando Aprovação]                       │
│  │  │  └─ For each troca with status='pendente_aprovacao':│
│  │  │     - [APROVAR] → status='aprovada', data_aprv=now  │
│  │  │     - [REJEITAR] → status='rejeitada', msg motivo   │
│  │  │                                                     │
│  │  ├─ [Extensão de Jornada]                               │
│  │  │  └─ For each ext. with status='pendente':           │
│  │  │     - [APROVAR] → status='aprovado'                 │
│  │  │     - [REJEITAR] → status='rejeitado' + msg         │
│  │  │                                                     │
│  │  └─ [Justificativas de Ponto/Atraso]                    │
│  │     └─ For each justificativa with status='pendente':  │
│  │        - APROVAR ou REPROVAR com observações           │
│  │        - status='aprovado' ou 'reprovado'              │
│  │                                                         │
│  └─ [Configurações de Escalas]                             │
│     - Requer aprovação para trocar plantões (sim/não)     │
│     - Prazo mínimo para ofertar troca                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. COMPONENTES RELACIONADOS

### 7.1 Hook para Trocas

Arquivo: [src/hooks/useEnfermagem.ts](src/hooks/useEnfermagem.ts)

```typescript
// Retorna trocas pendenges DE APROVAÇÃO
export function useTrocasPendentes() {
  return useQuery({
    queryKey: ["trocas_pendentes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("enfermagem_trocas")
        .select(`
          id, status, data_aprovacao,
          ofertante_id, ofertante_nome,
          aceitante_id, aceitante_nome,
          escala: enfermagem_escalas (...)
        `)
        .eq("status", "pendente_aprovacao")
        .order("created_at", { ascending: false });
      return data || [];
    }
  });
}

// Mutation para aprovar/rejeitar
export function useAprovarTroca() {
  return useMutation({
    mutationFn: async (payload) => {
      const { trocaId, aprovadorId, aprovado, justificativa } = payload;
      return supabase
        .from("enfermagem_trocas")
        .update({
          status: aprovado ? "aprovada" : "rejeitada",
          aprovador_id: aprovadorId,
          data_aprovacao: new Date().toISOString(),
          justificativa_rejeicao: justificativa || null
        })
        .eq("id", trocaId);
    }
  });
}
```

### 7.2 Integração no Módulo Enfermagem

Arquivo: [src/components/modules/EnfermagemModule.tsx](src/components/modules/EnfermagemModule.tsx#L290-L310)

```typescript
export default function EnfermagemModule() {
  const { role } = useUserRole();
  const isGestor = role === 'admin' || role === 'gestor' || role === 'coordenador_enfermagem';
  
  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value="minhas-escalas">Minhas Escalas</TabsTrigger>
        <TabsTrigger value="trocas-disponiveis">Trocas Disponíveis</TabsTrigger>
        <TabsTrigger value="historico">Histórico</TabsTrigger>
        
        {/* Apenas mostra aba de aprovações se coordenador */}
        {isGestor && (
          <TabsTrigger value="aprovacoes">Aprovações</TabsTrigger>
        )}
      </TabsList>
      
      <TabsContent value="aprovacoes">
        <AprovacaoTrocas userId={userId} userName={userName} />
        <AprovacaoExtensaoJornada />
        <AprovacaoPontoJustificativa />
      </TabsContent>
    </Tabs>
  );
}
```

---

## 8. EXEMPLO DE FLUXO COMPLETO

### Cenário: Troca de Plantão com Aprovação

```
1. PROFISSIONAL (Mariana - Enf. Enfermagem)
   └─ Acessa: Módulo Enfermagem > Minhas Escalas
   └─ Clica: "Oferecer Plantão"
   └─ Preenchimento: 25/03/26, 07:00-19:00, Motivo: "Consulta médica"
   └─ Sistema cria: enfermagem_trocas {
        ofertante_id: <mariana_uuid>,
        status: 'aberta',
        requer_aprovacao: true (se configurado)
      }

2. OUTRO PROFISSIONAL (Ricardo - Tec. Enf.)
   └─ Acessa: Módulo Enfermagem > Trocas Disponíveis
   └─ Vê: Oferta de Mariana
   └─ Clica: "Aceitar"
   └─ Sistema atualiza: enfermagem_trocas {
        aceitante_id: <ricardo_uuid>,
        status: 'aceita' | 'pendente_aprovacao'  <- depende config
      }

3. COORDENADOR DE ENFERMAGEM (Fátima - Coord. Enf.)
   └─ Acessa: Módulo Enfermagem > APROVAÇÕES
   └─ Vê seção: "Trocas Aguardando Aprovação"
   └─ Vê: "Mariana → Ricardo | 25/03 | 07:00-19:00"
   └─ Clica: [APROVAR]
   └─ Sistema atualiza: enfermagem_trocas {
        status: 'aprovada',
        aprovador_id: <fatima_uuid>,
        aprovador_nome: 'Fátima Silva',
        data_aprovacao: '2026-03-24T14:32:00Z'
      }
   └─ Notificação: "Troca aprovada!" (para Mariana e Ricardo)

4. SISTEMA
   └─ O plantão agora está trocado: Mariana sai, Ricardo entra
   └─ Logs registram quem aprovou e quando
```

---

## 9. TABELAS RELACIONADAS À APROVAÇÃO

| Tabela | Propósito | Campos-Chave |
|--------|-----------|--------------|
| `enfermagem_trocas` | Controlador trocas de plantão | `status`, `aprovador_id`, `data_aprovacao` |
| `justificativas_extensao_jornada` | Extensão de jornada fora do normal | `status`, `aprovado_por`, `aprovado_em` |
| `justificativas_ponto` | Documentação de atrasos/saídas | `status`, `aprovado_por`, `aprovado_em` |
| `gestor_setores` | Vinculação: gestor → setores | `gestor_user_id`, `setor_id` |
| `gestor_cargos` | Vinculação: gestor → cargos | `gestor_user_id`, `cargo_id` |
| `user_roles` | Atribuição de roles a usuários | `user_id`, `role` |
| `profiles` | Dados do colaborador | `user_id`, `cargo`, `setor` |
| `enfermagem_configuracoes` | Configurações de comportamento | `chave`, `valor` |

---

## 10. CHECKLIST DE ACESSO POR ROLE

### Enfermagem Básica
- ✅ Ver próprias escalas
- ✅ Oferecer trocar plantão
- ✅ Aceitar troca oferecida
- ❌ Aprovar trocas

### Coordenador de Enfermagem
- ✅ Ver próprias escalas
- ✅ Oferecer trocar plantão
- ✅ Aceitar troca oferecida
- ✅ **APROVAR trocas de plantão**
- ✅ **APROVAR extensões de jornada**
- ✅ **APROVAR justificativas de ponto**
- ✅ Ver configurações de escalas

### Gestor
- ✅ Ver subordinados (via `get_usuarios_sob_gestao()`)
- ✅ Visualizar banco de horas da equipe
- ✅ Visualizar atestados da equipe
- ✅ Ver escalas dos subordinados
- ✅ APROVAR justificativas da equipe (RLS permite)

### Admin
- ✅ **TUDO** - acesso total a todas as tabelas
- ✅ Gerenciar vínculos gestor-setor/cargo
- ✅ Modificar configurações do sistema
- ✅ Aprovar qualquer item

---

## 11. PRÓXIMAS MELHORIAS SUGERIDAS

1. **Workflow mais robusto**: Adicionar status como `'em_revisao'`, `'aguardando_reenvio'`
2. **Notificações em tempo real**: Usar WebSocket para avisar aprovadores de novas solicitações
3. **Escalação**: Se coordenador não aprovar em N dias, escalar para gestor/admin
4. **Auditoria completa**: Histórico de cada aprovação/rejeição com justificativas
5. **Delegação**: Permitir que coordenador delegue aprovações a outro durante férias
6. **Limites de cota**: Máximo de trocas por profissional por período

---

**Fim da Análise**  
_Documento gerado em 24/03/2026 para referência técnica_
