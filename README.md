# FoodSystem - Card�pio Digital Moderno

Sistema de cardápio digital completo com cliente e painel administrativo, focado em performance e experiência do usuário (UX).

## 🚀 Tecnologias

- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS** (Estilização)
- **shadcn/ui** (Componentes de Interface)
- **Zustand** (Estado Global)
- **Dexie.js** (IndexedDB para persistência offline-first)
- **Framer Motion** (Animações)
- **Lucide React** (Ícones)
- **React Hook Form** + **Zod** (Validações)

## 📁 Estrutura do Projeto

- `back-end`: API Node.js/Express, Prisma e migrations.
- `front-end`: Aplicação web (cliente e painel administrativo).
- `src/app/client`: Aplicação voltada para o cliente final.
- `src/app/admin`: Painel administrativo para gestão do estabelecimento.
- `src/shared`: Componentes, hooks e utils compartilhados.
- `src/core`: Serviços de banco de dados, stores e tipos globais.

## 🛠️ Como executar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Execute o projeto em modo de desenvolvimento:

   ```bash
   npm run dev
   ```

3. O banco de dados será populado automaticamente com dados iniciais (seed) no primeiro carregamento.

## ✨ Funcionalidades Implementadas

- [x] Estrutura de pastas profissional
- [x] Configuração de Tema (Light/Dark via CSS Variables)
- [x] Banco de Dados Local (IndexedDB)
- [x] Store de Carrinho (Zustand)
- [x] Visualização de Produtos e Categorias
- [x] Adição ao Carrinho com Feedback (Toast)
- [x] Sistema de Seed de dados
