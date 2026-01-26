
# Plano: Correções na Exibição de Dados e Campos de Avaliação

## Resumo
Este plano corrige o problema de exibição incorreta da data de atendimento e adiciona os campos solicitados na seção de avaliação e na tabela de prontuários faltantes.

## Problemas Identificados

### 1. Data de Atendimento Exibindo Incorretamente
O problema ocorre porque a data é armazenada no formato `YYYY-MM-DD` (ex: `2026-01-25`) e quando convertida com `new Date("2026-01-25")`, o JavaScript interpreta como UTC meia-noite. Ao exibir no fuso horário de Brasília (UTC-3), a data pode mostrar o dia anterior.

**Solução**: Usar a função de parsing correta do `date-fns` (`parseISO`) ou adicionar "T00:00:00" para garantir interpretação local.

### 2. Dialog de Avaliação Faltando Campos
Atualmente o dialog só mostra "Número do Prontuário". O usuário precisa:
- Nome do Paciente
- Data de Nascimento  
- Data de Atendimento (no lugar do nº prontuário)

### 3. Tabela de Prontuários Faltantes (Salus)
Atualmente tem: #, Paciente, Nº Prontuário, Data de Registro, Status
O usuário quer: #, Paciente, Data Nascimento, Data Atendimento, Status

---

## Alterações Técnicas

### Arquivo: `src/components/modules/SaidaProntuariosModule.tsx`

#### 1. Corrigir formatação de data (evitar problema de timezone)
Criar função auxiliar para formatar datas do tipo `YYYY-MM-DD`:

```typescript
const formatDateOnly = (dateStr: string | null) => {
  if (!dateStr) return "-";
  // Adiciona hora para evitar interpretação UTC
  const date = new Date(dateStr + "T12:00:00");
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};
```

Aplicar em todos os locais que usam `data_atendimento` e `nascimento_mae`.

#### 2. Atualizar Dialog de Validação (linhas 1028-1055)
Substituir campo de "Número do Prontuário" por:

```text
+--------------------+
| Nome do Paciente   |  ← Input desabilitado
+--------------------+
| Data de Nascimento |  ← Input desabilitado
+--------------------+
| Data de Atendimento|  ← Input desabilitado
+--------------------+
| [checkbox] Existe  |
| Observações        |
+--------------------+
```

#### 3. Atualizar Tabela de Prontuários Faltantes (linhas 974-1011)
Modificar colunas de:
```
# | Paciente | Nº Prontuário | Data de Registro | Status
```
Para:
```
# | Paciente | Data Nasc. | Data Atendimento | Status
```

#### 4. Atualizar exportação de Faltantes (linhas 463-472)
Modificar headers e dados para refletir as novas colunas.

---

## Resultado Esperado

1. **Datas corretas**: A data 25/01/2026 lançada será exibida como 25/01/2026 (sem mais mostrar o dia anterior)

2. **Dialog de Avaliação completo** com:
   - Nome do paciente (somente leitura)
   - Data de nascimento (somente leitura)
   - Data de atendimento (somente leitura)
   - Checkbox "Existe fisicamente" (editável)
   - Campo de observações (editável)

3. **Tabela Faltantes atualizada** mostrando Data de Nascimento e Data de Atendimento ao invés do número do prontuário
