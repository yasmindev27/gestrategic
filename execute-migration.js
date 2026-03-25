const https = require('https');

const supabaseUrl = 'https://dwbfhfjsayrswmdzkjlb.supabase.co';
const serviceRoleKey = 'sb_secret_0XPE0F3HQVxCzBxb9HgSlA_0TQRvhYk';

// SQL da migração (simplificado para este teste)
const migrationSQL = `
-- Tabela: justificativa_horas
CREATE TABLE IF NOT EXISTS public.justificativa_horas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL,
  colaborador_nome text NOT NULL,
  data date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('extra', 'negativa')),
  horas numeric(5,2) NOT NULL,
  justificativa text NOT NULL,
  motivo text,
  arquivo_url text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  aprovador_id uuid,
  aprovador_nome text,
  data_aprovacao timestamp with time zone,
  observacoes_rejeicao text,
  registrado_por uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Tabela: trocas_plantoe
CREATE TABLE IF NOT EXISTS public.trocas_plantoe (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ofertante_id uuid NOT NULL,
  ofertante_nome text NOT NULL,
  aceitante_id uuid,
  aceitante_nome text,
  data_plantao_original date NOT NULL,
  tipo_plantao_original text NOT NULL,
  data_plantao_solicitado date NOT NULL,
  tipo_plantao_solicitado text NOT NULL,
  motivo_oferta text,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'aceita', 'pendente', 'aprovada', 'rejeitada', 'cancelada')),
  requer_aprovacao boolean NOT NULL DEFAULT true,
  aprovador_id uuid,
  aprovador_nome text,
  data_aprovacao timestamp with time zone,
  justificativa_rejeicao text,
  registrado_por uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_justificativa_horas_colaborador ON public.justificativa_horas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_justificativa_horas_status ON public.justificativa_horas(status);
CREATE INDEX IF NOT EXISTS idx_justificativa_horas_data ON public.justificativa_horas(data);
CREATE INDEX IF NOT EXISTS idx_justificativa_horas_aprovador ON public.justificativa_horas(aprovador_id);

CREATE INDEX IF NOT EXISTS idx_trocas_plantoe_ofertante ON public.trocas_plantoe(ofertante_id);
CREATE INDEX IF NOT EXISTS idx_trocas_plantoe_aceitante ON public.trocas_plantoe(aceitante_id);
CREATE INDEX IF NOT EXISTS idx_trocas_plantoe_status ON public.trocas_plantoe(status);
CREATE INDEX IF NOT EXISTS idx_trocas_plantoe_data ON public.trocas_plantoe(data_plantao_original);
CREATE INDEX IF NOT EXISTS idx_trocas_plantoe_aprovador ON public.trocas_plantoe(aprovador_id);

-- RLS
ALTER TABLE public.justificativa_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trocas_plantoe ENABLE ROW LEVEL SECURITY;

-- Políticas para justificativa_horas
CREATE POLICY IF NOT EXISTS "colaboradores_view_own_justificativas"
ON public.justificativa_horas FOR SELECT
USING (colaborador_id = auth.uid());

CREATE POLICY IF NOT EXISTS "gestores_view_all_justificativas"
ON public.justificativa_horas FOR SELECT
USING (
  auth.jwt() ->> 'app_roles' ILIKE '%gestor%' OR 
  auth.jwt() ->> 'app_roles' ILIKE '%admin%' OR
  auth.jwt() ->> 'app_roles' ILIKE '%rh_dp%'
);

CREATE POLICY IF NOT EXISTS "colaboradores_insert_justificativas"
ON public.justificativa_horas FOR INSERT
WITH CHECK (colaborador_id = auth.uid());

CREATE POLICY IF NOT EXISTS "gestores_update_justificativas"
ON public.justificativa_horas FOR UPDATE
USING (
  auth.jwt() ->> 'app_roles' ILIKE '%gestor%' OR 
  auth.jwt() ->> 'app_roles' ILIKE '%admin%' OR
  auth.jwt() ->> 'app_roles' ILIKE '%rh_dp%'
);

-- Políticas para trocas_plantoe
CREATE POLICY IF NOT EXISTS "colaboradores_view_own_trocas"
ON public.trocas_plantoe FOR SELECT
USING (ofertante_id = auth.uid() OR aceitante_id = auth.uid());

CREATE POLICY IF NOT EXISTS "gestores_view_all_trocas"
ON public.trocas_plantoe FOR SELECT
USING (
  auth.jwt() ->> 'app_roles' ILIKE '%gestor%' OR 
  auth.jwt() ->> 'app_roles' ILIKE '%admin%' OR
  auth.jwt() ->> 'app_roles' ILIKE '%rh_dp%'
);

CREATE POLICY IF NOT EXISTS "colaboradores_insert_trocas"
ON public.trocas_plantoe FOR INSERT
WITH CHECK (ofertante_id = auth.uid());

CREATE POLICY IF NOT EXISTS "colaboradores_update_own_trocas"
ON public.trocas_plantoe FOR UPDATE
USING (ofertante_id = auth.uid() OR aceitante_id = auth.uid());

CREATE POLICY IF NOT EXISTS "gestores_update_trocas"
ON public.trocas_plantoe FOR UPDATE
USING (
  auth.jwt() ->> 'app_roles' ILIKE '%gestor%' OR 
  auth.jwt() ->> 'app_roles' ILIKE '%admin%' OR
  auth.jwt() ->> 'app_roles' ILIKE '%rh_dp%'
);
`;

async function executeMigration() {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ query: migrationSQL });
    
    const options = {
      hostname: 'dwbfhfjsayrswmdzkjlb.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Migração executada com sucesso!');
          console.log('Status:', res.statusCode);
          resolve(data);
        } else {
          console.error('❌ Erro na migração');
          console.error('Status:', res.statusCode);
          console.error('Resposta:', data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Erro de conexão:', e);
      reject(e);
    });

    req.write(payload);
    req.end();
  });
}

executeMigration().catch(console.error);
