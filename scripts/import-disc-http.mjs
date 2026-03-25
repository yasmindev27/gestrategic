#!/usr/bin/env node
/**
 * Script para importar DISC resultados via API REST do Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const SUPABASE_URL = 'https://jwsxvwcvmughjqzlbgrg.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJpc3MiOiAic3VwYWJhc2UiLAogICJyZWYiOiAiandzd3Zjdm11Z2hqcXpsYmdyZyIsCiAgInJvbGUiOiAiYW5vbiIsCiAgImlhdCI6IDE2ODA2MjczNzYsCiAgImV4cCI6IDE2OTkzNDczNzYKfQ.DQlr-DHSLjL-_LgZGPKWLhw_3bVbJ-qpJMX5-J5aMgc';

const csvPath = path.join(__dirname, '../public/data/disc_results-export.csv');
console.log(`📂 Lendo arquivo: ${csvPath}`);

if (!fs.existsSync(csvPath)) {
  console.error(`❌ Arquivo não encontrado: ${csvPath}`);
  process.exit(1);
}

const fileContent = fs.readFileSync(csvPath, 'utf-8');
const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);

if (lines.length < 2) {
  console.error('❌ Arquivo CSV vazio');
  process.exit(1);
}

// Parse records
const records = [];
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(';').map(v => v.trim());
  
  if (values.length < 14) continue;
  
  const nomeCompleto = values[1];
  if (!nomeCompleto || nomeCompleto.length < 3) continue;
  
  const scoreD = Number(values[7]) || 0;
  const scoreI = Number(values[8]) || 0;
  const scoreS = Number(values[9]) || 0;
  const scoreC = Number(values[10]) || 0;
  const leadershipScore = Number(values[13]) || 0;
  
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

console.log(`📊 ${records.length} registros encontrados\n`);

// Import via fetch
async function importRecords() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/disc_results`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(records),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro na requisição:', response.status);
      console.error('   Resposta:', error);
      process.exit(1);
    }
    
    console.log(`✅ ${records.length} registros importados com sucesso!`);
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

importRecords();
