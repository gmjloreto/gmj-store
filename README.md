# GMJ Store 🕊️

A **GMJ Store** é uma plataforma de e-commerce moderna e completa para artigos religiosos. O projeto une uma vitrine de produtos elegante com um sistema robusto de gestão administrativa (ERP), focado em proporcionar uma experiência de compra fluida e um controle de estoque eficiente.

## 🚀 Funcionalidades

### Cliente
- **Vitrine Dinâmica:** Listagem de produtos integrada em tempo real com o banco de dados.
- **Galeria de Detalhes:** Visualização detalhada de produtos com múltiplos ângulos de imagem.
- **Carrinho Lateral (UX):** Gestão de itens no carrinho sem sair da página atual.
- **Checkout Inteligente:** Fluxo simplificado com geração de pedido e pagamento via PIX.

### Administrativo (Dashboard)
- **Métricas em Tempo Real:** Gráficos interativos (Chart.js) para acompanhamento de vendas e performance.
- **Gestão de Pedidos:** Controle total de status (pendente, pago, cancelado) com detalhes do comprador e entrega.
- **Gestão de Estoque:** CRUD completo de produtos, incluindo upload de imagens e controle de unidades.
- **Segurança:** Autenticação integrada via Supabase Auth.

## 🛠️ Tecnologias

- **Frontend:** HTML5, CSS3 (Vanilla com Variáveis Semânticas), JavaScript (ES Modules).
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage).
- **Gráficos:** [Chart.js](https://www.chartjs.org/).
- **Design:** Sistema baseado em conceitos de SaaS Moderno, Glassmorphism e tipografia 'Inter'.

## 📁 Estrutura do Projeto

```text
├── index.html              # Landing page e vitrine
├── pages/
│   ├── product-details.html # Detalhes do produto
│   ├── checkout.html        # Finalização de compra
│   └── admin.html           # Painel Administrativo
├── js/
│   ├── app.js               # Lógica principal da vitrine
│   ├── admin.js             # Inteligência do Dashboard e Gestão
│   ├── services/            # Cliente Supabase centralizado
│   ├── components/          # Módulos de Cart e Checkout
│   └── utils/               # Helpers, Frete e Notificações
├── css/
│   └── style.css            # Design System único e centralizado
└── config/
    └── config.js            # Configurações de API e Ambiente
```

## 🏁 Como Começar

1. **Pré-requisitos:**
   - Recomendamos o uso da extensão **Live Server** no VS Code para rodar o projeto localmente.

2. **Configuração do Banco de Dados:**
   - O projeto utiliza o Supabase. Certifique-se de configurar as tabelas `products` e `orders` no seu projeto Supabase.
   - Insira suas credenciais no arquivo `config/config.js`.

3. **Execução:**
   - Abra o `index.html` através do Live Server.
   - Para acessar o painel administrativo, navegue até `/pages/admin.html`.

## 🎨 Design System

O projeto utiliza uma paleta de cores refinada baseada em tons de cinza (`#18181b` a `#f9f9fb`) com o preto como cor primária e o verde (`#3ecf8e`) para destaques e sucesso. O layout é responsivo, garantindo uma experiência perfeita em desktops, tablets e smartphones.
