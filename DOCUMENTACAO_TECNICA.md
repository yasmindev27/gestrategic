# 📋 Documentação Técnica — GEStrategic (UPA 24h)

> Sistema de gestão hospitalar integrado para Unidades de Pronto Atendimento.  
> Gerado em: 13/03/2026

---

## 1. Visão Geral

**GEStrategic** é uma plataforma web SPA (Single Page Application) de gestão hospitalar completa, voltada para UPAs 24h. Abrange desde controle de leitos, escalas de enfermagem, prontuários e faturamento, até qualidade (NSP), chamados de TI/manutenção, restaurante, rouparia, segurança patrimonial, RH/DP e mais.

**Stack principal:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Supabase

---

## 2. Páginas (Rotas)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `src/pages/Index.tsx` | Landing page pública com apresentação institucional |
| `/auth` | `src/pages/Auth.tsx` | Login/Autenticação (email ou matrícula) |
| `/dashboard` | `src/pages/Dashboard.tsx` | Painel principal — carrega todos os módulos (lazy) |
| `/totem` ou `/terminal` | `src/pages/TotemRefeicoes.tsx` | Terminal de autoatendimento para registro de refeições |
| `/transporte` | `src/pages/Transporte.tsx` | Módulo de transporte |
| `/politica-privacidade` | `src/pages/PoliticaPrivacidade.tsx` | Política de Privacidade (LGPD) |
| `*` | `src/pages/NotFound.tsx` | Página 404 |

---

## 3. Módulos do Dashboard

O Dashboard funciona como um **SPA interna** — a sidebar controla o `activeSection` e renderiza o módulo correspondente via `switch/case` com **lazy loading** (React.lazy + Suspense).

| Seção (`activeSection`) | Componente | Descrição |
|--------------------------|-----------|-----------|
| `dashboard` | `DashboardPersonalizado` | Painel inicial com cards, gráficos e atalhos |
| `faturamento` | `FaturamentoUnificadoModule` | Saída de prontuários, folhas de faturamento, faltantes |
| `controle-fichas` | `ControleFichasModule` | Controle de fichas de atendimento |
| `equipe` / `rhdp` / `profissionais-saude` | `RHDPModule` | RH/DP — profissionais, atestados, banco de horas, avaliações |
| `agenda` | `AgendaModule` | Agenda corporativa com destinatários |
| `admin` | `AdminModule` | Administração — usuários, permissões, cargos, setores, infraestrutura |
| `logs` | `LogsAuditoriaModule` | Logs de auditoria (LGPD Art. 37 — imutáveis) |
| `tecnico-ti` | `TecnicoModule` (setor=ti) | Chamados de TI + inventário |
| `tecnico-manutencao` | `TecnicoModule` (setor=manutencao) | Chamados de Manutenção |
| `tecnico-engenharia` | `TecnicoModule` (setor=engenharia_clinica) | Chamados de Engenharia Clínica |
| `nir` / `dashboard-nir` | `NirModule` | Núcleo Interno de Regulação — SUS Fácil, transferências, tracker de produção |
| `laboratorio` | `LaboratorioModule` | Escala do laboratório |
| `restaurante` | `RestauranteModule` | Cardápio, registro de refeições, relatórios, café |
| `recepcao` | `RecepcaoModule` | Recepção — protocolos de atendimento (sepse, dor torácica) |
| `rouparia` | `RoupariaModule` | Gestão de rouparia — estoque, movimentações, categorias |
| `seguranca-trabalho` | `SegurancaTrabalhoModule` | ASOs, EPIs, vacinas, uniformes, rondas, notificações |
| `assistencia-social` | `AssistenciaSocialModule` | Atendimentos, encaminhamentos, passagem de plantão social |
| `qualidade` | `QualidadeModule` | NSP — incidentes, análises, ações, auditorias |
| `reportar-incidente` | `ReportarIncidenteDialog` | Formulário rápido de notificação de incidentes |
| `enfermagem` | `EnfermagemModule` | Escalas de enfermagem, trocas, aprovações |
| `mapa-leitos` | `MapaLeitosModule` | Mapa de leitos por setor com passagem de plantão |
| `chat` | `ChatModule` | Chat corporativo com moderação por IA |
| `medicos` | `MedicosModule` | Avaliação de prontuários pelo corpo clínico |
| `lms` | `LMSModule` | Plataforma de treinamentos — LNT&D, quizzes, presença |
| `reuniao` | `ReuniaoModule` | Salas de reunião com ata gerada por IA |
| `salus` | `SalusModule` | Integração Salus — importação de PDFs, listagem de faltantes |
| `gerencia` | `GerenciaModule` | Gestão de talentos e lançamento de notas |
| `painel-seguranca` / `seguranca-patrimonial` | `SegurancaPatrimonialModule` | Rondas, visitantes, conflitos, mapa de danos |
| `colaborador` | `ColaboradorModule` | Área do colaborador — extensão de jornada, dados pessoais |

---

## 4. Estrutura de Pastas

```
src/
├── assets/                     # Imagens e logos importados via ES6
├── components/
│   ├── ui/                     # Componentes shadcn/ui (Button, Card, Dialog, etc.)
│   ├── layout/                 # DashboardLayout, Sidebar
│   ├── modules/                # Módulos principais do dashboard
│   │   └── equipe/             # Sub-componentes do módulo Equipe
│   ├── admin/                  # Componentes do módulo Admin
│   ├── agenda/                 # Módulo de Agenda
│   ├── assistencia-social/     # Módulo Assistência Social
│   ├── chamados/               # Dashboard e gráficos de chamados
│   ├── chat/                   # Chat corporativo
│   ├── colaborador/            # Área do colaborador
│   ├── dashboard/              # Dashboard personalizado
│   ├── disc/                   # Avaliação DISC
│   ├── enfermagem/             # Escalas, trocas, aprovações
│   ├── faturamento/            # Dashboard de faturamento
│   ├── form-builder/           # Construtor de formulários
│   ├── gerencia/               # Gestão de talentos
│   ├── gestao-incidentes/      # NSP — incidentes, análises IA
│   ├── indicadores/            # Indicadores NSP e UPA
│   ├── lms/                    # LMS — treinamentos, quizzes
│   ├── mapa-leitos/            # Mapa de leitos
│   ├── medicos/                # Avaliação de prontuários
│   ├── nir/                    # NIR — SUS Fácil, transferências, tracker
│   │   └── nucleo-tracker/     # Tracker de produção do NIR
│   ├── protocolos/             # Protocolos clínicos (sepse, dor torácica)
│   ├── qualidade/              # Auditorias, conformidade, metas
│   ├── restaurante/            # Refeições, cardápio, café
│   ├── reuniao/                # Salas de reunião e atas
│   ├── rh/                     # Profissionais de saúde
│   ├── rhdp/                   # RH/DP — atestados, banco de horas, avaliações
│   ├── rouparia/               # Rouparia — estoque, movimentações
│   ├── sciras/                 # SCIRAS — infecções, culturas, antimicrobianos
│   ├── seguranca/              # Alertas e painel de segurança
│   ├── seguranca-patrimonial/  # Rondas, visitantes, conflitos
│   └── seguranca-trabalho/     # ASOs, EPIs, vacinas
├── hooks/                      # Custom hooks (useUserRole, usePermissoes, etc.)
├── integrations/supabase/      # Client e types auto-gerados
├── lib/                        # Utilitários (export, sanitize, brasilia-time)
├── pages/                      # Páginas/rotas
├── types/                      # Tipos TypeScript compartilhados
└── data/                       # Dados estáticos (perguntas DISC)

supabase/
├── config.toml                 # Configuração do projeto Supabase
├── functions/                  # Edge Functions (Deno)
│   ├── _shared/                # Headers CORS compartilhados
│   ├── admin-create-user/      # Criação de usuário (admin)
│   ├── admin-update-user/      # Edição de usuário (admin)
│   ├── admin-delete-user/      # Exclusão de usuário (admin)
│   ├── admin-reset-senhas-massa/ # Reset de senhas em massa
│   ├── analisar-incidente-ia/  # Análise de incidente por IA
│   ├── classificar-prioridade/ # Classificação de prioridade por IA
│   ├── enviar-push/            # Envio de push notifications
│   ├── gerar-ata-reuniao/      # Geração de ata por IA
│   ├── gerar-quiz-ia/          # Geração de quiz por IA
│   ├── gerar-relatorio-chamados/ # Relatório de chamados por IA
│   ├── gerar-vapid-keys/       # Geração de chaves VAPID
│   ├── importar-incidentes/    # Importação de incidentes via XLSX
│   ├── importar-prontuarios-massa/ # Importação de prontuários em massa
│   ├── moderar-mensagem/       # Moderação de chat por IA
│   ├── processar-pdf-salus/    # Processamento de PDFs do Salus
│   ├── proxy-iframe/           # Proxy para iframes externos
│   ├── resumo-semanal-incidentes/ # Resumo semanal de incidentes por IA
│   └── transcrever-audio/      # Transcrição de áudio por IA
└── migrations/                 # Migrações SQL do banco de dados

public/
├── assets/                     # Logos e recursos estáticos
├── data/                       # Planilhas de importação
├── sw-push.js                  # Service Worker para Push Notifications
├── manifest.json               # PWA Manifest
└── robots.txt                  # SEO
```

---

## 5. Bibliotecas Utilizadas

### Produção

| Biblioteca | Versão | Uso |
|-----------|--------|-----|
| **React** | 18.3.1 | Framework UI |
| **React DOM** | 18.3.1 | Renderização |
| **React Router DOM** | 7.13.0 | Roteamento SPA |
| **@supabase/supabase-js** | 2.90.1 | Cliente Supabase (banco, auth, storage, realtime) |
| **@tanstack/react-query** | 5.83.0 | Gerenciamento de estado assíncrono, cache de queries |
| **Tailwind CSS** | 3.4.17 | Estilização utility-first |
| **shadcn/ui** (Radix UI) | Diversos | Componentes acessíveis (Dialog, Select, Tabs, etc.) |
| **Recharts** | 2.15.4 | Gráficos e dashboards |
| **Lucide React** | 0.462.0 | Biblioteca de ícones |
| **date-fns** | 3.6.0 | Manipulação de datas (locale pt-BR) |
| **xlsx** | 0.18.5 | Leitura/escrita de planilhas Excel |
| **jsPDF** | 4.0.0 | Geração de PDFs |
| **jspdf-autotable** | 5.0.7 | Tabelas em PDFs |
| **docx** | 9.5.3 | Geração de documentos Word (.docx) |
| **file-saver** | 2.0.5 | Download de arquivos no navegador |
| **Zod** | 3.25.76 | Validação de schemas |
| **React Hook Form** | 7.61.1 | Gerenciamento de formulários |
| **cmdk** | 1.1.1 | Command palette (busca) |
| **Sonner** | 1.7.4 | Toasts/notificações |
| **Vaul** | 0.9.9 | Drawer mobile |
| **embla-carousel-react** | 8.6.0 | Carrosséis |
| **Leaflet + React-Leaflet** | 1.9.4 / 4.2.1 | Mapas interativos |
| **next-themes** | 0.3.0 | Tema claro/escuro |
| **vite-plugin-pwa** | 1.2.0 | Progressive Web App |
| **react-resizable-panels** | 2.1.9 | Painéis redimensionáveis |
| **input-otp** | 1.4.2 | Input OTP |

### Desenvolvimento

| Biblioteca | Uso |
|-----------|-----|
| **Vite** | Bundler + dev server |
| **TypeScript** | Tipagem estática |
| **ESLint** | Linting |
| **Playwright** | Testes E2E |
| **PostCSS + Autoprefixer** | Processamento CSS |
| **@tailwindcss/typography** | Plugin de tipografia |

---

## 6. Arquitetura e Comunicação entre Componentes

### 6.1 Fluxo de Autenticação

```
Auth.tsx → supabase.auth.signInWithPassword()
    ↓
onAuthStateChange() em Dashboard.tsx
    ↓
useUserRole() → busca roles do usuário (user_roles)
    ↓
Sidebar renderiza menu baseado em permissões
    ↓
Dashboard renderiza módulo ativo via activeSection
```

- Login unificado: aceita **email** ou **matrícula** (convertida para `matricula@interno.local`)
- Senha padrão para novos usuários: `123456` (flag `deve_trocar_senha` força troca no 1º acesso)
- Sessão protegida com **timeout de 15 minutos** por inatividade (LGPD)

### 6.2 Fluxo de Dados

```
Componente → supabase.from("tabela").select/insert/update/delete
                ↓
         Lovable Cloud (Supabase)
                ↓
         RLS Policies (segurança por linha)
                ↓
         Dados retornados ao componente
```

- **@tanstack/react-query** gerencia cache, revalidação e estados de loading
- **Realtime** via `supabase.channel()` em tabelas como chat, alertas de segurança
- **Edge Functions** para lógica server-side (IA, admin, push notifications)

### 6.3 Sistema de Permissões (dupla camada)

**Camada 1 — Roles (user_roles)**
```
useUserRole() → retorna flags booleanas (isAdmin, isNir, isEnfermagem, etc.)
    ↓
Sidebar.tsx e Dashboard.tsx usam para mostrar/ocultar módulos
```

**Camada 2 — Perfis granulares (perfis_sistema + permissoes_perfil)**
```
usePermissoes() → CRUD de perfis, módulos, ferramentas
    ↓
RPC obter_permissoes_usuario() e usuario_pode_acessar_modulo()
    ↓
Controle fino: pode_visualizar, pode_acessar, comportamento_sem_acesso
```

### 6.4 Comunicação entre Componentes

| Padrão | Onde é usado |
|--------|-------------|
| **Props drilling** | `Dashboard → Module` (onOpenExternal, onSectionChange) |
| **React Query cache** | Compartilhamento de dados entre módulos (invalidateQueries) |
| **Supabase Realtime** | Chat, alertas de segurança (publish/subscribe) |
| **Custom Hooks** | `useUserRole`, `usePermissoes`, `useBeds`, `useEnfermagem`, etc. |
| **Lazy Loading** | Todos os módulos carregados sob demanda (React.lazy) |
| **Context (Toast)** | Notificações globais via useToast() |

### 6.5 Edge Functions (Backend)

| Função | Modelo IA | Descrição |
|--------|-----------|-----------|
| `analisar-incidente-ia` | Lovable AI | Análise de causa-raiz de incidentes |
| `classificar-prioridade` | Lovable AI | Classificação automática de chamados |
| `gerar-ata-reuniao` | Lovable AI | Geração de ata a partir de notas |
| `gerar-quiz-ia` | Lovable AI | Criação de quizzes para treinamentos |
| `gerar-relatorio-chamados` | Lovable AI | Relatório analítico de chamados |
| `moderar-mensagem` | Lovable AI | Moderação de conteúdo no chat |
| `resumo-semanal-incidentes` | Lovable AI | Resumo semanal automatizado |
| `transcrever-audio` | Lovable AI | Transcrição de áudio para texto |
| `processar-pdf-salus` | — | OCR/processamento de PDFs do Salus |
| `importar-incidentes` | — | Importação de XLSX de incidentes |
| `importar-prontuarios-massa` | — | Importação em massa de prontuários |
| `admin-create-user` | — | Criação de usuário com service role |
| `admin-update-user` | — | Edição de usuário com service role |
| `admin-delete-user` | — | Exclusão de usuário com service role |
| `admin-reset-senhas-massa` | — | Reset de senhas em massa |
| `enviar-push` | — | Push notifications via Web Push |
| `gerar-vapid-keys` | — | Geração de chaves VAPID |
| `proxy-iframe` | — | Proxy para conteúdo externo |

---

## 7. Banco de Dados — Tabelas Principais

O banco possui **70+ tabelas** organizadas por domínio. Principais:

| Domínio | Tabelas |
|---------|---------|
| **Auth/Perfis** | `profiles`, `user_roles`, `perfis_sistema`, `usuario_perfil`, `permissoes_perfil`, `modulos_sistema`, `ferramentas_modulo` |
| **Prontuários** | `prontuarios`, `saida_prontuarios`, `avaliacoes_prontuarios`, `cadastros_inconsistentes` |
| **NIR** | `nir_registros_producao`, `nir_colaboradores`, `sus_facil_registros`, `transferencias_nir` |
| **Leitos** | `bed_records`, `daily_statistics` |
| **Chamados** | `chamados`, `chamados_comentarios`, `chamados_materiais` |
| **Qualidade/NSP** | `incidentes_nsp`, `analises_incidentes`, `acoes_incidentes`, `auditorias_qualidade`, `auditorias_seguranca_paciente` |
| **Enfermagem** | `enfermagem_escalas`, `enfermagem_trocas`, `enfermagem_configuracoes` |
| **RH/DP** | `atestados`, `banco_horas`, `avaliacoes_desempenho`, `avaliacoes_experiencia`, `profissionais_saude` |
| **Chat** | `chat_conversas`, `chat_mensagens`, `chat_participantes`, `chat_mensagens_lidas`, `chat_moderacao_logs` |
| **Restaurante** | `colaboradores_restaurante`, `cardapios`, `cafe_litro_diario` |
| **Rouparia** | `rouparia_itens`, `rouparia_movimentacoes` |
| **Segurança** | `alertas_seguranca`, `asos_seguranca` |
| **Inventário** | `ativos`, `ativos_disponibilidade`, `produtos`, `movimentacoes_estoque` |
| **Agenda** | `agenda_items`, `agenda_destinatarios` |
| **LMS** | `lms_treinamentos`, `lms_inscricoes`, `lms_quiz_perguntas` |
| **DISC** | `disc_results` |
| **Auditoria** | `logs_acesso`, `auditoria_temporalidade` |

---

## 8. Segurança e Conformidade

| Requisito | Implementação |
|-----------|--------------|
| **LGPD** | Consentimento (CookieBanner, LGPDConsent), logs imutáveis, timeout de sessão, mascaramento de dados |
| **ONA** | Auditorias de qualidade, indicadores NSP, protocolos de segurança do paciente |
| **RLS** | Todas as tabelas com Row-Level Security ativa |
| **Logs imutáveis** | Trigger `bloquear_edicao_logs` impede UPDATE/DELETE em `logs_acesso` |
| **Troca de senha** | Flag `deve_trocar_senha` obriga troca no 1º login |
| **Roles** | Tabela separada `user_roles` (proteção contra privilege escalation) |
| **SECURITY DEFINER** | Funções críticas como `has_role()`, `buscar_usuario_por_matricula()` |
| **Sanitização** | `src/lib/sanitize.ts` para inputs do usuário |
| **Headers de segurança** | Edge Functions com `X-Content-Type-Options`, `X-Frame-Options`, etc. |

---

## 9. PWA e Notificações

- **manifest.json** configurado para instalação como app
- **Service Worker** (`sw-push.js`) para Push Notifications
- **Edge Function `enviar-push`** para envio de notificações
- **Hook `usePushNotifications`** para gerenciar subscrições

---

## 10. Exportações e Relatórios

O sistema suporta exportação em múltiplos formatos:

| Formato | Biblioteca | Uso |
|---------|-----------|-----|
| **PDF** | jsPDF + jspdf-autotable | Relatórios, passagem de plantão, auditorias |
| **Excel** | xlsx (SheetJS) | Importação/exportação de dados tabulares |
| **Word** | docx | Atas de reunião, documentos formais |
| **CSV** | Nativo | Exportações simples |

---

*Documentação gerada automaticamente em 13/03/2026. Para atualizações, consulte o código-fonte.*
