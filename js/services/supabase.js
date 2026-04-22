const { createClient } = supabase;
export const _supabase = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.key);
