import { _supabase } from './services/supabase.js';
import { Cart } from './components/cart.js';
import { formatCurrency } from './utils/helpers.js';
import { showToast } from './utils/toast.js';

let currentProduct = null;
let productSizes = [];
let selectedSize = null;

async function loadProductDetails() {
    const container = document.getElementById('product-detail-container');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        container.innerHTML = '<h2>ID do produto ausente.</h2><a href="../index.html">Voltar para a loja</a>';
        return;
    }

    try {
        // Busca Produto e seus Tamanhos em paralelo
        const [pRes, sRes] = await Promise.all([
            _supabase.from('products').select('*').eq('id', productId).single(),
            _supabase.from('product_sizes').select('*').eq('product_id', productId)
        ]);

        if (pRes.error || !pRes.data) throw new Error('Produto não encontrado.');

        currentProduct = pRes.data;
        productSizes = sRes.data || [];
        renderProduct(currentProduct, productSizes);
    } catch (error) {
        container.innerHTML = `<h2>Erro: ${error.message}</h2><a href="../index.html">Voltar</a>`;
    }
}

function renderProduct(product, sizes) {
    const container = document.getElementById('product-detail-container');
    const images = [product.image_url, product.image_url_2, product.image_url_3].filter(url => url);
    
    // Seletor de Tamanhos Relacional
    let sizeSelectorHTML = '';
    if (product.has_sizes) {
        const sizeOptions = ["P", "M", "G", "GG", "XG", "G1", "G2"];
        sizeSelectorHTML = `
            <div class="size-selector-container">
                <span class="size-label">Selecione o Tamanho</span>
                <div class="size-grid">
                    ${sizeOptions.map(sName => {
                        const sizeData = sizes.find(s => s.size === sName);
                        const qty = sizeData ? sizeData.stock : 0;
                        const isAvailable = qty > 0;
                        return `<button class="size-chip ${!isAvailable ? 'disabled' : ''}" 
                                        data-size="${sName}" 
                                        data-stock="${qty}"
                                        ${!isAvailable ? 'disabled' : ''}>${sName}</button>`;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    let specsHtml = product.specifications 
        ? product.specifications.split('\n').map(s => `<li>• ${s.trim()}</li>`).join('')
        : '<li>• Detalhes exclusivos GMJ</li>';

    container.innerHTML = `
        <div class="product-gallery">
            <div class="main-image-wrapper">
                <img src="${product.image_url}" id="main-product-img" alt="${product.name}">
            </div>
            <div class="thumbnail-list">
                ${images.map((url, index) => `
                    <div class="thumb-item ${index === 0 ? 'active' : ''}" onclick="updateMainImage('${url}', this)">
                        <img src="${url}" alt="Thumbnail">
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="product-detail-info">
            <h1>${product.name}</h1>
            <p class="product-detail-price">${formatCurrency(product.price)}</p>
            
            <p id="stock-display" style="color: ${product.stock > 0 ? '#10b981' : '#ef4444'}; font-weight: 700; font-size: 0.9rem; margin-bottom: 1.5rem;">
                ${product.has_sizes ? 'Selecione um tamanho para ver o estoque' : `Disponibilidade: ${product.stock} unidades (Tamanho Único)`}
            </p>

            <p class="product-detail-description">${product.description || 'Sem descrição disponível.'}</p>
            
            ${sizeSelectorHTML}

            <div class="product-card-actions">
                <button class="btn-buy" id="btn-add-to-cart" ${!product.has_sizes && product.stock <= 0 ? 'disabled' : ''}>
                    ${(!product.has_sizes && product.stock <= 0) ? 'Esgotado' : 'Adicionar ao Carrinho'}
                </button>
            </div>

            <div class="detail-specs">
                <h3>Especificações</h3>
                <ul>${specsHtml}</ul>
            </div>
        </div>
    `;

    setupEvents();
}

function setupEvents() {
    const sizeChips = document.querySelectorAll('.size-chip:not(.disabled)');
    const stockDisplay = document.getElementById('stock-display');

    sizeChips.forEach(chip => {
        chip.addEventListener('click', () => {
            sizeChips.forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            selectedSize = chip.getAttribute('data-size');
            const qty = chip.getAttribute('data-stock');

            stockDisplay.innerText = `Disponibilidade (${selectedSize}): ${qty} unidades em estoque`;
            stockDisplay.style.color = qty > 0 ? '#10b981' : '#ef4444';
        });
    });

    document.getElementById('btn-add-to-cart')?.addEventListener('click', () => {
        if (currentProduct.has_sizes && !selectedSize) {
            showToast("Por favor, selecione um tamanho.", "error");
            return;
        }

        const itemToAdd = {
            ...currentProduct,
            size: currentProduct.has_sizes ? selectedSize : "Tamanho Único",
            // Passamos o estoque real da variação para o carrinho validar
            stock: currentProduct.has_sizes 
                   ? (productSizes.find(s => s.size === selectedSize)?.stock || 0) 
                   : currentProduct.stock
        };

        if (Cart.addItem(itemToAdd)) {
            document.getElementById('cart-sidebar')?.classList.add('open');
        }
    });
}

window.updateMainImage = (url, thumb) => {
    const mainImg = document.getElementById('main-product-img');
    if (mainImg) mainImg.src = url;
    document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
};

loadProductDetails();