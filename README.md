# GMJ Store 🕊️

A **GMJ Store** é uma plataforma de e-commerce moderna e completa para artigos religiosos. O projeto une uma vitrine de produtos elegante com um sistema robusto de gestão administrativa (ERP) em layout One-Page, focado em proporcionar uma experiência de compra fluida e um controle de estoque eficiente.

## 🚀 Funcionalidades

### Cliente
- **Vitrine Dinâmica:** Listagem de produtos integrada em tempo real com o banco de dados.
- **Carrossel Dinâmico:** Destaques da home gerenciados diretamente pelo painel administrativo.
- **Galeria de Detalhes:** Visualização detalhada de produtos com múltiplos ângulos de imagem.
- **Carrinho Lateral (UX):** Gestão de itens no carrinho sem sair da página atual.
- **Checkout Inteligente:** Fluxo simplificado com geração de pedido e pagamento via PIX.
- **Rodapé Premium:** Layout em 4 colunas com links de navegação, social e acesso restrito.

### Administrativo (Dashboard One-Page)
- **Visão Geral:** Métricas e gráficos interativos (Chart.js) para faturamento e status de pedidos.
- **Gestão de Pedidos:** Detalhes completos do comprador, endereço de entrega e itens comprados.
- **Gestão de Produtos:** CRUD completo com upload real de imagens via Fetch API para Cloudinary.
- **Gestão de Carrossel:** Controle total sobre os slides da home (título, subtítulo e imagem).
- **Navegação Inteligente:** ScrollSpy e âncoras para alternar entre seções sem recarregar a página.
- **Segurança:** Autenticação via Supabase Auth com proteção de tentativas de login.

## 🛠️ Tecnologias

- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES Modules).
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL, Auth).
- **Upload de Imagens:** [Cloudinary](https://cloudinary.com/).
- **Gráficos:** [Chart.js](https://www.chartjs.org/).
- **Design:** SaaS Moderno, Glassmorphism e tipografia 'Inter'.

## 📁 Estrutura do Projeto

```text
├── index.html              # Landing page e vitrine dinâmica
├── pages/
│   ├── product-details.html # Detalhes do produto
│   ├── checkout.html        # Finalização de compra
│   └── admin.html           # Painel Administrativo (One-Page)
├── js/
│   ├── app.js               # Lógica principal da vitrine
│   ├── admin.js             # Inteligência do Dashboard e 
Gestão
│   ├── carousel.js          # Script do carrossel dinâmico
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
   - Configure as tabelas `products`, `orders` e `carousel_slides` no seu projeto Supabase.
   - Habilite o Row Level Security (RLS) para proteger os dados.

3. **Configuração de Imagens:**
   - Crie uma conta no Cloudinary e configure um **unsigned upload preset**.

4. **Execução:**
   - Abra o `index.html` através do Live Server.
   - O painel administrativo está em `/pages/admin.html`.

## 🎨 Design System

O projeto utiliza uma paleta de cores refinada baseada em tons de cinza (`#18181b` a `#f9f9fb`) com o preto como cor primária e o verde (`#3ecf8e`) para destaques de sucesso. O layout é responsivo e utiliza conceitos modernos de interface para garantir uma experiência premium.
