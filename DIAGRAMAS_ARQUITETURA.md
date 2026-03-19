# 🏗️ Diagramas Arquiteturais - Gestrategic

## 1. Arquitetura Geral do Sistema

```mermaid
graph TB
    subgraph "Cliente (Navegador)"
        React["React SPA<br/>(TypeScript + Vite)"]
        UI["UI Components<br/>(TailwindCSS + shadcn/ui)"]
        React --> UI
    end

    subgraph "State Management"
        RQ["React Query<br/>(TanStack Query)"]
        RTS["Real-time Sync<br/>(Supabase Realtime)"]
        React --> RQ
        React --> RTS
    end

    subgraph "Backend (Supabase)"
        Auth["Auth<br/>(JWT + MFA)"]
        DB["PostgreSQL<br/>(60+ Tabelas)"]
        RLS["Row Level<br/>Security"]
        RT["Real-time<br/>Subscriptions"]
        
        Auth --> DB
        DB --> RLS
        DB --> RT
    end

    subgraph "Funcionalidades"
        Sec["Security<br/>(Funcs + Triggers)"]
        Val["Validators<br/>(Data Integrity)"]
        Log["Logs<br/>(Auditoria)"]
        
        DB --> Sec
        DB --> Val
        DB --> Log
    end

    RQ --> Auth
    RQ --> DB
    RQ --> RLS

    style React fill:#61dafb
    style DB fill:#336791
    style RLS fill:#ff6b35
    style Auth fill:#10b981
```

---

## 2. Estrutura de Tipos TypeScript

```mermaid
graph LR
    subgraph "Enums"
        E1["app_role<br/>(13 valores)"]
        E2["ModuleCategory"]
        E3["Sector"]
    end

    subgraph "Interfaces Globais"
        T1["Profile"]
        T2["UserRole"]
        T3["Setor<br/>Cargo"]
    end

    subgraph "Entidades Específicas"
        B["Bed<br/>Patient<br/>ShiftInfo"]
        I["IndicatorData<br/>ActionPlan"]
        D["DISCResult"]
        C["Chamado<br/>ChatMensagem"]
    end

    subgraph "Table Types<br/>(do Supabase)"
        ST["Tables<br/>(60+ tipos)"]
    end

    ST --> T1
    ST --> T2
    E1 --> T2
    E3 --> B
    ST --> B
    ST --> I
    ST --> D
    ST --> C

    style E1 fill:#f59e0b
    style ST fill:#3b82f6
```

---

## 3. Hierarquia de Autenticação & Autorização

```mermaid
graph TD
    A["Usuário Autenticado<br/>(auth.users JWT)"]
    
    A --> B["Profile"]
    A --> C["user_roles"]
    A --> D["usuario_perfil"]
    
    C --> E["app_role<br/>(13 enum values)"]
    D --> F["perfis_sistema<br/>(customizável)"]
    
    E --> G["has_role()"]
    F --> H["usuario_pode_acessar_modulo()"]
    
    F --> I["modulos_sistema"]
    I --> J["ferramentas_modulo"]
    
    J --> K["permissoes_ferramenta"]
    I --> L["permissoes_perfil"]
    
    H --> M["RLS Check"]
    G --> M
    
    M --> N{"Acesso<br/>Concedido?"}
    N -->|Sim| O["Dados Retornados<br/>(filtrado por RLS)"]
    N -->|Não| P["Erro 403 Forbidden"]
    
    style A fill:#10b981
    style B fill:#3b82f6
    style C fill:#8b5cf6
    style D fill:#ec4899
    style M fill:#f59e0b
    style O fill:#10b981
    style P fill:#ef4444

```

---

## 4. Fluxo de Autenticação

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant SupabaseAuth
    participant DB as PostgreSQL
    participant Frontend

    User ->> Browser: Login (email + senha)
    Browser ->> SupabaseAuth: signInWithPassword()
    SupabaseAuth ->> DB: Valida credentials
    SupabaseAuth ->> Browser: JWT Token (session)
    Browser ->> Frontend: auth.currentUser
    Frontend ->> Frontend: useUserRole() Hook
    Frontend ->> DB: SELECT user_roles WHERE user_id (RLS)
    DB ->> DB: has_role() Function
    DB ->> Frontend: roles[] + primaryRole
    Frontend ->> Frontend: Renderiza UI baseado em roles
```

---

## 5. Estrutura de Banco de Dados

```mermaid
graph TB
    subgraph "Autenticação"
        A1["profiles<br/>user_roles"]
    end

    subgraph "RBAC"
        A2["perfis_sistema<br/>modulos_sistema<br/>ferramentas_modulo<br/>usuario_perfil<br/>permissoes_perfil<br/>permissoes_ferramenta"]
    end

    subgraph "Assistencial"
        B["bed_records<br/>prontuarios<br/>saida_prontuarios<br/>avaliacoes_prontuarios"]
    end

    subgraph "Enfermagem"
        C["enfermagem_escalas<br/>enfermagem_trocas<br/>enfermagem_configuracoes<br/>escalas_medicos"]
    end

    subgraph "Indicadores"
        D["indicadores_upa<br/>indicadores_nsp<br/>planos_acao_indicadores<br/>analises_criticas"]
    end

    subgraph "Incidentes"
        E["incidentes_nsp<br/>analises_incidentes<br/>acoes_incidentes<br/>alertas_seguranca"]
    end

    subgraph "RH"
        F["atestados<br/>banco_horas<br/>avaliacoes_desempenho<br/>disc_results"]
    end

    subgraph "Operacional"
        G["rouparia_itens<br/>cardapios<br/>refeicoes_registros<br/>ativos<br/>produtos<br/>movimentacoes_estoque"]
    end

    subgraph "Comunicação"
        H["chat_conversas<br/>chat_mensagens<br/>chamados<br/>agenda_items"]
    end

    A1 --> A2
    A2 -.->|RLS Enforcement| B
    A2 -.->|RLS Enforcement| C
    A2 -.->|RLS Enforcement| D
```

---

## 6. Hooks Customizados por Domínio

```mermaid
graph LR
    subgraph "Auth"
        H1["useUserRole()"]
        H2["useMFA()"]
        H3["useSessionTimeout()"]
    end

    subgraph "NIR/Leitos"
        H4["useBeds()"]
        H5["useBedRecords()"]
        H6["useDataValidation()"]
    end

    subgraph "Enfermagem"
        H7["useEscalas()"]
        H8["useTrocasDisponiveis()"]
        H9["useMinhasEscalas()"]
    end

    subgraph "Indicadores"
        H10["useUPAIndicators()"]
        H11["useNSPIndicators()"]
        H12["useConformidadeIndicadores()"]
    end

    subgraph "Permissões"
        H13["usePermissoes()"]
        H14["usePerfis()"]
        H15["useModulos()"]
    end

    subgraph "Infraestrutura"
        H16["useSetores()"]
        H17["useProfissionais()"]
        H18["useLogAccess()"]
    end

    subgraph "Realtime"
        H19["useRealtimeSync()"]
        H20["usePushNotifications()"]
    end

    style H1 fill:#10b981
    style H4 fill:#3b82f6
    style H7 fill:#8b5cf6
    style H10 fill:#f59e0b
    style H13 fill:#ef4444
    style H19 fill:#06b6d4
```

---

## 7. Fluxo de Dados em Tempo Real

```mermaid
sequenceDiagram
    actor User
    participant UI as React UI
    participant RQ as React Query
    participant RT as Realtime Channel
    participant DB as PostgreSQL

    User ->> UI: Carrega página
    UI ->> RQ: useQuery()
    RQ ->> DB: SELECT com RLS
    DB ->> RQ: Dados filtrados
    RQ ->> UI: Atualiza estado

    UI ->> RT: useRealtimeSync()
    RT ->> DB: LISTEN a mudanças
    
    Note over DB: Outro usuário UPDATE
    DB ->> RT: postgres_changes event
    RT ->> RQ: Invalida queryKey
    RQ ->> DB: SELECT com RLS
    DB ->> RQ: Dados novos
    RQ ->> UI: Atualiza em tempo real
```

---

## 8. Row Level Security - Padrões

```mermaid
graph LR
    subgraph "Padrões RLS"
        P1["Próprio<br/>Usuário"]
        P2["Role-based<br/>Access"]
        P3["Setor-based<br/>Access"]
        P4["Supervisor<br/>Relationship"]
    end

    subgraph "Implementação"
        I1["auth.uid() =<br/>user_id"]
        I2["has_role()<br/>admin/gestor"]
        I3["setor =<br/>user_setor"]
        I4["perfil_id<br/>check"]
    end

    subgraph "Resultado"
        R1["Row visível"]
    end

    P1 --> I1
    P2 --> I2
    P3 --> I3
    P4 --> I4

    I1 --> R1
    I2 --> R1
    I3 --> R1
    I4 --> R1

    style P1 fill:#10b981
    style P2 fill:#3b82f6
    style P3 fill:#8b5cf6
    style P4 fill:#f59e0b
    style R1 fill:#06b6d4
```

---

## 9. Dados Capturados por Domínio

```mermaid
graph TB
    subgraph "NIR<br/>(Real-time)"
        D1["Pacientes: 2-5K"]
        D2["Leitos com RLS"]
        D3["Turnos: D/N"]
    end

    subgraph "Enfermagem"
        E1["Escalas: 200-500"]
        E2["Trocas: 50-100"]
    end

    subgraph "Indicadores"
        I1["UPA: 180+ tipos"]
        I2["NSP: Incidentes"]
        I3["Conformidade"]
    end

    subgraph "RH"
        R1["Colaboradores: 300"]
        R2["Avaliações: 800-1K"]
        R3["DISC: 200-300"]
    end

    subgraph "Operacional"
        O1["Rouparia: 100-200/dia"]
        O2["Restaurante: 50-100"]
        O3["Manutenção: 50-100"]
    end

    subgraph "Comunicação"
        C1["Chat: 1K+ msg/dia"]
        C2["Chamados: 50-100"]
        C3["Agenda: Tasks"]
    end

    D1 --> OUT["Análise<br/>Consolidada"]
    E1 --> OUT
    I1 --> OUT
    R1 --> OUT
    O1 --> OUT
    C1 --> OUT

    style D1 fill:#06b6d4
    style I1 fill:#f59e0b
    style R1 fill:#8b5cf6
    style O1 fill:#10b981
    style C1 fill:#3b82f6
```

---

## 10. Pesonalização: Novo RBAC (perfis_sistema)

```mermaid
graph TD
    OLD["OLD: user_roles.role<br/>(13 roles fixas)<br/>❌ Rígido"]
    NEW["NEW: perfis_sistema<br/>(customizável)<br/>✅ Flexível"]

    OLD --> LIMIT["Limitações<br/>- Não editar roles<br/>- Não criar roles<br/>- Acesso tudo/nada"]
    
    NEW --> ADVAN["Vantagens<br/>+ Perfis customizáveis<br/>+ Módulos granulares<br/>+ Ferramentas por módulo<br/>+ Auditoria de mudanças"]
    
    NEW --> STRUCT["Estrutura<br/>Perfis(N) → Módulos(N)<br/>Módulos → Ferramentas(N)<br/>Cada ferramenta tem:"]
    
    STRUCT --> PERMS["- pode_visualizar<br/>- pode_acessar<br/>- pode_escrever<br/>- comportamento_sem_acesso"]
    
    style OLD fill:#ef4444
    style NEW fill:#10b981
    style ADVAN fill:#34d399
```

---

## 11. Fluxos Críticos de Dados

```mermaid
graph LR
    subgraph "Entrada"
        IN1["Paciente Admissão"]
        IN2["Escala Enfermagem"]
        IN3["Indicador Mensal"]
    end

    subgraph "Processamento"
        P1["Validação"]
        P2["RLS Check"]
        P3["Storage"]
    end

    subgraph "Saída"
        OUT1["Dashboard"]
        OUT2["Relatórios"]
        OUT3["Alertas"]
    end

    IN1 --> P1
    IN2 --> P1
    IN3 --> P1
    
    P1 --> P2
    P2 --> P3
    
    P3 --> OUT1
    P3 --> OUT2
    P3 --> OUT3

    style IN1 fill:#3b82f6
    style IN2 fill:#8b5cf6
    style IN3 fill:#f59e0b
    style P1 fill:#10b981
    style OUT1 fill:#06b6d4
```

---

## 12. Módulos do Sistema (30+)

```mermaid
graph TB
    subgraph "Assistencial"
        A1["✅ NIR"]
        A2["✅ Médicos"]
        A3["✅ Enfermagem"]
        A4["✅ Faturamento"]
        A5["✅ Laboratório"]
        A6["✅ Mapa de Leitos"]
        A7["✅ Recepção"]
        A8["✅ Assistência Social"]
    end

    subgraph "Administrativo"
        B1["✅ RHDP"]
        B2["✅ Colaborador"]
        B3["✅ LMS"]
        B4["✅ Admin"]
        B5["✅ TI"]
    end

    subgraph "Apoio & Logística"
        C1["✅ Rouparia"]
        C2["✅ Restaurante"]
        C3["✅ Manutenção"]
        C4["✅ Engenharia"]
        C5["✅ Segurança Patrimonial"]
    end

    subgraph "Governança"
        D1["✅ Qualidade"]
        D2["✅ Incidentes NSP"]
        D3["✅ Segurança do Trabalho"]
        D4["✅ Reuniões"]
    end

    subgraph "Comunicação"
        E1["✅ Chat"]
        E2["✅ Chamados"]
        E3["✅ Agenda"]
        E4["✅ Salus"]
    end

    subgraph "Dashboard"
        F1["✅ Dashboard"]
        F2["✅ Gerência"]
    end

    style A1 fill:#3b82f6
    style B1 fill:#8b5cf6
    style C1 fill:#10b981
    style D1 fill:#f59e0b
    style E1 fill:#06b6d4
    style F1 fill:#ec4899
```

---

## 13. Ciclo de Vida de um Registro (Exemplo: Chamado)

```mermaid
stateDiagram-v2
    [*] --> Aberto: Usuário cria
    
    Aberto --> EmAndamento: Técnico atribui
    EmAndamento --> Pendente: Aguardando info
    Pendente --> EmAndamento: Retoma
    
    EmAndamento --> Resolvido: Técnico resolve
    Aberto --> Cancelado: Usuário cancela
    
    Resolvido --> [*]: Fechamento
    Cancelado --> [*]: Cancelamento
    
    note right of Aberto
        RLS: Todos veem
        Solicitante pode editar
    end note
    
    note right of EmAndamento
        RLS: Técnico vê
        Técnico pode editar resolução
    end note
    
    note right of Resolvido
        RLS: Solicitante vê resultado
        Audit log criado
    end note
```

---

## 14. Stack Tecnológico

```mermaid
graph TB
    subgraph "Frontend"
        F1["React 18+"]
        F2["TypeScript"]
        F3["TailwindCSS"]
        F4["shadcn/ui"]
        F5["React Query"]
        F6["Vite"]
    end

    subgraph "Backend"
        B1["Supabase"]
        B2["PostgreSQL"]
        B3["PL/pgSQL"]
        B4["Auth (JWT)"]
        B5["Realtime (WebSocket)"]
    end

    subgraph "DevOps"
        D1["GitHub Actions"]
        D2["Netlify/Vercel"]
        D3["Docker (opcional)"]
    end

    F1 --> F2
    F2 --> F3
    F3 --> F4
    F5 --> B1
    F6 --> B1
    
    B1 --> B2
    B2 --> B3
    B1 --> B4
    B1 --> B5
    
    D1 --> D2

    style F1 fill:#61dafb
    style B2 fill:#336791
    style D1 fill:#2088F0
```

---

## 15. Segurança em Camadas

```mermaid
graph TB
    subgraph "Camada 1: Autenticação"
        S1["JWT Token"]
        S2["Email/Senha"]
        S3["MFA (opcional)"]
    end

    subgraph "Camada 2: Autorização"
        S4["RBAC (perfis_sistema)"]
        S5["has_role() Function"]
        S6["usuario_pode_acessar_modulo()"]
    end

    subgraph "Camada 3: Dados"
        S7["RLS Policies"]
        S8["Criptografia em repouso"]
        S9["Criptografia em trânsito"]
    end

    subgraph "Camada 4: Auditoria"
        S10["logs_acesso"]
        S11["logs_permissoes"]
        S12["Rastreabilidade PII"]
    end

    S1 --> S4
    S2 --> S4
    S3 --> S4
    
    S4 --> S7
    S5 --> S7
    S6 --> S7
    
    S7 --> S10
    S7 --> S11
    S7 --> S12

    style S1 fill:#10b981
    style S4 fill:#3b82f6
    style S7 fill:#f59e0b
    style S10 fill:#8b5cf6
```

---

## 16. Coleta de Dados - Volume & Frequência

```mermaid
graph LR
    subgraph "REAL-TIME<br/>(Contínuo)"
        R1["Leitos<br/>Chat<br/>Logs"]
    end

    subgraph "HORÁRIO<br/>(Vários x/dia)"
        H1["Escalas<br/>Chamados<br/>Prontuários"]
    end

    subgraph "DIÁRIO"
        D1["Rouparia<br/>Restaurante<br/>Atendimentos"]
    end

    subgraph "MENSAL"
        M1["Indicadores<br/>Avaliações<br/>Conformidade"]
    end

    subgraph "ANUAL"
        A1["DISC<br/>Review"]
    end

    R1 --> VOLUME["Volume Total<br/>~50K registros/dia<br/>~2M/mês"]
    H1 --> VOLUME
    D1 --> VOLUME
    M1 --> VOLUME

    style R1 fill:#06b6d4
    style H1 fill:#3b82f6
    style D1 fill:#10b981
    style M1 fill:#f59e0b
    style A1 fill:#8b5cf6
```

---

**Diagramas Mermaid renderizáveis** - Use em: [mermaid.live](https://mermaid.live)

