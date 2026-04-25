import { _supabase } from './services/supabase.js';
import { Cart } from './components/cart.js';

// Estado local dos produtos para facilitar o acesso
let allProducts = [];

async function fetchProducts() {
    const productsGrid = document.getElementById('products-grid');
    
    try {
        const { data, error } = await _supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allProducts = data || [];

        if (allProducts.length === 0) {
            productsGrid.innerHTML = '<p class="empty-msg">Nenhum produto disponível no momento.</p>';
            return;
        }

        renderProducts(allProducts);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error.message);
        productsGrid.innerHTML = '<p class="error-msg">Erro ao carregar produtos. Tente novamente mais tarde.</p>';
    }
}

function renderProducts(products) {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = ''; 

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Regra de Estoque GEMINI.md: Se has_sizes, estoque vem das variações (já somado no campo stock pelo admin)
        const isOutOfStock = !product.stock || product.stock <= 0;
        const mainImg = product.image_url || 'https://via.placeholder.com/600';
        const hoverImg = product.image_url_2 || mainImg;

        // Se tem tamanhos, não permite adicionar direto. Obriga ver detalhes.
        const buttonHTML = product.has_sizes 
            ? `<a href="pages/product-details.html?id=${product.id}" class="btn-buy-link">Ver Opções</a>`
            : `<button class="btn-buy" data-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}>
                ${isOutOfStock ? 'Esgotado' : 'Adicionar ao Carrinho'}
               </button>`;

        card.innerHTML = `
            <a href="pages/product-details.html?id=${product.id}" style="text-decoration: none; color: inherit;">
                <div class="product-image-container">
                    <img src="${mainImg}" 
                         data-main="${mainImg}" 
                         data-hover="${hoverImg}" 
                         alt="${product.name}" 
                         class="product-image" 
                         loading="lazy"
                         onmouseover="this.src=this.dataset.hover"
                         onmouseout="this.src=this.dataset.main">
                    ${product.is_new ? '<div class="product-badge">NOVO</div>' : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-price">R$ ${Number(product.price).toFixed(2)}</p>
                </div>
            </a>
            <div class="product-card-actions">
                ${buttonHTML}
            </div>
        `;
        productsGrid.appendChild(card);
    });

    // Adiciona eventos aos botões de compra (apenas para produtos de tamanho único)
    document.querySelectorAll('.btn-buy').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const product = allProducts.find(p => p.id == id);
            if (product && !product.has_sizes) {
                // Adiciona como Tamanho Único garantido
                Cart.addItem({
                    ...product,
                    size: 'Tamanho Único'
                });
            }
        });
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
});
