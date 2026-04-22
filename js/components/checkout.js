import { _supabase } from '../services/supabase.js';
import { Cart } from './cart.js';
import { formatCurrency, copyToClipboard, validateCPF } from '../utils/helpers.js';
import { showToast } from '../utils/toast.js';
import { Shipping } from '../utils/shipping.js';

const checkoutForm = document.getElementById('checkout-form');
const checkoutFormContainer = document.getElementById('checkout-form-container');
const pixPaymentContainer = document.getElementById('pix-payment-container');

// Referências aos campos de entrada
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

// Aliases para manter compatibilidade com código existente que usa variáveis soltas
const cepInput = fields.cep;
const streetInput = fields.street;
const numberInput = fields.number;
const neighborhoodInput = fields.neighborhood;
const cityUfInput = fields.cityUf;

// Referências aos elementos de UI para Frete e Retirada
const pickupCheckbox = document.getElementById('pickup-option');
const pickupInfoDiv = document.getElementById('pickup-info');
const shippingInfoDiv = document.getElementById('shipping-info');
const addressFieldsWrapper = document.getElementById('address-fields-wrapper');
const addressFieldsWrapper2 = document.getElementById('address-fields-wrapper-2'); // Nova referência
const addressDeliveryLabel = document.getElementById('address-delivery-label');

const addressInputFields = [cepInput, streetInput, numberInput, neighborhoodInput, cityUfInput];

let currentShipping = { price: 0, days: 0, region: '' };

function toggleAddressFields(enable) {
    addressInputFields.forEach(input => {
        if (input) {
            input.disabled = !enable;
            input.classList.toggle('disabled-field', !enable);
            input.required = enable;
            
            if (!enable) {
                input.value = '';
            }
        }
    });
    if (addressDeliveryLabel) addressDeliveryLabel.style.display = enable ? 'block' : 'none';
    if (addressFieldsWrapper) addressFieldsWrapper.style.display = enable ? 'grid' : 'none';
    if (addressFieldsWrapper2) addressFieldsWrapper2.style.display = enable ? 'grid' : 'none'; // Esconde o segundo wrapper
}

function handlePickupOption(isChecked) {
    if (isChecked) {
        // Opção de Retirada selecionada
        toggleAddressFields(false); // Desabilita campos de entrega
        shippingInfoDiv.style.display = 'none'; // Esconde info de frete
        pickupInfoDiv.style.display = 'block'; // Mostra info de retirada
        currentShipping = { price: 0, days: 0, region: 'Retirada' }; // Frete fixo para retirada
        showToast('Opção de retirada selecionada. O frete será R$0,00.', 'info');
    } else {
        // Opção de Entrega selecionada
        toggleAddressFields(true); // Habilita campos de entrega
        pickupInfoDiv.style.display = 'none'; // Esconde info de retirada
        // Se CEP já foi preenchido, reexibe info de frete (necessário para recalcular caso o total mude)
        const cepValue = cepInput.value.replace(/\D/g, '');
        if (cepValue.length === 8) {
            shippingInfoDiv.style.display = 'block';
            // A função do blur já calcula e atualiza currentShipping
        } else {
            shippingInfoDiv.style.display = 'none'; // Esconde se CEP não preenchido
            currentShipping = { price: 0, days: 0, region: '' }; // Reseta frete caso não haja CEP
        }
        showToast('Opção de entrega selecionada.', 'info');
    }
    renderSummary(); // Atualiza o total geral
}

async function initCheckout() {
    const items = Cart.getItems();
    if (items.length === 0) {
        showToast('Seu carrinho está vazio!', 'info');
        setTimeout(() => window.location.href = '../index.html', 2000);
        return;
    }
    setupMasks();
    renderSummary();
    
    // Configura o estado inicial do formulário (desabilita campos se retirada for padrão)
    handlePickupOption(pickupCheckbox.checked); 
}

// --- MÁSCARAS ---
function setupMasks() {
    cepInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5, 8);
        e.target.value = value;
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
    });
}

// --- BUSCA CEP & CÁLCULO FRETE ---
cepInput.addEventListener('blur', async () => {
    // Só executa se a entrega estiver habilitada (checkbox desmarcado)
    if (pickupCheckbox.checked) return;

    const cep = cepInput.value.replace(/\D/g, '');
    if (cep.length !== 8) {
        showToast('CEP inválido', 'error');
        resetAddress();
        return;
    }

    try {
        showToast('Buscando endereço...', 'info');
        const address = await Shipping.validateCep(cep);
        
        fields.street.value = address.logradouro;
        fields.neighborhood.value = address.bairro;
        fields.cityUf.value = `${address.localidade} / ${address.uf}`;

        const result = await Shipping.calculate(cep);
        currentShipping = result;

        shippingInfoDiv.style.display = 'block';
        document.getElementById('ship-region').innerText = result.region;
        document.getElementById('ship-price').innerText = formatCurrency(result.price);
        document.getElementById('ship-days').innerText = result.days;
        
        renderSummary();
        showToast(`Frete para ${address.localidade} (${result.region}) calculado!`, 'success');
    } catch (error) {
        showToast(error.message, 'error');
        resetAddress();
    }
});

function resetAddress() {
    fields.street.value = '';
    fields.neighborhood.value = '';
    fields.cityUf.value = '';
    shippingInfoDiv.style.display = 'none';
    currentShipping = { price: 0, days: 0, region: '' }; // Reseta frete para entrega desativada
    renderSummary();
}

// --- LISTENERS DE UI ---
pickupCheckbox.addEventListener('change', (e) => {
    handlePickupOption(e.target.checked);
});

// --- RENDERIZAÇÃO ---
function renderSummary() {
    const summaryDiv = document.getElementById('checkout-summary');
    const totalSpan = document.getElementById('checkout-total');
    const shippingSpan = document.getElementById('summary-shipping-price');
    const items = Cart.getItems();

    summaryDiv.innerHTML = items.map(i => `
        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.9rem;">
            <span>${i.quantity}x ${i.name}</span>
            <span>${formatCurrency(i.price * i.quantity)}</span>
        </div>
    `).join('');

    shippingSpan.innerText = formatCurrency(currentShipping.price);
    totalSpan.innerText = formatCurrency(Cart.getTotal() + currentShipping.price);
}

// --- VALIDAÇÃO & SUBMIT ---
checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validações gerais
    if (!fields.name.value) return showToast('Nome é obrigatório', 'error');
    if (!validateCPF(fields.cpf.value)) return showToast('CPF inválido', 'error');
    if (!fields.email.value.includes('@')) return showToast('E-mail inválido', 'error');
    if (fields.phone.value.length < 14) return showToast('Telefone incompleto', 'error');
    
    const privacyCheck = document.getElementById('privacy-check');
    if (!privacyCheck.checked) return showToast('Aceite os termos de privacidade', 'error');

    // Validação específica de endereço/CEP APENAS se não for retirada
    if (!pickupCheckbox.checked) {
        const cepValue = cepInput.value.replace(/\D/g, '');
        if (cepValue.length !== 8) return showToast('CEP inválido', 'error');
        if (!fields.street.value) return showToast('Rua é obrigatória', 'error');
        if (!fields.number.value) return showToast('Número é obrigatório', 'error');
        if (!fields.neighborhood.value) return showToast('Bairro é obrigatório', 'error');
        if (!fields.cityUf.value) return showToast('Cidade/UF não preenchida', 'error');
    }

    const orderData = {
        customer_name: fields.name.value,
        customer_cpf: fields.cpf.value,
        customer_email: fields.email.value,
        customer_phone: fields.phone.value,
        items: Cart.getItems(),
        total_price: Cart.getTotal() + currentShipping.price,
        status: 'pending',
        shipping_info: pickupCheckbox.checked ? {
            method: 'pickup',
            address: 'Retirada na Igreja',
            cep: fields.cep.value, // Guarda o CEP para referência, mas não é usado para cálculo
            region: 'Retirada na Igreja',
            price: 0,
            days: 'Sábados'
        } : {
            method: 'delivery',
            cep: fields.cep.value,
            address: `${fields.street.value}, ${fields.number.value} - ${fields.neighborhood.value}`,
            city_uf: fields.cityUf.value,
            shipping_price: currentShipping.price,
            shipping_days: currentShipping.days
        }
    };

    try {
        const { data, error } = await _supabase.from('orders').insert([orderData]).select().single();
        if (error) throw error;
        
        showPixScreen(data);
        Cart.clear();
        showToast("Pedido gerado com sucesso!", "success");
    } catch (error) {
        showToast('Erro ao gerar pedido: ' + error.message, 'error');
    }
});

function showPixScreen(order) {
    checkoutFormContainer.style.display = 'none';
    pixPaymentContainer.classList.add('show');
    document.getElementById('display-order-id').innerText = order.id.slice(0, 8);
    document.getElementById('display-total').innerText = formatCurrency(order.total_price);

    document.getElementById('btn-copy-pix').onclick = async (e) => {
        const key = document.getElementById('pix-key-text').innerText;
        const success = await copyToClipboard(key);
        if (success) {
            showToast("Chave PIX copiada!", "success");
            e.target.innerText = 'Copiado!';
            setTimeout(() => e.target.innerText = 'Copiar Chave PIX', 2000);
        }
    };
}

initCheckout();
