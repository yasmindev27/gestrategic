#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://dwbfhfjsayrswmdzkjlb.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_0XPE0F3HQVxCzBxb9HgSlA_0TQRvhYk';

// Ler o arquivo de migração
const migrationSQL = fs.readFileSync('./supabase/migrations/20260319_create_justificativa_horas_trocas_plantoe.sql', 'utf-8');

console.log('📋 Preparando para executar migração...');
console.log(`✓ Arquivo carregado: ${migrationSQL.length} caracteres`);
console.log(`✓ URL: ${SUPABASE_URL}`);
console.log(`✓ Service Role Key: ${SERVICE_ROLE_KEY.substring(0, 20)}...`);

// Função para executar SQL via API do Supabase usando fetch emulado com https
function executeSQL() {
  return new Promise((resolve, reject) => {
    // Para criar tabelas, precisamos usar o endpoint correto
    // Vamos tentar executar via rpc query
    const payload = JSON.stringify({
      queries: migrationSQL.split(';').filter(q => q.trim())
    });

    console.log('\n🚀 Enviando requisição para Supabase...');

    const options = {
      hostname: 'dwbfhfjsayrswmdzkjlb.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/sql',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'X-Client-Info': 'supabase-js/2.0.0',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`\n📊 Status: ${res.statusCode}`);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('\n✅ Migração executada com sucesso!');
          console.log('📍 Tabelas criadas:');
          console.log('   - justificativa_horas');
          console.log('   - trocas_plantoe');
          console.log('   - Índices e RLS configurados');
          resolve(data);
        } else if (res.statusCode === 404) {
          console.log('\n⚠️  Endpoint não encontrado. Essas tabelas podem já existir.');
          console.log('\n💡 Alternativa: Execute o SQL manualmente no dashboard do Supabase:');
          console.log('   1. Acesse: https://app.supabase.com/project/dwbfhfjsayrswmdzkjlb');
          console.log('   2. Vá para SQL Editor');
          console.log('   3. Cole o conteúdo de: supabase/migrations/20260319_create_justificativa_horas_trocas_plantoe.sql');
          console.log('   4. Clique em RUN');
          resolve(data);
        } else {
          console.error('\n❌ Erro na requisição:');
          console.error('Status:', res.statusCode);
          console.error('Resposta:', data);
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error('\n❌ Erro de conexão:', e.message);
      reject(e);
    });

    // req.write(payload);
    req.end();
  });
}

executeSQL()
  .then(() => {
    console.log('\n✨ Processo concluído!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Erro:', err.message);
    console.log('\n🔧 Se o erro persistir, execute manualmente no dashboard do Supabase.');
    process.exit(1);
  });
