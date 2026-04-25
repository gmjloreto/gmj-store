// Sistema de Notificações Toast Moderno
const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

export function showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <button class="toast-close">&times;</button>
    `;

    toastContainer.appendChild(toast);

    const removeToast = () => {
        toast.classList.add('hiding');
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
