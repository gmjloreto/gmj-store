import { formatCurrency } from '../utils/helpers.js';
import { showToast } from '../utils/toast.js';

export const Cart = {
    getItems() {
        try {
            const savedCart = localStorage.getItem('gmj_store_cart');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (e) {
            console.error("GMJ Error: Falha ao ler carrinho", e);
            return [];
        }
    },

    addItem(product) {
        // Usa o estoque já validado e passado pelo componente de origem
        const targetStock = product.stock;

        if (!targetStock || targetStock <= 0) {
            showToast(`Desculpe, o tamanho ${product.size || ''} está esgotado.`, 'error');
            return false;
        }

        let cart = this.getItems();
        // A chave única agora é ID + Tamanho
        const existingItem = cart.find(item => item.id === product.id && item.size === product.size);

        if (existingItem) {
            if (existingItem.quantity >= targetStock) {
                showToast(`Apenas ${targetStock} unidades disponíveis em estoque.`, 'error');
                return false;
            }
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: Number(product.price),
                image_url: product.image_url,
                stock: targetStock,
                size: product.size || "Tamanho Único",
                has_sizes: product.has_sizes,
                quantity: 1
            });
        }

        this.save(cart);
        this.updateUI();
        showToast(`${product.name} (${product.size}) adicionado!`, 'success');
        return true;
    },

    updateQuantity(id, size, delta) {
        let cart = this.getItems();
        const item = cart.find(i => i.id === id && i.size === size);
        if (item) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock) {
                showToast(`Limite de estoque atingido (${item.stock} unid.)`, 'error');
                return;
            }
            if (newQty <= 0) {
                this.removeItem(id, size);
                return;
            }
            item.quantity = newQty;
            this.save(cart);
            this.updateUI();
        }
    },

    removeItem(id, size) {
        let cart = this.getItems().filter(item => !(item.id === id && item.size === size));
        this.save(cart);
        this.updateUI();
        showToast('Produto removido do carrinho.', 'info');
    },

    clear() {
        localStorage.removeItem('gmj_store_cart');
        this.updateUI();
    },

    save(cart) { localStorage.setItem('gmj_store_cart', JSON.stringify(cart)); },

    getTotal() {
        return this.getItems().reduce((acc, item) => acc + (item.price * item.quantity), 0);
    },

    checkout() {
        const items = this.getItems();
        if (items.length === 0) {
            showToast('Seu carrinho está vazio!', 'info');
            return;
        }
        const path = window.location.pathname;
        const target = path.includes('/pages/') ? 'checkout.html' : 'pages/checkout.html';
        window.location.href = target;
    },

    updateUI() {
        const badge = document.getElementById('cart-count');
        const count = this.getItems().reduce((acc, i) => acc + i.quantity, 0);
        if (badge) badge.innerText = count;
        this.renderSidebar();
    },

    renderSidebar() {
        const list = document.getElementById('cart-items-list');
        const totalValue = document.getElementById('cart-total-value');
        if (!list) return;

        const items = this.getItems();
        list.innerHTML = items.length === 0 ? '<p style="text-align:center; padding:2rem; color:#888;">Seu carrinho está vazio.</p>' : '';
        
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <img src="${item.image_url}" width="60" style="object-fit: cover; aspect-ratio: 1/1; border-radius: 4px;">
                <div class="cart-item-info" style="flex:1; margin-left:1rem;">
                    <h4 style="font-size:0.85rem; margin-bottom:0.2rem;">${item.name}</h4>
                    <p style="font-size:0.75rem; color:var(--accent); font-weight:700; margin-bottom:0.2rem;">Tam: ${item.size}</p>
                    <p style="font-size:0.8rem; color:#666;">${formatCurrency(item.price)}</p>
                    <div class="cart-qty-controls" style="margin-top:0.5rem; display:flex; align-items:center; gap:0.8rem;">
                        <button onclick="Cart.updateQuantity('${item.id}', '${item.size}', -1)">-</button>
                        <span style="font-size:0.9rem; font-weight:700;">${item.quantity}</span>
                        <button onclick="Cart.updateQuantity('${item.id}', '${item.size}', 1)">+</button>
                    </div>
                </div>
                <button class="btn-remove" onclick="Cart.removeItem('${item.id}', '${item.size}')" style="font-size:1.2rem;">&times;</button>
            `;
            list.appendChild(div);
        });

        if (totalValue) totalValue.innerText = formatCurrency(this.getTotal());
    },

    init() {
        this.updateUI();
    }
};

window.Cart = Cart;
Cart.init();
