import { _supabase } from '../services/supabase.js';
import { Cart } from './cart.js';
import { formatCurrency, validateCPF } from '../utils/helpers.js';
import { showToast } from '../utils/toast.js';
import { Shipping } from '../utils/shipping.js';

const checkoutForm = document.getElementById('checkout-form');
const checkoutFormContainer = document.getElementById('checkout-form-container');
const pixPaymentContainer = document.getElementById('pix-payment-container');

// Referências aos campos do DOM
const fields = {
    name: document.getElementById('cust-name'),
    cpf: document.getElementById('cust-cpf'),
    email: document.getElementById('cust-email'),
    phone: document.getElementById('cust-phone'),
    cep: document.getElementById('cust-cep'),
    street: document.getElementById('cust-street'),
    number: document.getElementById('cust-number'),
    neighborhood: document.getElementById('cust-neighborhood'),
    cityUf: document.getElementById('cust-city-uf'),
    privacy: document.getElementById('privacy-check')
};

const pickupCheckbox = document.getElementById('pickup-option');
const pickupInfoDiv = document.getElementById('pickup-info');
const shippingInfoDiv = document.getElementById('shipping-info');
const addressFieldsWrapper = document.getElementById('address-fields-wrapper');
const addressFieldsWrapper2 = document.getElementById('address-fields-wrapper-2');
const addressDeliveryLabel = document.getElementById('address-delivery-label');

let currentShipping = { price: 0, days: 0, region: '' };

// --- INICIALIZAÇÃO ---
async function initCheckout() {
    const items = Cart.getItems();
    if (items.length === 0) {
        showToast('Seu carrinho está vazio!', 'info');
        setTimeout(() => window.location.href = '../index.html', 2000);
        return;
    }
    setupMasks();
    renderSummary();
    setupShippingListeners();
    handlePickupOption(pickupCheckbox.checked); 
}

// --- MÁSCARAS E VALIDAÇÕES EM TEMPO REAL ---
function setupMasks() {
    fields.cep.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5, 8);
        e.target.value = value;
        if (value.length === 9) calculateShipping(value);
    });

    fields.phone.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 10) value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
        else if (value.length > 6) value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
        else if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        e.target.value = value;
    });

    fields.cpf.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        value = value.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = value;

        if (value.replace(/\D/g, '').length === 11) {
            if (validateCPF(value)) {
                fields.cpf.classList.add('valid');
                fields.cpf.classList.remove('invalid');
            } else {
                fields.cpf.classList.add('invalid');
                fields.cpf.classList.remove('valid');
            }
        } else {
            fields.cpf.classList.remove('valid', 'invalid');
        }
    });
}

// --- LÓGICA DE ENTREGA/RETIRADA ---
function setupShippingListeners() {
    pickupCheckbox?.addEventListener('change', (e) => handlePickupOption(e.target.checked));
}

function handlePickupOption(isChecked) {
    const enable = !isChecked;
    [fields.cep, fields.street, fields.number, fields.neighborhood, fields.cityUf].forEach(f => {
        if (f) {
            f.disabled = !enable;
            f.required = enable;
        }
    });

    if (addressDeliveryLabel) addressDeliveryLabel.style.display = enable ? 'block' : 'none';
    if (addressFieldsWrapper) addressFieldsWrapper.style.display = enable ? 'grid' : 'none';
    if (addressFieldsWrapper2) addressFieldsWrapper2.style.display = enable ? 'grid' : 'none';
    
    pickupInfoDiv.style.display = isChecked ? 'block' : 'none';
    shippingInfoDiv.style.display = (!isChecked && currentShipping.region) ? 'block' : 'none';
    
    currentShipping = isChecked ? { price: 0, days: 0, region: 'Retirada' } : currentShipping;
    renderSummary();
}

async function calculateShipping(cep) {
    try {
        // 1. Busca os dados de endereço via API (ViaCEP)
        const addressData = await Shipping.validateCep(cep);
        if (addressData) {
            fields.street.value = addressData.logradouro || '';
            fields.neighborhood.value = addressData.bairro || '';
            fields.cityUf.value = `${addressData.localidade}/${addressData.uf}`;
            
            // Foca no número para facilitar o preenchimento
            fields.number.focus();
        }

        // 2. Calcula o frete com base no prefixo (lógica interna)
        const info = await Shipping.calculate(cep);
        if (info) {
            currentShipping = info;
            shippingInfoDiv.innerHTML = `🚚 <strong>Frete ${info.region}:</strong> ${formatCurrency(info.price)} (${info.days} dias úteis)`;
            shippingInfoDiv.style.display = 'block';
            renderSummary();
        }
    } catch (err) {
        showToast(err.message, 'error');
        shippingInfoDiv.style.display = 'none';
    }
}

// --- ATUALIZAÇÃO DE ESTOQUE RELACIONAL (ATÔMICO) ---
async function updateRelationalStock(items) {
    for (const item of items) {
        try {
            if (item.size !== "Tamanho Único") {
                // Chama a RPC para reduzir na tabela product_sizes
                const { error } = await _supabase.rpc('decrement_size_stock', { 
                    p_id: item.id, 
                    p_size: item.size, 
                    p_qty: item.quantity 
                });
                if (error) throw error;
            } else {
                // Chama a RPC para reduzir na tabela products
                const { error } = await _supabase.rpc('decrement_product_stock', { 
                    p_id: item.id, 
                    p_qty: item.quantity 
                });
                if (error) throw error;
            }
        } catch (err) {
            console.error(`Erro ao baixar estoque do item ${item.id}:`, err);
        }
    }
}

// --- SALVAR ITENS DO PEDIDO (TABELA order_items) ---
async function saveOrderItems(orderId, items) {
    const itemsData = items.map(i => ({
        order_id: orderId,
        product_id: i.id,
        product_name: i.name,
        selected_size: i.size,
        quantity: i.quantity,
        unit_price: i.price,
        subtotal: i.price * i.quantity
    }));

    const { error } = await _supabase.from('order_items').insert(itemsData);
    if (error) throw error;
}

// --- FINALIZAÇÃO DO PEDIDO ---
checkoutForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validações básicas
    if (!validateCPF(fields.cpf.value)) return showToast('CPF inválido', 'error');
    if (!fields.privacy.checked) return showToast('Você precisa aceitar os termos de privacidade', 'error');
    if (!pickupCheckbox.checked && !fields.cityUf.value) return showToast('Calcule o frete informando um CEP válido', 'error');

    const btn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = btn.innerText;

    try {
        btn.disabled = true;
        btn.innerText = "Processando pedido...";

        const orderItems = Cart.getItems();
        const subtotal = Cart.getTotal();
        const total = subtotal + currentShipping.price;

        const orderData = {
            customer_name: fields.name.value,
            customer_cpf: fields.cpf.value,
            customer_email: fields.email.value,
            customer_phone: fields.phone.value,
            total_price: total,
            status: 'pending',
            items: [], // Satisfaz constraint NOT NULL legado do DB
            shipping_info: pickupCheckbox.checked ? {
                method: 'pickup',
                address: 'Retirada na Igreja',
                region: 'Retirada'
            } : {
                method: 'delivery',
                cep: fields.cep.value,
                address: `${fields.street.value}, ${fields.number.value} - ${fields.neighborhood.value}`,
                city_uf: fields.cityUf.value,
                shipping_price: currentShipping.price
            }
        };

        // 1. Inserir Pedido Mestre (Tabela orders)
        const { data: order, error: oErr } = await _supabase.from('orders').insert([orderData]).select().single();
        if (oErr) throw oErr;

        // 2. Inserir Detalhamento de Itens (Tabela order_items)
        await saveOrderItems(order.id, orderItems);

        // Sucesso!
        showPixScreen(order);
        Cart.clear();
        showToast("Pedido gerado com sucesso! Realize o pagamento PIX.", "success");

    } catch (error) {
        console.error("GMJ Error:", error);
        showToast('Erro ao processar pedido: ' + error.message, 'error');
        btn.disabled = false;
        btn.innerText = originalBtnText;
    }
});

// --- RENDERIZAÇÃO DO RESUMO ---
function renderSummary() {
    const summaryDiv = document.getElementById('checkout-summary');
    const items = Cart.getItems();
    const subtotalValue = document.getElementById('checkout-total');
    const shipPriceValue = document.getElementById('summary-shipping-price');
    
    if (!summaryDiv) return;

    summaryDiv.innerHTML = items.map(i => `
        <div class="summary-item">
            <span>${i.quantity}x ${i.name} (${i.size})</span>
            <span>${formatCurrency(i.price * i.quantity)}</span>
        </div>
    `).join('');

    if (shipPriceValue) shipPriceValue.innerText = formatCurrency(currentShipping.price);
    if (subtotalValue) subtotalValue.innerText = formatCurrency(Cart.getTotal() + currentShipping.price);
}

// --- TELA DE PAGAMENTO PIX ---
function showPixScreen(order) {
    checkoutFormContainer.style.display = 'none';
    pixPaymentContainer.classList.add('show');
    document.getElementById('display-order-id').innerText = order.id.slice(0, 8);
    document.getElementById('display-total').innerText = formatCurrency(order.total_price);
    
    const btnCopy = document.getElementById('btn-copy-pix');
    if (btnCopy) {
        btnCopy.onclick = async (e) => {
            const success = await Shipping.copyPixKey(); // Usa helper de cópia
            if (success) {
                const originalText = e.target.innerText;
                e.target.innerText = 'Copiado!';
                showToast("Chave PIX copiada!", "success");
                setTimeout(() => e.target.innerText = originalText, 2000);
            }
        };
    }
}

initCheckout();