
## CONTEXTO INSTITUCIONAL — NÃO REMOVER
Este projeto é o sistema de gestão hospitalar **Gestrategic Ibirite**. A integridade e fidedignidade dos dados é crítica — erros de estatística, contagem duplicada ou inconsistências em relatórios podem impactar decisões clínicas e operacionais. Todo processamento de dados deve priorizar precisão, deduplicação e auditabilidade. Conformidade com LGPD e ONA são requisitos permanentes.

---

# Plano de Atualizacoes Estruturais, Visuais e de Conformidade

## Resumo

Este plano cobre tres areas: (1) ajustes de conformidade LGPD e UX em links externos, (2) confirmacao dos itens ja implementados no dashboard, e (3) criacao do modulo de Sala de Reuniao Virtual com IA.

---

## Parte 1 - Branding, LGPD e Links Externos

### 1.1 Itens ja implementados (sem alteracoes necessarias)

- **Cabecalho PDF com logo Gestrategic**: Ja funcional em `src/lib/export-utils.ts` (logo no canto superior direito).
- **Rodape LGPD em PDFs**: Presente em todas as paginas com texto de conformidade em fonte 7pt cinza.
- **Cards interativos com tooltips**: Implementados na ultima sessao em `DashboardPersonalizado.tsx`.
- **Badge de notificacao no chat**: Ja presente em `FloatingChatButton.tsx`.

### 1.2 Banner de Cookies no Rodape (novo)

O componente `LGPDConsent.tsx` atual e um dialog modal que bloqueia a tela. O pedido e por um **banner fixo no rodape** da aplicacao, mais discreto.

**Acao:** Criar um componente `CookieBanner.tsx` que:
- Aparece fixo no rodape (`fixed bottom-0`) com fundo escuro semi-transparente
- Texto: "A Gstrategic utiliza cookies essenciais para garantir seguranca, autenticacao e a melhor experiencia de uso. Ao continuar, voce concorda com nossa Politica de Privacidade."
- Botoes "Aceitar" e "Saiba mais"
- Persiste a escolha em `localStorage` via o hook `useLGPDConsent` existente
- Renderizado no `Dashboard.tsx` quando o consentimento esta pendente

### 1.3 Aviso de Redirecionamento em Links Externos (novo)

Ao clicar em links para Salus, Interact ou Pega Plantao, exibir um toast informativo antes da abertura.

**Acao:** Modificar o `Sidebar.tsx` e `MedicosModule.tsx` para exibir um toast: "Acessando ambiente seguro do parceiro..." com um delay de ~1.5s antes do `window.open`.

---

## Parte 2 - Dashboard (confirmacao)

Todos os itens solicitados ja foram implementados:
- Cards clicaveis com `cursor-pointer` e efeito hover (elevacao + brilho)
- Redirecionamento direto para modulos (Capacitacoes -> LMS, Prontuarios -> Saida Prontuarios, Agenda -> Agenda, Escalas -> Escala Laboratorio)
- Tooltips informativos com delay de 300ms

Nenhuma acao adicional necessaria.

---

## Parte 3 - Sala de Reuniao Virtual com Ata por IA

Esta e a parte mais complexa e sera dividida em etapas.

### 3.1 Formulario de Setup da Reuniao

**Novo componente:** `src/components/reuniao/SetupReuniao.tsx`
- Campos: Titulo da Reuniao, Pauta/Objetivos (textarea), Participantes (multi-select de colaboradores)
- Botao "Iniciar Reuniao" que cria o registro no banco e abre a sala

### 3.2 Interface da Sala de Reuniao

**Novo componente:** `src/components/reuniao/SalaReuniao.tsx`
- **Video/Audio**: Utilizar a Web API `getUserMedia` para captura de camera e microfone locais (videoconferencia peer-to-peer nao e viavel sem um servidor WebRTC/TURN, entao a implementacao sera para gravacao local com visualizacao da propria camera)
- **Controles**: Botoes Mutar, Camera On/Off, botao REC (gravacao via MediaRecorder API)
- **Transcricao em tempo real**: Barra lateral usando Web Speech API (`SpeechRecognition`) para exibir texto ao vivo
- **Banner LGPD**: Faixa fixa no topo: "Esta reuniao esta sendo gravada e transcrita para fins de registro institucional conforme a LGPD."

### 3.3 Gravacao e Armazenamento

- Gravar video/audio via `MediaRecorder` em formato WebM
- Ao encerrar, fazer upload do arquivo para um bucket de storage `reunioes` (novo)
- Salvar metadados na tabela `reunioes` (nova)

### 3.4 Geracao Automatica de Ata com IA

**Nova Edge Function:** `supabase/functions/gerar-ata-reuniao/index.ts`
- Recebe a transcrição completa da reunião
- Utiliza modelo de IA para gerar:
  - Resumo Executivo
  - Decisões Tomadas
  - Plano de Ação (lista de tarefas)
- Retorna JSON estruturado

**Componente de resultado:** `src/components/reuniao/AtaReuniao.tsx`
- Exibe a ata gerada com formatação limpa
- Botão "Exportar PDF" usando o padrão de branding já existente (`createStandardPdf` + `savePdfWithFooter`)

### 3.5 Integração no Menu e Roteamento

- Adicionar item "Reuniões" no menu lateral (Sidebar)
- Registrar rota `reuniao` no switch do `Dashboard.tsx`

----

## Detalhes Técnicos

### Novas tabelas no banco de dados

```text
reunioes
  - id (uuid, PK)
  - titulo (text)
  - pauta (text)
  - participantes (uuid[])
  - transcricao (text)
  - ata_gerada (jsonb)
  - gravacao_url (text)
  - status (text: 'agendada', 'em_andamento', 'encerrada')
  - criado_por (uuid)
  - created_at, updated_at (timestamptz)
```

### Novo bucket de storage

- Nome: `reunioes`
- Público: Não
- RLS: Apenas participantes podem acessar

### Nova Edge Function

- `gerar-ata-reuniao`: Usa integração com IA, sem necessidade de chave adicional

### Arquivos a criar

- `src/components/reuniao/SetupReuniao.tsx`
- `src/components/reuniao/SalaReuniao.tsx`
- `src/components/reuniao/AtaReuniao.tsx`
- `src/components/reuniao/index.ts`
- `src/components/reuniao/CookieBanner.tsx` (ou em `src/components/`)
- `supabase/functions/gerar-ata-reuniao/index.ts`

### Arquivos a modificar

- `src/components/Sidebar.tsx` (menu + toast de redirecionamento)
- `src/components/modules/MedicosModule.tsx` (toast de redirecionamento)
- `src/pages/Dashboard.tsx` (rota reuniao + cookie banner)
- `supabase/config.toml` (nova edge function)

### Limitacoes importantes

- A videoconferencia sera **local** (camera do proprio usuario), nao multiplos participantes em tempo real - isso exigiria infraestrutura WebRTC (TURN/STUN servers) que esta fora do escopo de uma aplicacao web frontend
- A Web Speech API funciona melhor no Chrome e pode nao estar disponivel em todos os navegadores
- A gravacao sera armazenada no dispositivo e enviada ao storage ao encerrar

