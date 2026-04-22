import { _supabase } from './services/supabase.js';
import { Cart } from './components/cart.js';
import { formatCurrency } from './utils/helpers.js';

let currentProduct = null;

async function loadProductDetails() {
    const container = document.getElementById('product-detail-container');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        container.innerHTML = '<h2>ID do produto ausente.</h2><a href="../index.html">Voltar para a loja</a>';
        return;
    }

    try {
        const { data, error } = await _supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error || !data) throw new Error('Produto não encontrado.');

        currentProduct = data;
        renderProduct(data);
    } catch (error) {
        container.innerHTML = `<h2>Erro: ${error.message}</h2><a href="../index.html">Voltar</a>`;
    }
}

function renderProduct(product) {
    const container = document.getElementById('product-detail-container');
    
    const images = [product.image_url, product.image_url_2, product.image_url_3].filter(url => url);
    
    let specsHtml = product.specifications 
        ? product.specifications.split('\n').map(s => `<li>• ${s.trim()}</li>`).join('')
        : '<li>• Detalhes exclusivos GMJ</li>';

    container.innerHTML = `
        <div class="product-gallery">
            <div class="main-image-wrapper">
                <img src="${product.image_url}" id="main-product-img" alt="${product.name}">
            </div>
            <div class="thumbnail-list">
                ${images.map(url => `
                    <div class="thumb-item" onclick="document.getElementById('main-product-img').src='${url}'">
                        <img src="${url}" alt="Thumbnail">
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="product-detail-info">
            <h1>${product.name}</h1>
            <p class="product-detail-price">${formatCurrency(product.price)}</p>
            <p style="color: ${product.stock > 0 ? '#10b981' : '#ef4444'}; font-weight: 700; font-size: 0.9rem; margin-bottom: 1.5rem;">
                ${product.stock > 0 ? `Em estoque: ${product.stock} unidades` : 'Esgotado'}
            </p>
            <p class="product-detail-description">${product.description || 'Sem descrição disponível.'}</p>
            
            <button class="btn-buy" id="btn-add-to-cart" ${product.stock <= 0 ? 'disabled' : ''} style="max-width: 350px;">
                ${product.stock > 0 ? 'Adicionar ao Carrinho' : 'Indisponível'}
            </button>

            <div class="detail-specs">
                <h3>Especificações</h3>
                <ul>${specsHtml}</ul>
            </div>
        </div>
    `;

    document.getElementById('btn-add-to-cart')?.addEventListener('click', () => {
        if (Cart.addItem(product)) {
            // Abre o carrinho lateral automaticamente para feedback
            document.getElementById('cart-sidebar')?.classList.add('open');
        }
    });
}

loadProductDetails();
