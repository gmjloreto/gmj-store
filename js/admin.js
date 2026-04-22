import { _supabase } from './services/supabase.js';
import { formatCurrency } from './utils/helpers.js';
import { showToast } from './utils/toast.js';

let state = {
    products: [],
    orders: [],
    filter: 'all',
    charts: {}
};

// Controle de tentativas de login (persistente)
const getAuthState = () => {
    const saved = localStorage.getItem('gmj_auth_state');
    return saved ? JSON.parse(saved) : { attempts: 0, lockoutUntil: 0 };
};

const saveAuthState = (state) => {
    localStorage.setItem('gmj_auth_state', JSON.stringify(state));
};

async function initAdmin() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return showLogin();
    
    document.getElementById('user-display').innerText = session.user.email;
    showDashboard();
    await refreshData();
}

async function refreshData() {
    try {
        const { data: products } = await _supabase.from('products').select('*').order('created_at', { ascending: false });
        const { data: orders } = await _supabase.from('orders').select('*').order('created_at', { ascending: false });
        
        state.products = products || [];
        state.orders = orders || [];
        
        updateMetrics();
        renderOrders();
        renderProducts();
        renderCharts();
    } catch (err) {
        showToast("Erro ao carregar dados do sistema", "error");
    }
}

function updateMetrics() {
    const paidOrders = state.orders.filter(o => o.status === 'paid');
    const revenue = paidOrders.reduce((acc, o) => acc + Number(o.total_price), 0);
    const orderCount = state.orders.length;
    const ticketMedio = paidOrders.length > 0 ? revenue / paidOrders.length : 0;
    const itemsSold = paidOrders.reduce((acc, o) => {
        const items = Array.isArray(o.items) ? o.items : [];
        return acc + items.reduce((sum, i) => sum + (i.quantity || 0), 0);
    }, 0);

    document.getElementById('m-revenue').innerText = formatCurrency(revenue);
    document.getElementById('m-orders').innerText = orderCount;
    document.getElementById('m-average').innerText = formatCurrency(ticketMedio);
    document.getElementById('m-sold').innerText = itemsSold;
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    if (!list) return;
    const filtered = state.orders.filter(o => state.filter === 'all' || o.status === state.filter);
    list.innerHTML = filtered.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:3rem; color:#94a3b8;">Nenhum pedido encontrado.</td></tr>' : '';
    
    filtered.forEach(o => {
        const date = new Date(o.created_at).toLocaleDateString('pt-BR');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code style="font-size:0.75rem; color:#64748b;">#${o.id.slice(0, 8)}</code></td>
            <td>${date}</td>
            <td><strong>${o.customer_name}</strong><br><small style="color:#64748b;">${o.customer_phone}</small></td>
            <td><strong>${formatCurrency(o.total_price)}</strong></td>
            <td><span class="status-pill status-${o.status}">${o.status}</span></td>
            <td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-edit" style="padding:0.4rem; background:#f1f5f9;" onclick="window.viewOrderDetails('${o.id}')" title="Ver Detalhes">🔍</button>
                    ${o.status === 'pending' ? `
                        <button class="btn-edit" style="background:#dcfce7; color:#166534; border:none;" onclick="window.confirmPayment('${o.id}')">Pagar</button>
                        <button class="btn-delete" style="padding:0.4rem;" onclick="window.cancelOrder('${o.id}')">×</button>
                    ` : `<span style="font-size:0.75rem; color:#94a3b8; display:flex; align-items:center;">Finalizado</span>`}
                </div>
            </td>
        `;
        list.appendChild(tr);
    });
}

window.viewOrderDetails = (id) => {
    const o = state.orders.find(order => order.id === id);
    if (!o) return;

    document.getElementById('det-order-id').innerText = `#${o.id.slice(0, 8)}`;
    document.getElementById('det-cust-name').innerText = o.customer_name;
    document.getElementById('det-cust-cpf').innerText = o.customer_cpf;
    document.getElementById('det-cust-email').innerText = o.customer_email;
    document.getElementById('det-cust-phone').innerText = o.customer_phone;
    
    const info = o.shipping_info || {};
    document.getElementById('det-ship-method').innerText = info.method === 'pickup' ? 'Retirada na Igreja' : 'Entrega em Domicílio';
    
    const addrContainer = document.getElementById('det-address-container');
    if (info.method === 'pickup') {
        addrContainer.style.display = 'none';
    } else {
        addrContainer.style.display = 'block';
        document.getElementById('det-ship-address').innerText = info.address || 'N/A';
        document.getElementById('det-ship-city').innerText = info.city_uf || 'N/A';
        document.getElementById('det-ship-cep').innerText = info.cep || 'N/A';
    }

    const statusPill = document.getElementById('det-order-status');
    statusPill.innerText = o.status.toUpperCase();
    statusPill.className = `status-pill status-${o.status}`;

    const itemsList = document.getElementById('det-items-list');
    itemsList.innerHTML = (o.items || []).map(item => `
        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.85rem; border-bottom:1px solid #eee; padding-bottom:0.3rem;">
            <span>${item.quantity}x ${item.name}</span>
            <span>${formatCurrency(item.price * item.quantity)}</span>
        </div>
    `).join('');

    document.getElementById('det-order-total').innerText = formatCurrency(o.total_price);
    document.getElementById('order-details-modal').classList.add('show');
};

function renderProducts() {
    const list = document.getElementById('admin-products-list');
    if (!list) return;
    list.innerHTML = '';
    state.products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${p.image_url}" class="admin-thumb" style="width:40px; height:40px; border-radius:8px;"></td>
            <td><strong>${p.name}</strong></td>
            <td>${formatCurrency(p.price)}</td>
            <td><span style="font-weight:700; color:${p.stock < 5 ? '#ef4444' : '#1e293b'}">${p.stock || 0}</span></td>
            <td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-edit" onclick="window.editProduct('${p.id}')">✏️ Editar</button>
                    <button class="btn-delete" onclick="window.deleteProduct('${p.id}')">🗑️ Deletar</button>
                </div>
            </td>
        `;
        list.appendChild(tr);
    });
}

function renderCharts() {
    // Destruir gráficos anteriores se existirem
    if (state.charts.revenue) state.charts.revenue.destroy();
    if (state.charts.status) state.charts.status.destroy();

    const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
    const statusCtx = document.getElementById('statusChart')?.getContext('2d');

    if (revenueCtx) {
        // Agrupar faturamento por data (últimos 7 dias)
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toLocaleDateString('pt-BR');
        }).reverse();

        const revenueData = last7Days.map(date => {
            return state.orders
                .filter(o => o.status === 'paid' && new Date(o.created_at).toLocaleDateString('pt-BR') === date)
                .reduce((acc, o) => acc + Number(o.total_price), 0);
        });

        state.charts.revenue = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Vendas (R$)',
                    data: revenueData,
                    borderColor: '#000000',
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: '#000000'
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    if (statusCtx) {
        const statusCounts = {
            pending: state.orders.filter(o => o.status === 'pending').length,
            paid: state.orders.filter(o => o.status === 'paid').length,
            cancelled: state.orders.filter(o => o.status === 'cancelled').length
        };

        state.charts.status = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pendentes', 'Pagos', 'Cancelados'],
                datasets: [{
                    data: [statusCounts.pending, statusCounts.paid, statusCounts.cancelled],
                    backgroundColor: ['#fef3c7', '#dcfce7', '#fee2e2'],
                    borderColor: ['#f59e0b', '#10b981', '#ef4444'],
                }]
            },
            options: { 
                cutout: '70%', 
                responsive: true,
                maintainAspectRatio: false, // Permite que o CSS controle a altura
                plugins: { legend: { position: 'bottom' } } 
            }
        });
    }
}

// Global actions
window.confirmPayment = async (id) => {
    if (confirm('Marcar pedido como PAGO? Isso reduzirá o estoque dos itens.')) {
        try {
            // Tenta chamar RPC se existir, senão faz manual
            const { error } = await _supabase.rpc('confirm_order_payment', { p_order_id: id });
            
            if (error) {
                // Fallback manual se a RPC não existir
                const order = state.orders.find(o => o.id === id);
                const { error: updateError } = await _supabase.from('orders').update({ status: 'paid' }).eq('id', id);
                if (updateError) throw updateError;
                
                // Atualiza estoque manualmente para cada item
                for (const item of order.items) {
                    const product = state.products.find(p => p.id === item.id);
                    if (product) {
                        await _supabase.from('products').update({ stock: product.stock - item.quantity }).eq('id', product.id);
                    }
                }
            }
            showToast('Pedido confirmado!', 'success');
            await refreshData();
        } catch (error) {
            showToast("Erro ao confirmar: " + error.message, "error");
        }
    }
};

window.cancelOrder = async (id) => {
    if (confirm('Cancelar este pedido?')) {
        const { error } = await _supabase.from('orders').update({ status: 'cancelled' }).eq('id', id);
        if (error) showToast(error.message, "error");
        else { showToast("Pedido cancelado", "info"); refreshData(); }
    }
};

window.editProduct = (id) => {
    const p = state.products.find(item => item.id === id);
    if (!p) return;
    document.getElementById('product-id').value = p.id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-price').value = p.price;
    document.getElementById('p-stock').value = p.stock || 0;
    document.getElementById('p-description').value = p.description || '';
    document.getElementById('p-image').value = p.image_url;
    document.getElementById('p-image-2').value = p.image_url_2 || '';
    document.getElementById('p-image-3').value = p.image_url_3 || '';
    document.getElementById('modal-title').innerText = 'Editar Produto';
    document.getElementById('product-modal').classList.add('show');
};

window.deleteProduct = async (id) => {
    if (confirm('Excluir produto permanentemente?')) {
        const { error } = await _supabase.from('products').delete().eq('id', id);
        if (error) showToast(error.message, "error");
        else { showToast("Produto removido", "success"); refreshData(); }
    }
};

// Listeners
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const auth = getAuthState();

    // Verifica bloqueio
    if (Date.now() < auth.lockoutUntil) {
        const remaining = Math.ceil((auth.lockoutUntil - Date.now()) / 1000);
        showToast(`Muitas tentativas. Aguarde ${remaining}s.`, "error");
        return;
    }

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        auth.attempts++;
        if (auth.attempts >= 5) {
            auth.lockoutUntil = Date.now() + (30 * 1000); // 30 segundos de bloqueio
            auth.attempts = 0;
            showToast("Muitas tentativas falhas. Bloqueado por 30s.", "error");
        } else {
            showToast(`Acesso negado (${auth.attempts}/5)`, "error");
        }
    } else {
        auth.attempts = 0;
        auth.lockoutUntil = 0;
    }
    
    saveAuthState(auth);
    if (!error) initAdmin();
});

document.getElementById('product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const data = {
        name: document.getElementById('p-name').value,
        price: parseFloat(document.getElementById('p-price').value),
        stock: parseInt(document.getElementById('p-stock').value),
        description: document.getElementById('p-description').value,
        image_url: document.getElementById('p-image').value,
        image_url_2: document.getElementById('p-image-2').value || null,
        image_url_3: document.getElementById('p-image-3').value || null
    };
    
    const { error } = id 
        ? await _supabase.from('products').update(data).eq('id', id) 
        : await _supabase.from('products').insert([data]);
        
    if (error) showToast(error.message, "error");
    else {
        showToast("Dados salvos!", "success");
        document.getElementById('product-modal').classList.remove('show');
        refreshData();
    }
});

document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await _supabase.auth.signOut();
    location.reload();
});

document.getElementById('btn-add-product')?.addEventListener('click', () => {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('modal-title').innerText = 'Novo Produto';
    document.getElementById('product-modal').classList.add('show');
});

document.getElementById('btn-close-modal')?.addEventListener('click', () => {
    document.getElementById('product-modal').classList.remove('show');
});

document.getElementById('filter-status')?.addEventListener('change', (e) => {
    state.filter = e.target.value;
    renderOrders();
});

// Lógica de destaque da Navbar
document.querySelectorAll('#adminNav .nav-item').forEach(link => {
    link.addEventListener('click', (e) => {
        document.querySelectorAll('#adminNav .nav-item').forEach(n => n.classList.remove('active'));
        link.classList.add('active');
    });
});

function showDashboard() { 
    document.getElementById('login-container').style.display = 'none'; 
    document.getElementById('admin-dashboard').style.display = 'block'; 
}
function showLogin() { 
    document.getElementById('login-container').style.display = 'flex'; 
    document.getElementById('admin-dashboard').style.display = 'none'; 
}

document.getElementById('btn-close-order-modal')?.addEventListener('click', () => {
    document.getElementById('order-details-modal').classList.remove('show');
});

document.getElementById('btn-close-order-modal-2')?.addEventListener('click', () => {
    document.getElementById('order-details-modal').classList.remove('show');
});

document.getElementById('btn-print-order')?.addEventListener('click', () => {
    window.print();
});

initAdmin();