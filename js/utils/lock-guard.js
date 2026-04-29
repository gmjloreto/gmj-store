import { _supabase } from '../services/supabase.js';

/**
 * GMJ LOCK GUARD - Versão 2.0 (Real-time & Anti-Flicker)
 * 
 * Regras:
 * 1. Ocultar o site INSTANTANEAMENTE antes de qualquer lógica.
 * 2. Consultar o Supabase em tempo real (SEM CACHE) para o estado global.
 * 3. Validar sessão de acesso do visitante.
 * 4. Redirecionar usando replace para evitar loops de histórico.
 */

(async function initLockGuard() {
    // Ação imediata: Esconder a página para evitar Flash de Conteúdo (Flicker)
    document.documentElement.style.visibility = 'hidden';

    const path = window.location.pathname;
    const isPasswordPage = path.includes('password.html');
    const isRoot = !path.includes('/pages/');

    try {
        // 1. Consulta REAL-TIME no Supabase (Obrigatório em todo carregamento)
        const { data, error } = await _supabase
            .from('site_settings')
            .select('store_locked')
            .eq('id', '00000000-0000-0000-0000-000000000000')
            .single();

        if (error) throw error;

        const storeIsLocked = data.store_locked;

        if (!storeIsLocked) {
            // --- CASO 1: LOJA ESTÁ ABERTA (PÚBLICA) ---
            
            // Limpa qualquer acesso antigo para garantir consistência
            sessionStorage.removeItem('store_access');

            if (isPasswordPage) {
                // Se o usuário está na tela de senha e a loja abriu, manda pra home
                window.location.replace(isRoot ? 'index.html' : '../index.html');
            } else {
                // Revela o site normalmente
                document.documentElement.style.visibility = 'visible';
            }

        } else {
            // --- CASO 2: LOJA ESTÁ FECHADA (MODO PRIVADO) ---

            // Verifica se o visitante já digitou a senha nesta sessão
            const hasAccess = sessionStorage.getItem('store_access') === 'true';

            if (hasAccess) {
                // Visitante autorizado: Revela o site (se não estiver na página de senha)
                if (isPasswordPage) {
                    window.location.replace(isRoot ? 'index.html' : '../index.html');
                } else {
                    document.documentElement.style.visibility = 'visible';
                }
            } else {
                // Visitante NÃO autorizado: Bloqueio imediato
                if (!isPasswordPage) {
                    const redirectTarget = isRoot ? 'pages/password.html' : 'password.html';
                    window.location.replace(redirectTarget);
                } else {
                    // Se já estiver na página de senha, apenas revela ela
                    document.documentElement.style.visibility = 'visible';
                }
            }
        }

    } catch (err) {
        console.error("GMJ Lock Guard Error:", err);
        // Fallback de segurança: Em caso de erro de conexão com banco, 
        // liberamos o site para não deixar o cliente no escuro.
        document.documentElement.style.visibility = 'visible';
    }
})();