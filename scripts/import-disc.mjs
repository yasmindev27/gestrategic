#!/usr/bin/env node
/**
 * Script para importar dados DISC resultados do CSV para o Supabase
 * Usage: node scripts/import-disc.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jwsxvwcvmughjqzlbgrg.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Erro: VITE_SUPABASE_ANON_KEY não definida');
  console.error('   Adicione a chave no arquivo .env.local ou como variável de ambiente');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read and parse CSV
const csvPath = path.join(__dirname, '../public/data/disc_results-export.csv');
console.log(`📂 Lendo arquivo: ${csvPath}`);

if (!fs.existsSync(csvPath)) {
  console.error(`❌ Arquivo não encontrado: ${csvPath}`);
  process.exit(1);
}

const fileContent = fs.readFileSync(csvPath, 'utf-8');
const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);

if (lines.length < 2) {
  console.error('❌ Arquivo CSV vazio ou inválido');
  process.exit(1);
}

// Parse records (skip header and ID column)
const records = [];
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(';').map(v => v.trim());
  
  if (values.length < 14) continue;
  
  // Skip ID, parse from column 1 onwards
  const nomeCompleto = values[1];
  if (!nomeCompleto || nomeCompleto.length < 3) continue;
  
  const scoreD = Number(values[7]) || 0;
  const scoreI = Number(values[8]) || 0;
  const scoreS = Number(values[9]) || 0;
  const scoreC = Number(values[10]) || 0;
  const leadershipScore = Number(values[13]) || 0;
  
  // Validate scores
  if (scoreD < 0 || scoreD > 24) continue;
  if (scoreI < 0 || scoreI > 24) continue;
  if (scoreS < 0 || scoreS > 24) continue;
  if (scoreC < 0 || scoreC > 24) continue;
  if (leadershipScore < 10 || leadershipScore > 50) continue;
  
  records.push({
    nome_completo: nomeCompleto,
    cargo_atual: values[2] || '',
    setor: values[3] || '',
    tempo_atuacao: values[4] || '',
    formacao: values[5] || '',
    experiencia_lideranca: values[6] || '',
    score_d: scoreD,
    score_i: scoreI,
    score_s: scoreS,
    score_c: scoreC,
    perfil_predominante: values[11] || '',
    perfil_secundario: values[12] || '',
    leadership_score: leadershipScore,
  });
}

console.log(`📊 ${records.length} registros encontrados para importação`);

if (records.length === 0) {
  console.error('❌ Nenhum registro válido encontrado');
  process.exit(1);
}

// Insert into Supabase
async function importRecords() {
  try {
    console.log('📝 Conectando ao Supabase...');
    const { data: { session } } = await supabase.auth.getSession();
    
    console.log('📝 Inserindo dados...');
    const { error, data } = await supabase
      .from('disc_results')
      .insert(records)
      .select();
    
    if (error) {
      console.error('❌ Erro ao inserir dados:', error);
      process.exit(1);
    }
    
    console.log(`✅ ${records.length} registros importados com sucesso!`);
    console.log(`   Dados inseridos: ${data?.length || 0}`);
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Erro durante importação:', err);
    process.exit(1);
  }
}

importRecords();
