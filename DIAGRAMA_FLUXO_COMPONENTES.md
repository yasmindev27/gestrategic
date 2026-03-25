# Mapa Visual: Componentes React + Fluxo de Dados

---

## 1. DIAGRAMA DA HIERARQUIA

```
┌─────────────────────────────────────────────────────────────────┐
│                         SISTEMA GESTRATEGIC                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║             DEFINIÇÃO DE PAPÉIS (app_role ENUM)          ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ADMIN (acesso total a tudo)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↓                                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  GESTOR (gerencia colaboradores via setor/cargo)        │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↓ (1 gestor → N subordinados)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ROLES BASEADOS EM DEPARTAMENTO:                         │  │
│  │  • enfermagem                                            │  │
│  │  • medicos                                               │  │
│  │  • faturamento                                           │  │
│  │  • ti                                                    │  │
│  │  ... (19 roles específicos)                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↓ (depois há supervisores)                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ROLES DE SUPERVISÃO (necessários para aprovação):       │  │
│  │                                                            │  │
│  │  • coordenador_enfermagem     ← APROVA TROCAS, JORNADAS │  │
│  │  • coordenador_medico          ← APROVA ATIVIDADES MÉD  │  │
│  │  • gerente_administrativo      ← GERENCIA ADMIN         │  │
│  │  • supervisor_operacional      ← GERENCIA OPERAÇÕES     │  │
│  │  • farmaceutico_rt             ← RESPONSÁVEL TÉCNICO    │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. DIAGRAMA DE FLUXO: VINCULAÇÃO GESTOR → SUBORDINADOS

```
    ╔════════════════════════════════════════════════════════╗
    ║  ADMIN cria vinculações                               ║
    ║  via: Módulo Admin > Gestores & Vinculações           ║
    ╚════════════════════════════════════════════════════════╝
                        ↓
    ┌────────────────────────────────────────────────────┐
    │  GestoresVinculacao.tsx                            │
    │  - Permitir criar: gestor_setores                  │
    │  - Permitir criar: gestor_cargos                   │
    └────────────────────────────────────────────────────┘
                        ↓
    ┌────────────────────────────────────────────────────┐
    │  INSERT into gestor_setores                        │
    │  - gestor_user_id = <usuario_id_fátima>           │
    │  - setor_id = <uuid_enfermagem>                   │
    └────────────────────────────────────────────────────┘
                        ↓
    ┌────────────────────────────────────────────────────┐
    │  Fátima pode ver TODOS os profiles com:            │
    │  - setor = "Enfermagem"  (joinando com setores)   │
    │  - cargo = "Enfermeiro"  (joinando com cargos)    │
    └────────────────────────────────────────────────────┘
                        ↓
    ┌────────────────────────────────────────────────────┐
    │  RLS permite à Fátima:                             │
    │  • Ver subordinados (justificativas, banco_horas)  │
    │  • Aprovar solicitações de subordinados            │
    │  • Usar função has_role() em policies              │
    └────────────────────────────────────────────────────┘
```

---

## 3. DIAGRAMA: FLUXO DE APROVAÇÃO DE TROCA DE PLANTÃO

```
PROFISSIONAL DE ENFERMAGEM
│
├─ Acessa: src/components/modules/EnfermagemModule.tsx
│  → Aba: "Minhas Escalas"
│
├─ Visualiza: src/components/enfermagem/MinhasEscalas.tsx
│
├─ Clica: "Oferecer Plantão"
│  └─ Abre Dialog → formulário
│
├─ Preenche:
│  • Data do plantão
│  • Motivo da oferta
│  • Tipo de plantão
│
├─ Submete
│  └─ Hook: src/hooks/useEnfermagem.ts
│     └─ useTrocasDisponiveis()
│        └─ Query: enfermagem_trocas com status='aberta'
│
├─ Sistema cria: enfermagem_trocas {
│  • ofertante_id = <seu_id>
│  • status = 'aberta'
│  • requer_aprovacao = <configuracao>
│  • data_criacao = now()
│  }
│
├─ OUTRO PROFISSIONAL
│  │
│  ├─ Acessa: "Trocas Disponíveis"
│  └─ src/components/enfermagem/TrocasDisponiveis.tsx
│     │
│     ├─ Vê oferta
│     ├─ Clica: "Aceitar"
│     └─ Sistema atualiza:
│        • aceitante_id = <seu_id>
│        • status = 'aceita' | 'pendente_aprovacao'
│           (depende de requer_aprovacao)
│
└─ COORDENADOR DE ENFERMAGEM
   │
   ├─ Acessa: Módulo Enfermagem > APROVAÇÕES
   │
   ├─ Visualiza: src/components/enfermagem/AprovacaoTrocas.tsx
   │  └─ Hook: useTrocasPendentes()
   │     └─ Query: WHERE status = 'pendente_aprovacao'
   │
   ├─ Vê: Troca de Mariana ↔ Ricardo
   │
   ├─ AÇÃO 1: Clica [APROVAR]
   │  └─ Hook: useAprovarTroca()
   │     └─ UPDATE enfermagem_trocas SET:
   │        • status = 'aprovada'
   │        • aprovador_id = <coord_id>
   │        • data_aprovacao = now()
   │
   └─ AÇÃO 2: Clica [REJEITAR]
      └─ Hook: useAprovarTroca()
         └─ UPDATE enfermagem_trocas SET:
            • status = 'rejeitada'
            • aprovador_id = <coord_id>
            • data_aprovacao = now()
            • justificativa_rejeicao = <motivo>
```

---

## 4. ESTRUTURA DE COMPONENTES - MÓDULO ENFERMAGEM

```
EnfermagemModule.tsx (src/components/modules/)
│
├─ Verifica role: isGestor = canApprove?
│  └─ if (isGestor && role === 'coordenador_enfermagem')
│
├─ Tabs:
│  │
│  ├─ [Minhas Escalas] ────────→ MinhasEscalas.tsx
│  │  │                         └─ useTrocasDisponiveis(),
│  │  │                            useMinhasEscalas()
│  │  │
│  │  ├─ TrocasPlantcoesHistorico.tsx (ver histórico com filtros)
│  │  └─ Botões: "Oferecer Plantão", "Visualizar Detalhes"
│  │
│  ├─ [Trocas Disponíveis] ───→ TrocasDisponiveis.tsx
│  │  │                        └─ Hook: useTrocasDisponiveis()
│  │  ├─ Mostra trocas abertas de outros
│  │  └─ Botão: "Aceitar"
│  │
│  ├─ [Histórico] ────────────→ HistoricoTrocas.tsx
│  │  │                        └─ Mostra todas (aprovadas, rejeitadas, etc)
│  │  └─ Filtro por status
│  │
│  ├─ [APROVAÇÕES] ◄──────────── (apenas se isGestor)
│  │  │
│  │  ├─→ AprovacaoTrocas.tsx ────────────────┐
│  │  │                                        ├─ 3 Componentes
│  │  ├─→ AprovacaoExtensaoJornada.tsx ───────┤ de Aprovação
│  │  │                                        │
│  │  └─→ AprovacaoPontoJustificativa.tsx ─────┤
│  │
│  └─ [Configurações] ────────→ EnfermagemConfiguracoes.tsx
│     └─ Checkboxes:
│        • Requer aprovação para trocar (sim/não)
│        • Prazo mínimo para ofertar troca
│        • Permitir auto-substituição
```

---

## 5. COMPONENTES & SOURCES DE DADOS

```
┌──────────────────────────────────┬─────────────────────────────┐
│ COMPONENTE                       │ FONTE DE DADOS              │
├──────────────────────────────────┼─────────────────────────────┤
│ AprovacaoTrocas                  │ enfermagem_trocas           │
│ • useTrocasPendentes()           │ • status='pendente_aprv'    │
│ • useAprovarTroca() [mutation]   │ • ORDER BY created_at       │
├──────────────────────────────────┼─────────────────────────────┤
│ AprovacaoExtensaoJornada         │ justificativas_extensão...  │
│ • loadSolicitacoes() [query]     │ • status='pendente'         │
│ • handleAction() [update]        │ • filtro por status         │
├──────────────────────────────────┼─────────────────────────────┤
│ AprovacaoPontoJustificativa      │ justificativas_ponto        │
│ • ["justificativas_ponto_aprv"]  │ • status='pendente'         │
│ • pendentes vs processados       │ • separado em 2 abas        │
├──────────────────────────────────┼─────────────────────────────┤
│ GestoresVinculacao               │ gestor_setores              │
│ • fetchData() [query]            │ gestor_cargos               │
│ • Criar/Deletar vinculações      │ profiles                    │
│                                  │ setores, cargos             │
├──────────────────────────────────┼─────────────────────────────┤
│ AdminModule                      │ user_roles                  │
│ • Gerenciar roles de usuários    │ profiles                    │
│ • Visualizar histórico de acesso │ logs_acesso                 │
└──────────────────────────────────┴─────────────────────────────┘
```

---

## 6. FLUXO DE DADOS: APROVAÇÃO EM TEMPO REAL

```
USER ACTION (Frontend)
    ↓
    └─→ [CLICK "Aprovar"] Button
        ↓
        └─→ useAprovarTroca.mutate({
              trocaId: "...",
              aprovadorId: "user.id",
              aprovadorNome: "user.full_name",
              aprovado: true
        })
            ↓
            └─→ Supabase.from("enfermagem_trocas")
                .update({ status: "aprovada", ... })
                .eq("id", trocaId)
                    ↓
                    └─→ RLS CHECK:
                        has_role(auth.uid(), 'coordenador_enfermagem'
                        OR has_role(auth.uid(), 'admin')
                            ↓
                            ├─ ✅ TRUE → UPDATE executado
                            │         → DB trigger: update_updated_at
                            │         → Realtime subscription disparado
                            │
                            └─ ❌ FALSE → RLS error: policy violation

                                    ↓
                                ✅ SUCCESS
                                • queryClient.invalidateQueries()
                                • toast() "Aprovado com sucesso"
                                • Component re-renders
                                • Usuário vê seção vazia de "Pendentes"


REALTIME NOTIFICATION (Backend)
    ↓
    └─→ Supabase Realtime Channel
        .on("postgres_changes", { event: "*", table: "enfermagem_trocas" })
        ↓
        └─→ Frontend listeners update
            └─→ Component auto-refresh (sem refresh manual)
                └─→ Mariana & Ricardo veem "Aprovado!" em tempo real
```

---

## 7. MATRIZ DE PERMISSÕES: QUEM PODE FAZER O QUÊ?

```
┌─────────────────────┬─────────────┬──────────────┬──────────────┬────────┐
│ AÇÃO                │ Profissional│ Coordenador  │ Gestor       │ Admin  │
├─────────────────────┼─────────────┼──────────────┼──────────────┼────────┤
│ Ver próprias escalas │ ✅          │ ✅           │ ✅           │ ✅     │
│ Oferecer plantão    │ ✅          │ ✅           │ ✅           │ ✅     │
│ Aceitar plantão     │ ✅          │ ✅           │ ✅           │ ✅     │
│ APROVAR trocas      │ ❌          │ ✅ (no setor)│ ✅ (no setor)│ ✅     │
│ REAPROVEITAR trocas │ ❌          │ ✅ (no setor)│ ✅ (no setor)│ ✅     │
│ APROVAR extensões   │ ❌          │ ✅ (no setor)│ ✅ (no setor)│ ✅     │
│ APROVAR pontos      │ ❌          │ ✅ (no setor)│ ✅ (no setor)│ ✅     │
│ Ver subordinados    │ ❌          │ N/A          │ ✅           │ ✅     │
│ Gerenciar roles     │ ❌          │ ❌           │ ❌           │ ✅     │
│ Criar coordenador   │ ❌          │ ❌           │ ❌           │ ✅     │
└─────────────────────┴─────────────┴──────────────┴──────────────┴────────┘
```

---

## 8. ARQUIVO: GUESTORESVINCULACAO - FLUXO ADMIN

```
GestoresVinculacao.tsx (src/components/admin/)
│
├─ Page Title: "Gestores & Vinculações"
│
├─ SEÇÃO 1: Lista de Gestores Existentes
│  │
│  ├─ fetchData() on mount
│  │  └─ Busca: roles.role='gestor' → profiles
│  │
│  ├─ Tabela com colunas:
│  │  • Nome do Gestor
│  │  • Cargo
│  │  • Setor
│  │  • [Editar] [Deletar]
│  │
│  └─ [Selecionar Gestor]
│     └─ Abre Dialog de VINCULAÇÕES
│
├─ SEÇÃO 2: Diálogo de Edição - Gestor Selecionado
│  │
│  ├─ Mostra vinculações atuais
│  │  │
│  │  ├─ "Setores que este gestor gerencia:"
│  │  │  └─ [Checkbox] Enfermagem
│  │  │  └─ [Checkbox] Recepção
│  │  │  └─ [Checkbox] Faturamento
│  │  │  ... (todos os setores)
│  │  │
│  │  └─ "Cargos que este gestor gerencia:"
│  │     └─ [Checkbox] Enfermeiro
│  │     └─ [Checkbox] Técnico Enfermagem
│  │     └─ [Checkbox] Recepcionista
│  │     ... (todos os cargos)
│  │
│  ├─ [SALVAR] Botão
│  │  └─ Deleta antigas vinculações
│  │  └─ Insere novas seleções
│  │  └─ queryClient.invalidateQueries()
│  │
│  └─ [CANCELAR]
│
└─ SEÇÃO 3: Adicionar Novo Gestor
   │
   ├─ [+ Novo Gestor]
   │  └─ Abre Dialog
   │     • Select usuário (busca livre)
   │     • Multi-select de setores
   │     • Multi-select de cargos
   │     • [CRIAR]
   │
   └─ INSERT user_roles (role='gestor')
      INSERT gestor_setores (...)
      INSERT gestor_cargos (...)
```

---

## 9. CHECKLIST: QUANDO ADICIONAR NOVA APROVAÇÃO

```
Para ADICIONAR uma nova workflow de aprovação ao sistema:

1. ☐ Criar tabela com campos:
   - {tipo}_id (uuid PK)
   - {tipo}_nome (quem solicitou)
   - status (text: 'pendente', 'aprovado', 'rejeitado')
   - aprovado_por (uuid)
   - aprovado_por_nome (text)
   - aprovado_em (timestamp)
   - observacao_aprovador (text)
   - created_at, updated_at

2. ☐ Definir Roles que podem aprovar:
   - admin? sempre
   - coordenador_* ? (que coordenador?)
   - gestor? se for sua equipe?

3. ☐ Criar RLS policies:
   - SELECT para usuário se (criador OR aprovador OR admin)
   - UPDATE para validar role do aprovador

4. ☐ Criar Componente React:
   - `src/components/{setor}/Aprovacao{Tipo}.tsx`
   - Export para Tabs no módulo do setor

5. ☐ Criar Hook (useQuery + useMutation):
   - `src/hooks/use{Setor}.ts`
   - Funções como: get{Tipo}Pendentes(), useAprovar{Tipo}()

6. ☐ Adicionar à Tab no módulo:
   - if (isCoordenador || isGestor) {
   -   <TabsContent value="aprovacoes">
   -     <Aprovacao{Tipo} />
   -   </TabsContent>
   - }

7. ☐ Adicionar à Dashboard de Resumo:
   - Widget showing "Pendentes de Aprovação: {count}"

8. ☐ Realizar testes:
   - ✓ Criar solicitação como colaborador
   - ✓ Ver em aprovação como coordenador
   - ✓ Aprovar com email (se notificações)
   - ✓ Ver histórico como admin
```

---

## 10. EXEMPLO: FLUXO COMPLETO DE UM CASO REAL

```
CENÁRIO REAL: João atrasou 15 minutos, precisa justificar

SEXTA-FEIRA 09:15
│
├─ João chega ao trabalho com 15 min de atraso
│
├─ Sistema ponto registra:
│  • Entrada contratual: 07:00
│  • Entrada real: 07:15
│  • Diferença: 15 minutos
│
├─ Supervisora (Fátima) vê alerta
│  └─ Cria em: justificativas_ponto {
│       colaborador_user_id: <joao>,
│       status: 'pendente',
│       minutos_excedentes: 15,
│       created_at: now()
│     }
│
└─ SEGUNDA-FEIRA
   │
   ├─ Fátima acessa Módulo Enfermagem
   │  > APROVAÇÕES
   │  > Justificativas de Ponto
   │
   ├─ Vê: João | Setor: Enfermagem | 15 min | Pendente
   │
   ├─ Clica: [VER]
   │  └─ Dialog mostra:
   │     • Data: sexta-feira
   │     • Jornada contratual: 07:00-19:00
   │     • Jornada real: 07:15-19:10
   │     • Motivo registrado: "Trânsito, acidente na av."
   │
   ├─ Decision: APROVAR ou REPROVAR?
   │
   ├─ Clica: [APROVAR]
   │  └─ Insere comentário: "OK, justificativa válida"
   │  └─ UPDATE justificativas_ponto SET:
   │     • status = 'aprovado'
   │     • aprovado_por = <fatima_id>
   │     • aprovado_em = now()
   │     • justificativa_aprovacao = "OK, justificativa válida"
   │
   └─ ✅ DONE
      João vê no histórico: "Aprovado por Fátima"
      Fátima vê no dashboard: "1 justificativa processada"
      Banco de horas atualizado
```

---

**Fim do Mapa Visual**

