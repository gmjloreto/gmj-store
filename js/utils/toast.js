// Sistema de Notificações Toast Moderno
const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

// Injetar estilos base via JS para garantir que funcione em qualquer página
const style = document.createElement('style');
style.textContent = `
    #toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
    }

    .toast {
        min-width: 300px;
        max-width: 450px;
        padding: 16px 20px;
        border-radius: 8px;
        background: #ffffff;
        color: #1e293b;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        pointer-events: auto;
        animation: toast-in 0.3s ease forwards;
        border-left: 6px solid #cbd5e1;
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
        font-weight: 500;
    }

    .toast.success { border-left-color: #10b981; background: #f0fdf4; }
    .toast.error { border-left-color: #ef4444; background: #fef2f2; }
    .toast.info { border-left-color: #3b82f6; background: #eff6ff; }

    .toast.fade-out {
        animation: toast-out 0.3s ease forwards;
    }

    @keyframes toast-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes toast-out {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }

    .toast-close {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 1.2rem;
        padding: 0;
        line-height: 1;
    }
`;
document.head.appendChild(style);

export function showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <button class="toast-close">&times;</button>
    `;

    toastContainer.appendChild(toast);

    const removeToast = () => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    };

    // Auto-remove
    const timer = setTimeout(removeToast, duration);

    // Click to remove
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(timer);
        removeToast();
    });
}

// Global para facilitar uso rápido
window.showToast = showToast;
