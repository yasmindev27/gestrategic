import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Supabase configuration (from environment variables or .env.local)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface DISCRecord {
  nome_completo: string;
  cargo_atual: string;
  setor: string;
  tempo_atuacao: string;
  formacao: string;
  experiencia_lideranca: string;
  score_d: number;
  score_i: number;
  score_s: number;
  score_c: number;
  perfil_predominante: string;
  perfil_secundario: string;
  leadership_score: number;
}

async function importDISCResults() {
  try {
    console.log('📂 Lendo arquivo CSV...');
    
    // Read CSV file
    const csvPath = join(__dirname, '../public/data/disc_results-export.csv');
    const fileContent = readFileSync(csvPath, 'utf-8');
    
    // Parse CSV (semicolon-delimited)
    const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);
    const headers = lines[0].split(';').map(h => h.trim());
    
    const records: DISCRecord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());
      
      if (values.length < 10) continue; // Skip invalid rows
      
      const nomeCompleto = values[1];
      if (!nomeCompleto || nomeCompleto.length < 3) continue;
      
      const scoreD = Number(values[7]) || 0;
      const scoreI = Number(values[8]) || 0;
      const scoreS = Number(values[9]) || 0;
      const scoreC = Number(values[10]) || 0;
      const leadershipScore = Number(values[13]) || 0;
      
      // Validate score ranges
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
    
    console.log(`📊 ${records.length} registros encontrados`);
    
    if (records.length === 0) {
      console.log('❌ Nenhum registro válido encontrado');
      return;
    }
    
    console.log('📝 Inserindo dados no Supabase...');
    
    // Insert in batches to avoid timeout
    const batchSize = 10;
    let inserted = 0;
    let failed = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase
          .from('disc_results')
          .insert(batch);
        
        if (error) {
          console.error(`❌ Erro ao inserir batch ${i / batchSize + 1}:`, error);
          failed += batch.length;
        } else {
          inserted += batch.length;
          console.log(`✅ ${inserted}/${records.length} registros inseridos`);
        }
      } catch (err) {
        console.error(`❌ Erro na requisição:`, err);
        failed += batch.length;
      }
    }
    
    console.log(`\n✨ Importação concluída!`);
    console.log(`   ✅ ${inserted} registros inseridos`);
    console.log(`   ❌ ${failed} registros falharam`);
    
  } catch (error) {
    console.error('❌ Erro ao importar DISC resultados:', error);
    process.exit(1);
  }
}

importDISCResults();
