import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Desativa o Realtime globalmente e aumenta timeout de conexão
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  realtime: {
    enabled: false, // Desativa Realtime (broadcast/presence) se não estiver usando
    params: {
      timeout: 30000, // 30 segundos de timeout para conexão
    },
  },
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});