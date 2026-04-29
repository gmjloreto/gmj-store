import { _supabase } from '../services/supabase.js';

/**
 * Lock Guard: Protege as páginas públicas redirecionando para a tela de senha
 * se o Modo Privado estiver ativado no Supabase.
 */
async function checkLock() {
    // 1. Se já tem acesso autorizado nesta sessão, não faz nada
    if (sessionStorage.getItem('store_access') === 'true') {
        return;
    }

    // 2. Evitar loop infinito se já estivermos na página de senha
    if (window.location.pathname.includes('password.html')) {
        return;
    }

    try {
        // 3. Consulta o status de bloqueio no Supabase
        const { data, error } = await _supabase
            .from('site_settings')
            .select('store_locked')
            .eq('id', '00000000-0000-0000-0000-000000000000')
            .single();

        if (error) throw error;

        // 4. Se a loja estiver bloqueada, redireciona para a página de senha
        if (data && data.store_locked) {
            const isRoot = !window.location.pathname.includes('/pages/');
            const redirectPath = isRoot ? 'pages/password.html' : 'password.html';
            window.location.href = redirectPath;
        }
    } catch (err) {
        console.error("GMJ Lock Guard: Erro ao verificar status da loja.", err);
    }
}

// Executa a verificação imediatamente
checkLock();