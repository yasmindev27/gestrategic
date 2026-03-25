# REFERÊNCIA RÁPIDA: Roles, Gerentes e Aprovações

---

## 🎯 RESPOSTAS RÁPIDAS (TL;DR)

### 1. Como estão definidos os roles de gerente/supervisor?

▸ **Definição**: ENUM `app_role` com 24 valores em PostgreSQL  
▸ **Roles de Supervisão Específicos**:
- `coordenador_enfermagem` - Aprova trocas, extensões, justificativas de ponto
- `coordenador_medico` - Aprova atividades médicas
- `gerente_administrativo` - Gerencia administrativo
- `supervisor_operacional` - Gerencia operações

▸ **Arquivo**: [src/hooks/useUserRole.ts](src/hooks/useUserRole.ts)

---

### 2. Qual é a estrutura de relação entre colaborador e gerente/supervisor?

▸ **Tabelas de Vinculação**:
1. **`gestor_setores`** - Gestor gerencia todos os colaboradores de certos setores
   ```
   Gestor (FK) → Setor (FK) ← Profile.setor
   ```

2. **`gestor_cargos`** - Gestor gerencia todos os colaboradores de certos cargos
   ```
   Gestor (FK) → Cargo (FK) ← Profile.cargo
   ```

▸ **Função para validar**: `gestor_gerencia_usuario(_gestor_id, _usuario_id)` → boolean

▸ **Arquivo**: [public/rls-functions-triggers-export.sql](public/rls-functions-triggers-export.sql#L323)

---

### 3. Onde estão os componentes de aprovação?

▸ **Componentes de Aprovação em Enfermagem**:

| Componente | Arquivo | Tabela |
|-----------|---------|--------|
| **Trocas de Plantão** | `src/components/enfermagem/AprovacaoTrocas.tsx` | `enfermagem_trocas` |
| **Extensão de Jornada** | `src/components/enfermagem/AprovacaoExtensaoJornada.tsx` | `justificativas_extensao_jornada` |
| **Justificativas de Ponto** | `src/components/enfermagem/AprovacaoPontoJustificativa.tsx` | `justificativas_ponto` |

▸ **Integração**: Todos no módulo `EnfermagemModule.tsx` em uma aba "APROVAÇÕES"

▸ **Acesso**: Apenas `coordenador_enfermagem`, `gestor` ou `admin`

---

## 📊 TABELAS PRINCIPAIS

```
user_roles
  ├─ user_id (FK → auth.users)
  ├─ role (enum app_role)
  └─ Uma pessoa pode ter múltiplos roles

profiles
  ├─ user_id (PK)
  ├─ full_name
  ├─ cargo (text)       ← Usado pra encontrar subordinados
  └─ setor (text)       ← Usado pra encontrar subordinados

gestor_setores
  ├─ gestor_user_id (FK → profiles)
  ├─ setor_id (FK → setores)
  └─ Gestor gerencia todos em tal setor

gestor_cargos
  ├─ gestor_user_id (FK → profiles)
  ├─ cargo_id (FK → cargos)
  └─ Gestor gerencia todos com tal cargo

enfermagem_trocas
  ├─ id, escala_id, ofertante_id, aceitante_id
  ├─ status ('aberta' | 'aceita' | 'pendente_aprovacao' | 'aprovada' | 'rejeitada')
  ├─ aprovador_id, data_aprovacao
  └─ RLS: Profissional vê se envolvido, Coord vê se do seu setor

justificativas_extensao_jornada
  ├─ colaborador_user_id, data_extensao
  ├─ status ('pendente' | 'aprovado' | 'rejeitado')
  ├─ aprovado_por, aprovado_em
  └─ RLS: Coord aprova, RH_DP aprova, Admin faz tudo

justificativas_ponto
  ├─ colaborador_user_id, data_ocorrencia
  ├─ minutos_excedentes, justificativa
  ├─ status ('pendente' | 'aprovado' | 'reprovado')
  ├─ aprovado_por, aprovado_em
  └─ RLS: Funcionário vê própria, Gestor vê da equipe, RH tudo
```

---

## 🔐 REGRAS DE ACESSO (RLS)

```
┌─────────────────────────────────────────────────────────────┐
│              PERMISSION MATRIX                              │
├─────────────────────────────────────────────────────────────┤
│ Tabela                    │ Admin │ Coord │ Gestor │         │
├─────────────────────────────────────────────────────────────┤
│ enfermagem_trocas         │ TUDO  │ APROVA│        │         │
│ justificativas_extensão   │ TUDO  │ APROVA│        │         │
│ justificativas_ponto      │ TUDO  │ APROVA│ APROVA │         │
│ gestor_setores            │ TUDO  │       │ VER    │         │
│ gestor_cargos             │ TUDO  │       │ VER    │         │
│ profiles                  │ TUDO  │ LOOKUP│ LOOKUP │         │
│ user_roles                │ TUDO  │       │        │         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 FLUXO RÁPIDO: DO REQUEST AO DATABASE

### Cenário: Coordenador aprova troca de plantão

```
1. User clica [APROVAR]
   └─ AprovacaoTrocas.tsx
      └─ useAprovarTroca.mutate({ trocaId, aprovadorId, aprovado: true })
         └─ Supabase.from("enfermagem_trocas").update(...)
            └─ RLS CHECK: has_role('coordenador_enfermagem') ?
               ├─ ✅ YES → UPDATE SQL executado
               │         → Trigger: update_updated_at
               │         → Realtime broadcast
               │         → Frontend refetch
               │         → User vê "Aprovado!"
               │
               └─ ❌ NO → Policy Violation Error
                        → User vê "Erro de permissão"
```

---

## 📁 ARQUIVO MAP

| Documento | Propósito |
|-----------|-----------|
| **ESTRUTURA_ROLES_APROVACOES.md** | Fundação completa: roles enum, funções SQL, políticas |
| **EXEMPLOS_SQL_ROLES_APROVACOES.md** | 15 queries práticas + DDL de índices |
| **DIAGRAMA_FLUXO_COMPONENTES.md** | Visual: hierarquia, fluxos, matriz de permissões |
| **DOCUMENTACAO_TECNICA.md** | Docs gerais do projeto (existente) |
| Este arquivo | Quick ref + checklist |

---

## ✅ CHECKLIST: VALIDAR CONFIGURAÇÃO

- [ ] Todos os roles existem no ENUM `app_role`?
  ```sql
  SELECT enum_range(NULL::app_role);
  ```

- [ ] Existem policies RLS em `enfermagem_trocas`?
  ```sql
  SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'enfermagem_trocas';
  SELECT policyname FROM pg_policies WHERE tablename = 'enfermagem_trocas';
  ```

- [ ] Coordenador tem role `coordenador_enfermagem`?
  ```sql
  SELECT * FROM user_roles WHERE user_id = '<id>' AND role = 'coordenador_enfermagem';
  ```

- [ ] Gestor está vinculado aos setores certos?
  ```sql
  SELECT * FROM gestor_setores WHERE gestor_user_id = '<id>';
  ```

- [ ] Componentes Aprovação estão no módulo enfermagem?
  ```bash
  grep -r "AprovacaoTrocas\|AprovacaoExtensao\|AprovacaoPonto" src/components/modules/
  ```

- [ ] Há trocas pendendo aprovação?
  ```sql
  SELECT COUNT(*) FROM enfermagem_trocas WHERE status = 'pendente_aprovacao';
  ```

---

## 🛠️ TROUBLESHOOTING

### Problema: "Coordenador não vê trocas pendentes"

**Solução:**
1. Verificar role: `SELECT * FROM user_roles WHERE user_id = '<id>';`
2. Verificar se tem `coordenador_enfermagem`
3. Se não tiver: `INSERT INTO user_roles (user_id, role) VALUES ('<id>', 'coordenador_enfermagem')`

### Problema: "Gestor não vê subordinados de um setor"

**Solução:**
1. Verificar vinculação: `SELECT * FROM gestor_setores WHERE gestor_user_id = '<id>';`
2. Se não existir: 
   ```sql
   INSERT INTO gestor_setores (gestor_user_id, setor_id) 
   VALUES ('<gestor_id>', (SELECT id FROM setores WHERE nome = 'Enfermagem'));
   ```
3. Verificar se subordinados têm `setor = 'Enfermagem'` em profiles

### Problema: "RLS Policy violation ao aprovar"

**Solução:**
1. Verificar se tem role certo: `SELECT has_role(auth.uid(), 'coordenador_enfermagem');`
2. Conferir policy: `SELECT * FROM pg_policies WHERE tablename = 'enfermagem_trocas';`
3. Se vazio: Executar migration que cria policies

---

## 📞 CONTACTS & LINKS

- **Supabase Project**: Usar URLs de `supabase/config.toml`
- **Frontend hooks**: Buscar em `src/hooks/`
- **Components**: Buscar em `src/components/`
- **SQL**: Busca em `public/*.sql` e `supabase/migrations/`

---

## 🎓 APRENDIZADOS-CHAVE

1. **Hierarquia não é direta**: Não há campo `manager_id` nas profiles. A relação é feita via setor/cargo
2. **Múltiplos roles**: Um usuário pode ter vários roles (admin + coordenador, por exemplo)
3. **RLS é crítico**: Sem policies corretas, dados vazam. Com policies erradas, usuários perdem acesso
4. **Realtime é automático**: Cambio na DB → Supabase Realtime → Frontend atualiza sozinho
5. **Separação de concerns**: Cada departamento tem seus componentes de aprovação isolados

---

## 📚 PRÓXIMOS PASSOS SUGERIDOS

1. **Escalation Logic**: Se aprovador não responder em 48h → escalar para próximo nível
2. **Bulk Approval**: Coordenador aprovar múltiplas trocas de uma vez
3. **Email Notifications**: Quando há pendência, enviar email ao coordenador
4. **Analytics**: Dashboard mostrando tempo médio de aprovação por coordenador
5. **Delegation**: Coordenador pode delegar aprovações durante férias
6. **Webhooks**: Integração com SMS alert para aprovações críticas

---

**Última atualização**: 24 de março de 2026  
**Versão**: 1.0
