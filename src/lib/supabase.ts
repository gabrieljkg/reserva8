import { createClient } from '@supabase/supabase-js';

// These variables are injected at runtime from the Secrets panel in AI Studio.
// For local development, you can set them in a .env file.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ygqdoewrjsjsfngojqnd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_OH7tNF0BM0c7-78H7oSzew_EkZFasW8';

const isPlaceholder = !supabaseUrl || !supabaseAnonKey || 
                     supabaseUrl === '[COLE SUA URL AQUI]' || 
                     supabaseAnonKey === '[COLE SUA KEY ANON AQUI]' ||
                     supabaseUrl.includes('placeholder');

if (isPlaceholder) {
  console.error('ERRO TÉCNICO SUPABASE: Credenciais não configuradas ou usando placeholders. Por favor, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no painel de Secrets.');
} else {
  console.log('Supabase configurado com URL:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
