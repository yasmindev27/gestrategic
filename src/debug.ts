import { supabase } from '@/integrations/supabase/client';

export async function debugDados() {
  try {
    console.log('=== DEBUG SUPABASE DADOS ===');

    // 1. Verificar bed_records
    const { data: beds, error: bedsError } = await supabase
      .from('bed_records')
      .select('*')
      .limit(5);
    
    console.log('bed_records:', { count: beds?.length, sample: beds?.[0], error: bedsError });

    // 2. Verificar nir_registros_producao
    const { data: nir, error: nirError } = await supabase
      .from('nir_registros_producao')
      .select('*')
      .limit(5);
    
    console.log('nir_registros_producao:', { count: nir?.length, sample: nir?.[0], error: nirError });

    // 3. Verificar gerencia_notas_fiscais
    const { data: notas, error: notasError } = await supabase
      .from('gerencia_notas_fiscais')
      .select('*')
      .limit(5);
    
    console.log('gerencia_notas_fiscais:', { count: notas?.length, sample: notas?.[0], error: notasError });

    // 4. Verificar saida_prontuarios
    const { data: saidas, error: saidasError } = await supabase
      .from('saida_prontuarios')
      .select('*')
      .limit(5);
    
    console.log('saida_prontuarios:', { count: saidas?.length, sample: saidas?.[0], error: saidasError });

    // 5. Verificar assistencia_social_atendimentos
    const { data: assistencia, error: assistenciaError } = await supabase
      .from('assistencia_social_atendimentos')
      .select('*')
      .limit(5);
    
    console.log('assistencia_social_atendimentos:', { count: assistencia?.length, sample: assistencia?.[0], error: assistenciaError });

    // 6. Contar toptal de registros
    const { count: bedCount } = await supabase
      .from('bed_records')
      .select('*', { count: 'exact', head: true });

    const { count: nirCount } = await supabase
      .from('nir_registros_producao')
      .select('*', { count: 'exact', head: true });

    const { count: notasCount } = await supabase
      .from('gerencia_notas_fiscais')
      .select('*', { count: 'exact', head: true });

    console.log('TOTAIS:', { bedCount, nirCount, notasCount });

  } catch (err) {
    console.error('DEBUG ERROR:', err);
  }
}

// Executar automaticamente
debugDados();
