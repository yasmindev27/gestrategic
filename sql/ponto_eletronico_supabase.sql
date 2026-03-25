-- =============================
-- TABELAS DE PONTO ELETRÔNICO
-- =============================
-- Compatível com Supabase/PostgreSQL

-- 1. Batidas de Ponto (Entradas/Saídas)
create table if not exists public.batidas_ponto (
  id uuid primary key default gen_random_uuid(),
  colaborador_user_id uuid references auth.users(id),
  colaborador_nome text,
  setor text,
  tipo text check (tipo in ('entrada', 'saida')) not null,
  data_hora timestamptz not null,
  origem text, -- ex: 'web', 'mobile', 'totem'
  observacao text,
  created_at timestamptz default now()
);

-- 2. Justificativas de Ponto (Extensão de Jornada, etc)
create table if not exists public.justificativas_ponto (
  id uuid primary key default gen_random_uuid(),
  colaborador_user_id uuid references auth.users(id),
  colaborador_nome text,
  cargo_funcao text,
  setor text,
  data_ocorrencia date,
  jornada_contratual_entrada text,
  jornada_contratual_saida text,
  jornada_registrada_entrada text,
  jornada_registrada_saida text,
  minutos_excedentes integer,
  justificativa text,
  observacoes text,
  registrado_por uuid references auth.users(id),
  registrado_por_nome text,
  status text default 'pendente', -- pendente, aprovado, rejeitado
  created_at timestamptz default now()
);

-- Índices úteis
create index if not exists idx_batidas_ponto_colab on public.batidas_ponto(colaborador_user_id);
create index if not exists idx_justificativas_ponto_colab on public.justificativas_ponto(colaborador_user_id);

-- Comentários para documentação
comment on table public.batidas_ponto is 'Registros de batidas de ponto eletrônico (entrada/saída) dos colaboradores.';
comment on table public.justificativas_ponto is 'Justificativas de ponto (ex: extensão de jornada, ajustes, etc) vinculadas a colaboradores.';
