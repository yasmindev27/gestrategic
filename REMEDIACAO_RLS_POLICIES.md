# 🔒 Remediação de RLS Policies - Segurança Crítica

## Resumo

Encontradas **7 policies RLS inseguras** usando `USING (true)` que permitem acesso irrestrito:

| Tabela | Policy | Risco |
|--------|--------|-------|
| alertas_seguranca | "Usuarios autenticados podem ver alertas" | ❌ TODOS veem TODOS alertas |
| ativos | "Authenticated users can view ativos" | ❌ TODOS veem equipamentos críticos |
| ativos_disponibilidade | "Authenticated users can view disponibilidade" | ❌ TODOS veem disponibilidade de equipamentos |
| auditoria_formularios_config | "Authenticated users can read..." | ⚠️ Todos veem config |
| auditoria_perguntas_config | "Authenticated users can read..." | ⚠️ Todos veem perguntas |
| auditoria_secoes_config | "Authenticated users can read..." | ⚠️ Todos veem seções |
| auditoria_temporalidade | "Usuarios autenticados podem inserir" | ❌ TODOS podem inserir |

---

## Antes (Inseguro) ❌

```sql
-- Linha 780: CRÍTICO - Todos os usuários autenticados veem alertas de segurança!
CREATE POLICY "Usuarios autenticados podem ver alertas" 
  ON public.alertas_seguranca 
  FOR SELECT TO authenticated 
  USING (true);  -- ❌ INSEGURO

-- Linha 833: Todos veem equipamentos e status de disponibilidade
CREATE POLICY "Authenticated users can view ativos" 
  ON public.ativos 
  FOR SELECT TO authenticated 
  USING (true);  -- ❌ INSEGURO
```

---

## Depois (Seguro) ✅

Execute essas queries no Supabase Dashboard (SQL Editor):

### 1. Alertas de Segurança (CRÍTICO)

```sql
-- DROP POLICY antigo
DROP POLICY IF EXISTS "Usuarios autenticados podem ver alertas" 
  ON public.alertas_seguranca;

-- CREATE POLICY novo - Apenas admin e segurança veem alertas
CREATE POLICY "Security staff can view alerts" 
  ON public.alertas_seguranca 
  FOR SELECT TO authenticated 
  USING (
    -- Admin vê todos
    has_role(auth.uid(), 'admin'::app_role)
    -- Segurança vê alertas do seu setor
    OR (has_role(auth.uid(), 'seguranca'::app_role) 
        AND setor = get_user_setor(auth.uid()))
  );

-- Usuários podem ver seus próprios alertas
CREATE POLICY "Users can view own alerts" 
  ON public.alertas_seguranca 
  FOR SELECT TO authenticated 
  USING (usuario_id = auth.uid());
```

### 2. Ativos (Equipamentos) - HIGH (Não é PII mas é crítico)

```sql
-- DROP POLICY antigo
DROP POLICY IF EXISTS "Authenticated users can view ativos" 
  ON public.ativos;

-- CREATE POLICY novo - Role-based access
CREATE POLICY "Tech staff can view ativos" 
  ON public.ativos 
  FOR SELECT TO authenticated 
  USING (
    -- Admin, TI, Manutenção, Engenharia Clínica podem ver
    has_any_role(auth.uid(), ARRAY[
      'admin'::app_role, 
      'ti'::app_role, 
      'manutencao'::app_role, 
      'engenharia_clinica'::app_role
    ])
  );

-- Médicos podem ver apenas ativos médicos relevantes
CREATE POLICY "Medicos can view medical equipment" 
  ON public.ativos 
  FOR SELECT TO authenticated 
  USING (
    has_any_role(auth.uid(), ARRAY['medicos'::app_role, 'admin'::app_role])
    AND categoria = 'equipamento_medico'
  );
```

### 3. Disponibilidade de Ativos

```sql
-- DROP POLICY antigo
DROP POLICY IF EXISTS "Authenticated users can view disponibilidade" 
  ON public.ativos_disponibilidade;

-- CREATE POLICY novo
CREATE POLICY "Tech staff can view availability" 
  ON public.ativos_disponibilidade 
  FOR SELECT TO authenticated 
  USING (
    has_any_role(auth.uid(), ARRAY[
      'admin'::app_role, 
      'ti'::app_role, 
      'manutencao'::app_role, 
      'engenharia_clinica'::app_role,
      'gestor'::app_role
    ])
  );
```

### 4. Configuração de Auditoria Formulários

```sql
-- DROP POLICY antigo
DROP POLICY IF EXISTS "Authenticated users can read formularios_config" 
  ON public.auditoria_formularios_config;

-- CREATE POLICY novo - Apenas admin e qualidade gerenciam
CREATE POLICY "Admin/Quality can view form configs" 
  ON public.auditoria_formularios_config 
  FOR SELECT TO authenticated 
  USING (
    has_any_role(auth.uid(), ARRAY[
      'admin'::app_role, 
      'qualidade'::app_role
    ])
  );
```

### 5. Perguntas de Auditoria

```sql
-- DROP POLICY antigo
DROP POLICY IF EXISTS "Authenticated users can read perguntas_config" 
  ON public.auditoria_perguntas_config;

-- CREATE POLICY novo
CREATE POLICY "Auditors can view audit questions" 
  ON public.auditoria_perguntas_config 
  FOR SELECT TO authenticated 
  USING (
    has_any_role(auth.uid(), ARRAY[
      'admin'::app_role, 
      'qualidade'::app_role,
      'nsp'::app_role
    ])
  );
```

### 6. Seções de Auditoria

```sql
-- DROP POLICY antigo
DROP POLICY IF EXISTS "Authenticated users can read secoes_config" 
  ON public.auditoria_secoes_config;

-- CREATE POLICY novo
CREATE POLICY "Auditors can view audit sections" 
  ON public.auditoria_secoes_config 
  FOR SELECT TO authenticated 
  USING (
    has_any_role(auth.uid(), ARRAY[
      'admin'::app_role, 
      'qualidade'::app_role,
      'nsp'::app_role
    ])
  );
```

### 7. Temporalidade - INSERÇÃO RESTRITA

```sql
-- DROP POLICY antigo
DROP POLICY IF EXISTS "Usuarios autenticados podem inserir registros de temporalidade" 
  ON public.auditoria_temporalidade;

-- CREATE POLICY novo - Apenas usuários do setor correto
CREATE POLICY "Users can insert temporalidade records for own sector" 
  ON public.auditoria_temporalidade 
  FOR INSERT TO authenticated 
  WITH CHECK (
    -- Deve ser do seu próprio setor
    setor = get_user_setor(auth.uid())
    -- Ou ser admin
    OR has_role(auth.uid(), 'admin'::app_role)
  );
```

---

## Verificação - Testar as Policies

### Script de Teste por Role

```sql
-- Como ADMIN: Deve ver todos alertas
SELECT * FROM public.alertas_seguranca;
-- Esperado: Todos os alertas

-- Como SEGURANÇA do DEPTO_A: Deve ver apenas alertas do DEPTO_A
SELECT * FROM public.alertas_seguranca 
WHERE setor = 'DEPTO_A';
-- Esperado: Apenas alertas do DEPTO_A

-- Como ENFERMAGEM: Deve ver apenas seus próprios alertas
SELECT * FROM public.alertas_seguranca 
WHERE usuario_id = auth.uid();
-- Esperado: Apenas seus alertas

-- Como ENFERMAGEM tentando ver alerta de outro: Deve obter ZERO registros
SELECT * FROM public.alertas_seguranca 
WHERE usuario_id != auth.uid() 
AND usuario_role = 'seguranca';
-- Esperado: 0 registros ✅

-- Como RECEPÇÃO tentando ver ativos: Deve falhar/retornar vazio
SELECT * FROM public.ativos;
-- Esperado: 0 registros ✅ (não tem permission)
```

---

## Passos de Implementação

### Fase 1: Teste em Staging (Hoje)
1. [ ] Backup do banco atual
2. [ ] Aplicar policies em ambiente de teste
3. [ ] Testar cada role com queries acima
4. [ ] Verificar que acesso foi bloqueado corretamente

### Fase 2: Deploy em Produção (Amanhã)
1. [ ] Agendar manutenção (baixo tráfego)
2. [ ] Aplicar policies em produção
3. [ ] Verificar RLS habilitado: `ALTER TABLE public.alertas_seguranca ENABLE ROW LEVEL SECURITY;`
4. [ ] Testar com usuários reais (admin + security + regular user)
5. [ ] Monitorar logs de erro

### Fase 3: Verificação
1. [ ] Executar audit de RLS no mês seguinte
2. [ ] Documentar no registro de compliance
3. [ ] Adicionar testes automatizados para RLS

---

## Habilitação de RLS em Tabelas-Chave

Verificar que RLS está ATIVADO nas tabelas sensíveis:

```sql
-- Verificar status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'alertas_seguranca',
    'ativos',
    'ativos_disponibilidade',
    'pacientes',
    'prontuarios',
    'fichas_enfermagem',
    'medicacoes'
  );

-- Se rowsecurity = false, ativar:
ALTER TABLE public.alertas_seguranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ativos_disponibilidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_enfermagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicacoes ENABLE ROW LEVEL SECURITY;
```

---

## Compliance Impact

✅ **LGPD Art. 32** (Segurança): RLS agora restringe acesso conforme roles
✅ **HIPAA § 164.312(a)(1)** (Access Control): Implementado role-based access
✅ **NSP/ANVS** (Segurança de Paciente): Alertas sensíveis protegidos

---

##  Próximas Ações

- [ ] Auditar TODAS CREATE POLICY no banco (ver `rls-functions-triggers-export.sql`)
- [ ] Remover qualquer `USING (true)` remanescente
- [ ] Testar RLS com ferramentas automatizadas (pgTAP)
- [ ] Documentar matrix de access control por role
