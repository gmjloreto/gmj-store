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
- **Gestão de Produtos:** CRUD completo com controle de estoque relacional (has_sizes) e upload via Cloudinary.
- **Gestão de Carrossel:** Controle total sobre os slides da home (título, subtítulo e imagem).
- **Navegação Inteligente:** Botão de retorno à loja, ScrollSpy e menu mobile integrado.
- **Segurança:** Autenticação via Supabase Auth e validação de permissão administrativa.

## 🛠️ Tecnologias

- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES Modules).
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, RPC).
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
│   ├── admin.js             # Inteligência do Dashboard e Gestão
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
   - Configure as tabelas `products`, `product_sizes`, `orders`, `order_items` e `carousel_slides`.
   - Utilize as RPCs oficiais para controle seguro de estoque.

3. **Configuração de Imagens:**
   - Crie uma conta no Cloudinary e configure um **unsigned upload preset**.

4. **Execução:**
   - Abra o `index.html` através do Live Server.
   - O acesso admin é restrito a usuários cadastrados na tabela `admins`.

## 🎨 Design System

O projeto utiliza um design system premium inspirado em SaaS modernos:
- **Cores:** Primária (`#000000`), Accent/Destaque (`#0a3ca7`), Sucesso (`#10b981`) e Erro (`#ef4444`).
- **Tipografia:** Família 'Inter' para legibilidade e visual limpo.
- **Componentes:** Border-radius generosos, sombras suaves e transições fluidas.
