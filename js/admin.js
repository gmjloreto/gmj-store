import { _supabase } from './services/supabase.js';
import { formatCurrency } from './utils/helpers.js';
import { showToast } from './utils/toast.js';

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = 'dnt2b4nd8';
const CLOUDINARY_UPLOAD_PRESET = 'store_images';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

let state = {
    products: [],
    orders: [],
    carousel: [],
    filter: 'all',
    charts: {}
};

// --- CONTROLE DE ACESSO ---
const getAuthState = () => {
    const saved = localStorage.getItem('gmj_auth_state');
    return saved ? JSON.parse(saved) : { attempts: 0, lockoutUntil: 0 };
};

const saveAuthState = (s) => localStorage.setItem('gmj_auth_state', JSON.stringify(s));

async function initAdmin() {
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (!session) {
        showLogin();
    } else {
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) userDisplay.innerText = session.user.email;
        showDashboard();
        setupImageUploads();
        setupOnePageNavigation();
        await refreshData();
    }
}

function showDashboard() { 
    document.getElementById('login-container').style.display = 'none'; 
    document.getElementById('admin-dashboard').style.display = 'block'; 
}

function showLogin() { 
    document.getElementById('login-container').style.display = 'flex'; 
    document.getElementById('admin-dashboard').style.display = 'none'; 
}

// --- NAVEGAÇÃO ONE-PAGE ---
function setupOnePageNavigation() {
    const navItems = document.querySelectorAll('#adminNav .nav-item');
    const sections = document.querySelectorAll('main section');

    // Clique suave e atualização manual do ativo
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Detectar scroll para atualizar menu ativo
    window.addEventListener('scroll', () => {
        let current = "";
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href').includes(current)) {
                item.classList.add('active');
            }
        });
    });
}

// --- UPLOAD DE IMAGENS ---
function setupImageUploads() {
    const uploadInputs = document.querySelectorAll('.p-image-upload');
    uploadInputs.forEach(input => {
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const targetId = input.getAttribute('data-target');
            const previewId = `${targetId}-preview`;
            const previewEl = document.getElementById(previewId);
            const hiddenInput = document.getElementById(targetId);

            try {
                const reader = new FileReader();
                reader.onload = (e) => { if (previewEl) previewEl.innerHTML = `<img src="${e.target.result}" alt="Preview">`; };
                reader.readAsDataURL(file);

                if (previewEl) previewEl.classList.add('loading');
                
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

                const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
                if (!response.ok) throw new Error('Falha no upload');

                const data = await response.json();
                if (hiddenInput) hiddenInput.value = data.secure_url;
                if (previewEl) previewEl.innerHTML = `<img src="${data.secure_url}" alt="Preview">`;
                showToast("Imagem carregada!", "success");
            } catch (error) {
                showToast("Erro no upload", "error");
                if (previewEl) previewEl.innerHTML = `<span>Erro</span>`;
            } finally {
                if (previewEl) previewEl.classList.remove('loading');
            }
        });
    });
}

function updateImagePreview(id, url) {
    const previewEl = document.getElementById(`${id}-preview`);
    if (previewEl) {
        previewEl.innerHTML = url ? `<img src="${url}" alt="Preview">` : `<span>Sem imagem</span>`;
    }
}

// --- DADOS ---
async function refreshData() {
    try {
        const [pRes, oRes, cRes] = await Promise.all([
            _supabase.from('products').select('*').order('created_at', { ascending: false }),
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
    if (document.getElementById('m-revenue')) document.getElementById('m-revenue').innerText = formatCurrency(revenue);
    if (document.getElementById('m-orders')) document.getElementById('m-orders').innerText = state.orders.length;
    if (document.getElementById('m-average')) document.getElementById('m-average').innerText = formatCurrency(paidOrders.length ? revenue / paidOrders.length : 0);
    if (document.getElementById('m-sold')) document.getElementById('m-sold').innerText = paidOrders.reduce((acc, o) => acc + (o.items?.reduce((sum, i) => sum + i.quantity, 0) || 0), 0);
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    if (!list) return;
    const filtered = state.orders.filter(o => state.filter === 'all' || o.status === state.filter);
    list.innerHTML = filtered.length ? '' : '<tr><td colspan="6" style="text-align:center; padding:2rem;">Nenhum pedido.</td></tr>';
    
    filtered.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>#${o.id.slice(0, 8)}</code></td>
            <td>${new Date(o.created_at).toLocaleDateString()}</td>
            <td><strong>${o.customer_name}</strong></td>
            <td>${formatCurrency(o.total_price)}</td>
            <td><span class="status-pill status-${o.status}">${o.status}</span></td>
            <td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-edit" onclick="window.viewOrderDetails('${o.id}')">🔍 Detalhes</button>
                    ${o.status === 'pending' ? `<button class="btn-edit" style="background:#dcfce7; color:#166534;" onclick="window.confirmPayment('${o.id}')">Pagar</button>` : ''}
                </div>
            </td>
        `;
        list.appendChild(tr);
    });
}

function renderProducts() {
    const list = document.getElementById('admin-products-list');
    if (!list) return;
    list.innerHTML = '';
    state.products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${p.image_url}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;"></td>
            <td><strong>${p.name}</strong></td>
            <td>${formatCurrency(p.price)}</td>
            <td>${p.stock}</td>
            <td>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-edit" onclick="window.editProduct('${p.id}')">✏️ Editar</button>
                    <button class="btn-delete" onclick="window.deleteProduct('${p.id}')">🗑️</button>
                </div>
            </td>
        `;
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
                    <button class="btn-edit" onclick="window.editSlide('${s.id}')">✏️ Editar</button>
                    <button class="btn-delete" onclick="window.deleteSlide('${s.id}')">🗑️</button>
                </div>
            </td>
        `;
        list.appendChild(tr);
    });
}

// --- FUNÇÕES GLOBAIS ---
window.viewOrderDetails = (id) => {
    const o = state.orders.find(order => order.id === id);
    if (!o) return;
    document.getElementById('det-order-id').innerText = `#${o.id.slice(0, 8)}`;
    document.getElementById('det-cust-name').innerText = o.customer_name;
    document.getElementById('det-cust-cpf').innerText = o.customer_cpf || 'N/A';
    document.getElementById('det-cust-email').innerText = o.customer_email || 'N/A';
    document.getElementById('det-cust-phone').innerText = o.customer_phone || 'N/A';
    document.getElementById('det-ship-method').innerText = (o.shipping_info?.method === 'pickup') ? 'Retirada' : 'Entrega';
    document.getElementById('det-order-status').innerText = o.status;
    document.getElementById('det-order-total').innerText = formatCurrency(o.total_price);
    
    const itemsList = document.getElementById('det-items-list');
    itemsList.innerHTML = (o.items || []).map(item => `
        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.85rem;">
            <span>${item.quantity}x ${item.name}</span>
            <span>${formatCurrency(item.price * item.quantity)}</span>
        </div>
    `).join('');
    document.getElementById('order-details-modal').classList.add('show');
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
        const { error } = await _supabase.from('products').delete().eq('id', id);
        if (!error) refreshData();
    }
};

window.deleteSlide = async (id) => {
    if (confirm('Excluir slide?')) {
        const { error } = await _supabase.from('carousel_slides').delete().eq('id', id);
        if (!error) refreshData();
    }
};

window.confirmPayment = async (id) => {
    if (confirm('Confirmar pagamento?')) {
        const { error } = await _supabase.from('orders').update({ status: 'paid' }).eq('id', id);
        if (!error) refreshData();
    }
};

// --- EVENTOS ---
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
    const data = {
        name: document.getElementById('p-name').value,
        price: parseFloat(document.getElementById('p-price').value),
        stock: parseInt(document.getElementById('p-stock').value),
        description: document.getElementById('p-description').value,
        image_url: document.getElementById('p-image').value,
        image_url_2: document.getElementById('p-image-2').value || null,
        image_url_3: document.getElementById('p-image-3').value || null
    };
    const { error } = id ? await _supabase.from('products').update(data).eq('id', id) : await _supabase.from('products').insert([data]);
    if (!error) { document.getElementById('product-modal').classList.remove('show'); refreshData(); }
});

document.getElementById('slide-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('slide-id').value;
    const data = {
        title: document.getElementById('s-title').value,
        subtitle: document.getElementById('s-subtitle').value,
        order_index: parseInt(document.getElementById('s-order').value),
        image_url: document.getElementById('s-image').value
    };
    const { error } = id ? await _supabase.from('carousel_slides').update(data).eq('id', id) : await _supabase.from('carousel_slides').insert([data]);
    if (!error) { document.getElementById('slide-modal').classList.remove('show'); refreshData(); }
});

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
    document.getElementById('slide-modal').classList.add('show');
});

document.getElementById('btn-close-modal')?.addEventListener('click', () => document.getElementById('product-modal').classList.remove('show'));
document.getElementById('btn-close-slide-modal')?.addEventListener('click', () => document.getElementById('slide-modal').classList.remove('show'));
document.getElementById('btn-close-order-modal')?.addEventListener('click', () => document.getElementById('order-details-modal').classList.remove('show'));
document.getElementById('btn-close-order-modal-2')?.addEventListener('click', () => document.getElementById('order-details-modal').classList.remove('show'));
document.getElementById('btn-logout')?.addEventListener('click', async () => { await _supabase.auth.signOut(); location.reload(); });

function renderCharts() {
    if (state.charts.revenue) state.charts.revenue.destroy();
    if (state.charts.status) state.charts.status.destroy();

    const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
    const statusCtx = document.getElementById('statusChart')?.getContext('2d');

    if (revenueCtx) {
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
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { top: 10, bottom: 0, left: 0, right: 10 } },
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
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
                cutout: '70%', responsive: true, maintainAspectRatio: false,
                layout: { padding: 20 },
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } 
            }
        });
    }
}

initAdmin();