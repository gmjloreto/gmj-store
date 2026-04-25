import { _supabase } from './services/supabase.js';
import { formatCurrency } from './utils/helpers.js';
import { showToast } from './utils/toast.js';

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = 'dnt2b4nd8';
const CLOUDINARY_UPLOAD_PRESET = 'store_images';

let state = {
    products: [],
    orders: [],
    carousel: [],
    filter: 'all',
    ordersLimit: 10,
    charts: { revenue: null, status: null }
};

// --- INICIALIZAÇÃO ---
async function initAdmin() {
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (!session) {
        document.getElementById('login-container').classList.remove('dashboard-hidden');
        document.getElementById('admin-dashboard').classList.add('dashboard-hidden');
        return;
    }

    document.getElementById('login-container').classList.add('dashboard-hidden');
    document.getElementById('admin-dashboard').classList.remove('dashboard-hidden');
    document.getElementById('user-display').innerText = session.user.email;
    
    setupOnePageNavigation();
    setupImageUploads();
    setupVariationToggle();
    setupLoadMoreOrders();
    setupModalClosers();
    refreshData();
}

// --- GESTÃO DE DADOS ---
async function refreshData() {
    try {
        const [pRes, oRes, cRes] = await Promise.all([
            _supabase.from('products').select('*').order('name'),
            _supabase.from('orders').select('*').order('created_at', { ascending: false }),
            _supabase.from('carousel_slides').select('*').order('order_index', { ascending: true })
        ]);

        state.products = pRes.data || [];
        state.orders = oRes.data || [];
        state.carousel = cRes.data || [];
        
        updateMetrics();
        renderOrders();
        renderProducts();
        renderCarousel();
        renderCharts();
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
        showToast("Erro ao carregar dados", "error");
    }
}

function updateMetrics() {
    const paidOrders = state.orders.filter(o => o.status === 'paid');
    const revenue = paidOrders.reduce((acc, o) => acc + Number(o.total_price), 0);
    
    // Busca total de itens vendidos através dos order_items vinculados aos pedidos pagos
    // Nota: Como refreshData não carrega order_items por padrão para todos os pedidos, 
    // esta métrica será simplificada ou atualizada via query específica se necessário.
    // Por ora, mantemos a contagem baseada nos pedidos para evitar múltiplas requisições.
    const totalOrdersCount = state.orders.length;

    if (document.getElementById('m-revenue')) document.getElementById('m-revenue').innerText = formatCurrency(revenue);
    if (document.getElementById('m-orders')) document.getElementById('m-orders').innerText = totalOrdersCount;
    if (document.getElementById('m-average')) document.getElementById('m-average').innerText = formatCurrency(paidOrders.length ? revenue / paidOrders.length : 0);
    if (document.getElementById('m-sold')) document.getElementById('m-sold').innerText = paidOrders.length; // Placeholder simplificado
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    const loadMoreContainer = document.getElementById('load-more-orders-container');
    if (!list) return;

    const filterStatus = document.getElementById('filter-status')?.value || 'all';
    const filtered = state.orders.filter(o => filterStatus === 'all' || o.status === filterStatus);
    const visibleOrders = filtered.slice(0, state.ordersLimit);

    list.innerHTML = filtered.length ? '' : '<tr><td colspan="6" style="text-align:center; padding:2rem;">Nenhum pedido.</td></tr>';
    
    visibleOrders.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>#${o.id.slice(0, 8)}</code></td>
            <td>${new Date(o.created_at).toLocaleDateString()}</td>
            <td><strong>${o.customer_name}</strong></td>
            <td>${formatCurrency(o.total_price)}</td>
            <td><span class="status-pill status-${o.status}">${o.status}</span></td>
            <td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-edit" onclick="window.viewOrderDetails('${o.id}')">🔍</button>
                    ${o.status === 'pending' ? `<button class="btn-buy" style="padding:0.4rem 0.8rem; font-size:0.7rem;" onclick="window.confirmPayment('${o.id}')">Pagar</button>` : ''}
                </div>
            </td>`;
        list.appendChild(tr);
    });

    if (loadMoreContainer) loadMoreContainer.style.display = filtered.length > state.ordersLimit ? 'block' : 'none';
}

function renderProducts() {
    const list = document.getElementById('admin-products-list');
    if (!list) return;
    list.innerHTML = '';
    state.products.forEach(p => {
        const tr = document.createElement('tr');
        
        // Exibe o estoque real. Se for grade, mantemos o destaque visual sem o texto "Grade"
        const stockDisplay = p.has_sizes 
            ? `<span style="color:var(--accent); font-weight:bold;">${p.stock}</span>` 
            : p.stock;

        tr.innerHTML = `
            <td><img src="${p.image_url}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;"></td>
            <td><strong>${p.name}</strong> ${p.has_sizes ? '<span class="tag-accent" style="font-size:10px; padding:2px 6px;">Variações</span>' : ''}</td>
            <td>${formatCurrency(p.price)}</td>
            <td>${stockDisplay}</td>
            <td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-edit" onclick="window.editProduct('${p.id}')">✏️</button>
                    <button class="btn-delete" onclick="window.deleteProduct('${p.id}')">🗑️</button>
                </div>
            </td>`;
        list.appendChild(tr);
    });
}

function renderCarousel() {
    const list = document.getElementById('carousel-list');
    if (!list) return;
    list.innerHTML = '';
    state.carousel.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${s.image_url}" style="width:60px; height:30px; object-fit:cover; border-radius:4px;"></td>
            <td><strong>${s.title}</strong></td>
            <td>${s.subtitle || '-'}</td>
            <td>${s.order_index}</td>
            <td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-edit" onclick="window.editSlide('${s.id}')">✏️</button>
                    <button class="btn-delete" onclick="window.deleteSlide('${s.id}')">🗑️</button>
                </div>
            </td>`;
        list.appendChild(tr);
    });
}

// --- FUNÇÕES GLOBAIS ---
window.viewOrderDetails = async (id) => {
    const o = state.orders.find(order => order.id === id);
    if (!o) return;
    const { data: items } = await _supabase.from('order_items').select('*').eq('order_id', id);
    
    document.getElementById('det-order-id').innerText = `#${o.id.slice(0, 8)}`;
    document.getElementById('det-cust-name').innerText = o.customer_name;
    document.getElementById('det-cust-cpf').innerText = o.customer_cpf || 'N/A';
    document.getElementById('det-cust-email').innerText = o.customer_email || 'N/A';
    document.getElementById('det-cust-phone').innerText = o.customer_phone || 'N/A';
    
    const isPickup = o.shipping_info?.method === 'pickup';
    document.getElementById('det-ship-method').innerText = isPickup ? 'Retirada' : 'Entrega';
    
    const addrContainer = document.getElementById('det-address-container');
    if (isPickup) {
        addrContainer.style.display = 'none';
    } else {
        addrContainer.style.display = 'block';
        document.getElementById('det-ship-address').innerText = o.shipping_info?.address || 'N/A';
        document.getElementById('det-ship-city').innerText = o.shipping_info?.city_uf || 'N/A';
        document.getElementById('det-ship-cep').innerText = o.shipping_info?.cep || 'N/A';
    }

    document.getElementById('det-order-status').innerText = o.status;
    document.getElementById('det-order-total').innerText = formatCurrency(o.total_price);
    
    const itemsList = document.getElementById('det-items-list');
    itemsList.innerHTML = (items || []).map(item => `
        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.85rem;">
            <span>${item.quantity}x ${item.product_name} (${item.selected_size})</span>
            <span>${formatCurrency(item.subtotal)}</span>
        </div>
    `).join('');
    document.getElementById('order-details-modal').classList.add('show');
};

window.editProduct = async (id) => {
    const p = state.products.find(item => item.id === id);
    if (!p) return;
    const { data: sizes } = await _supabase.from('product_sizes').select('*').eq('product_id', id);

    document.getElementById('product-id').value = p.id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-price').value = p.price;
    document.getElementById('p-description').value = p.description || '';
    
    const hasSizesCheckbox = document.getElementById('p-has-sizes');
    const generalStockInput = document.getElementById('p-stock');
    const hasSizes = p.has_sizes || false;

    hasSizesCheckbox.checked = hasSizes;
    document.getElementById('general-stock-container').classList.toggle('hidden', hasSizes);
    document.getElementById('size-stock-container').classList.toggle('hidden', !hasSizes);

    // Ajusta obrigatoriedade ao abrir o modal
    if (generalStockInput) generalStockInput.required = !hasSizes;

    if (hasSizes) {
        ["P", "M", "G", "GG", "XG", "G1", "G2"].forEach(s => {
            const sData = sizes?.find(size => size.size === s);
            document.getElementById(`p-stock-${s.toLowerCase()}`).value = sData ? sData.stock : 0;
        });
    } else {
        document.getElementById('p-stock').value = p.stock || 0;
    }

    document.getElementById('p-image').value = p.image_url;
    document.getElementById('p-image-2').value = p.image_url_2 || '';
    document.getElementById('p-image-3').value = p.image_url_3 || '';
    updateImagePreview('p-image', p.image_url);
    updateImagePreview('p-image-2', p.image_url_2);
    updateImagePreview('p-image-3', p.image_url_3);
    
    document.getElementById('modal-title').innerText = 'Editar Produto';
    document.getElementById('product-modal').classList.add('show');
};

window.editSlide = (id) => {
    const s = state.carousel.find(item => item.id === id);
    if (!s) return;
    document.getElementById('slide-id').value = s.id;
    document.getElementById('s-title').value = s.title;
    document.getElementById('s-subtitle').value = s.subtitle || '';
    document.getElementById('s-order').value = s.order_index;
    document.getElementById('s-image').value = s.image_url;
    updateImagePreview('s-image', s.image_url);
    document.getElementById('slide-modal-title').innerText = 'Editar Slide';
    document.getElementById('slide-modal').classList.add('show');
};

window.deleteProduct = async (id) => {
    if (confirm('Excluir produto?')) {
        await _supabase.from('products').delete().eq('id', id);
        refreshData();
    }
};

window.deleteSlide = async (id) => {
    if (confirm('Excluir este slide?')) {
        await _supabase.from('carousel_slides').delete().eq('id', id);
        refreshData();
    }
};

window.confirmPayment = async (id) => {
    if (confirm('Confirmar pagamento e baixar estoque?')) {
        try {
            // 1. Busca os itens do pedido para saber o que baixar
            const { data: items, error: iErr } = await _supabase.from('order_items').select('*').eq('order_id', id);
            if (iErr) throw iErr;

            // 2. Processa a baixa de estoque para cada item via RPC
            for (const item of items) {
                if (item.selected_size !== "Tamanho Único") {
                    const { error: rpcErr } = await _supabase.rpc('decrement_size_stock', {
                        p_id: item.product_id,
                        p_size: item.selected_size,
                        p_qty: parseInt(item.quantity)
                    });
                    if (rpcErr) {
                        console.error(`Erro RPC decrement_size_stock:`, rpcErr);
                        throw new Error(`Erro ao baixar estoque (Tamanho ${item.selected_size}): ${rpcErr.message}`);
                    }
                } else {
                    const { error: rpcErr } = await _supabase.rpc('decrement_product_stock', {
                        p_id: item.product_id,
                        p_qty: parseInt(item.quantity)
                    });
                    if (rpcErr) {
                        console.error(`Erro RPC decrement_product_stock:`, rpcErr);
                        throw new Error(`Erro ao baixar estoque (Único): ${rpcErr.message}`);
                    }
                }
            }

            // 3. Atualiza o status do pedido
            const { error: uErr } = await _supabase.from('orders').update({ status: 'paid' }).eq('id', id);
            if (uErr) throw uErr;

            showToast("Pagamento confirmado e estoque atualizado!", "success");
            
            // Pequeno delay para o Supabase processar as triggers/estoque antes do refresh
            setTimeout(() => refreshData(), 500);
        } catch (err) {
            console.error("Erro na confirmação:", err);
            showToast(err.message || "Erro ao confirmar pagamento", "error");
        }
    }
};

// --- FORM SUBMITS ---
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (!error) initAdmin();
    else showToast("Erro no login", "error");
});

document.getElementById('product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const hasSizes = document.getElementById('p-has-sizes').checked;

    let totalStock = 0;
    const sizesToSave = ["P", "M", "G", "GG", "XG", "G1", "G2"].map(s => {
        const qty = parseInt(document.getElementById(`p-stock-${s.toLowerCase()}`).value) || 0;
        totalStock += qty;
        return { size: s, stock: qty };
    });
    
    if (!hasSizes) {
        totalStock = parseInt(document.getElementById('p-stock').value) || 0;
    }

    const data = {
        name: document.getElementById('p-name').value,
        price: parseFloat(document.getElementById('p-price').value),
        description: document.getElementById('p-description').value,
        image_url: document.getElementById('p-image').value,
        image_url_2: document.getElementById('p-image-2').value || null,
        image_url_3: document.getElementById('p-image-3').value || null,
        has_sizes: hasSizes,
        stock: totalStock
    };

    try {
        // 1. Salva/Atualiza o produto principal
        const { data: p, error } = await _supabase.from('products').upsert({ ...(id ? { id } : {}), ...data }).select().single();
        if (error) throw error;

        // 2. Se tiver tamanhos, limpamos e inserimos as novas quantidades (mais robusto)
        if (hasSizes) {
            await _supabase.from('product_sizes').delete().eq('product_id', p.id);
            const sizeData = sizesToSave.map(s => ({ product_id: p.id, size: s.size, stock: s.stock }));
            const { error: sErr } = await _supabase.from('product_sizes').insert(sizeData);
            if (sErr) throw sErr;
        }

        showToast("Salvo com sucesso!", "success");
        document.getElementById('product-modal').classList.remove('show');
        refreshData();
    } catch (err) { 
        console.error("Erro ao salvar produto:", err);
        showToast("Erro ao salvar", "error"); 
    }
});

document.getElementById('slide-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('slide-id').value;
    const data = {
        title: document.getElementById('s-title').value,
        subtitle: document.getElementById('s-subtitle').value,
        order_index: parseInt(document.getElementById('s-order').value) || 0,
        image_url: document.getElementById('s-image').value
    };
    try {
        const { error } = id ? await _supabase.from('carousel_slides').update(data).eq('id', id) : await _supabase.from('carousel_slides').insert([data]);
        if (error) throw error;
        showToast("Slide salvo!", "success");
        document.getElementById('slide-modal').classList.remove('show');
        refreshData();
    } catch (err) { showToast("Erro ao salvar slide", "error"); }
});

// --- AUXILIARES ---
function setupOnePageNavigation() {
    const navItems = document.querySelectorAll('#adminNav .nav-item');
    const adminMenuToggle = document.getElementById('adminMenuToggle');
    const adminNav = document.getElementById('adminNav');
    if (adminMenuToggle) adminMenuToggle.onclick = () => adminNav.classList.toggle('open');
    navItems.forEach(item => {
        item.onclick = () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            adminNav?.classList.remove('open');
        };
    });
}

function setupImageUploads() {
    document.querySelectorAll('.p-image-upload').forEach(input => {
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const targetId = e.target.getAttribute('data-target');
            const preview = document.getElementById(`${targetId}-preview`);
            preview.innerHTML = '<span>Enviando...</span>';
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            try {
                const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
                const data = await res.json();
                document.getElementById(targetId).value = data.secure_url;
                updateImagePreview(targetId, data.secure_url);
            } catch (err) { showToast("Erro no upload", "error"); }
        });
    });
}

function updateImagePreview(id, url) {
    const preview = document.getElementById(`${id}-preview`);
    if (preview) preview.innerHTML = url ? `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">` : '<span>Sem imagem</span>';
}

function setupVariationToggle() {
    const toggle = document.getElementById('p-has-sizes');
    const generalStockInput = document.getElementById('p-stock');

    toggle?.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        document.getElementById('general-stock-container').classList.toggle('hidden', isChecked);
        document.getElementById('size-stock-container').classList.toggle('hidden', !isChecked);

        // Remove a obrigatoriedade se estiver escondido para não travar o form
        if (generalStockInput) generalStockInput.required = !isChecked;
    });
}


function setupLoadMoreOrders() {
    const btn = document.getElementById('btn-load-more-orders');
    if (btn) btn.onclick = () => { state.ordersLimit += 10; renderOrders(); };
}

function setupModalClosers() {
    document.getElementById('btn-add-product')?.addEventListener('click', () => {
        document.getElementById('product-form').reset();
        document.getElementById('product-id').value = '';
        ['p-image', 'p-image-2', 'p-image-3'].forEach(id => updateImagePreview(id, null));
        document.getElementById('product-modal').classList.add('show');
    });
    document.getElementById('btn-add-slide')?.addEventListener('click', () => {
        document.getElementById('slide-form').reset();
        document.getElementById('slide-id').value = '';
        updateImagePreview('s-image', null);
        document.getElementById('slide-modal-title').innerText = 'Novo Slide';
        document.getElementById('slide-modal').classList.add('show');
    });
    document.getElementById('btn-close-modal')?.addEventListener('click', () => document.getElementById('product-modal').classList.remove('show'));
    document.getElementById('btn-close-slide-modal')?.addEventListener('click', () => document.getElementById('slide-modal').classList.remove('show'));
    document.getElementById('btn-close-order-modal')?.addEventListener('click', () => document.getElementById('order-details-modal').classList.remove('show'));
    document.getElementById('btn-close-order-modal-2')?.addEventListener('click', () => document.getElementById('order-details-modal').classList.remove('show'));
    document.getElementById('btn-logout')?.addEventListener('click', async () => { await _supabase.auth.signOut(); window.location.reload(); });
}

function renderCharts() {
    if (state.charts.revenue) state.charts.revenue.destroy();
    if (state.charts.status) state.charts.status.destroy();
    const revCtx = document.getElementById('revenueChart')?.getContext('2d');
    const statCtx = document.getElementById('statusChart')?.getContext('2d');

    if (revCtx) {
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

        state.charts.revenue = new Chart(revCtx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Vendas (R$)',
                    data: revenueData,
                    borderColor: '#0a3ca7',
                    backgroundColor: 'rgba(10, 60, 167, 0.05)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: '#0a3ca7'
                }]
            },
            options: { 
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    if (statCtx) {
        const statusCounts = {
            pending: state.orders.filter(o => o.status === 'pending').length,
            paid: state.orders.filter(o => o.status === 'paid').length,
            cancelled: state.orders.filter(o => o.status === 'cancelled').length
        };

        state.charts.status = new Chart(statCtx, {
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
                cutout: '70%', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } } 
            }
        });
    }
}

// Inicia mudança de filtro
document.getElementById('filter-status')?.addEventListener('change', () => { state.ordersLimit = 10; renderOrders(); });

initAdmin();