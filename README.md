# PharmaSmart

Sistema Inteligente de Gestão de Estoque de Farmácia. Esta primeira etapa transforma o protótipo visual oficial em uma base React + Express, mantendo os dados demonstrativos e preparando o modelo Prisma.

## Requisitos

- Node.js 18+
- PostgreSQL (necessário apenas quando a persistência for ativada)

## Instalação e execução

Em um terminal:

```bash
cd frontend
npm install
npm run dev
```

Em outro terminal:

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Frontend: `http://localhost:5173`  
API: `http://localhost:3001`  
Health check: `http://localhost:3001/api/health`

O frontend usa `VITE_API_URL` para localizar a API. Para configurar uma URL
diferente, copie `frontend/.env.example` para `frontend/.env` e ajuste o valor
sem inserir credenciais.

Para preparar o Prisma depois de configurar um PostgreSQL local, preencha `DATABASE_URL` no `.env` e execute `npm run prisma:generate`.

## Estrutura

- `frontend/src/components`: componentes visuais reutilizáveis.
- `frontend/src/pages`: páginas roteadas do sistema.
- `frontend/src/layouts`: shell da aplicação.
- `frontend/src/styles`: CSS extraído e organizado a partir do protótipo.
- `backend/src`: API Express, rotas, controller e middleware.
- `backend/prisma/schema.prisma`: modelo relacional inicial.
- `docs`: plano de migração e notas do modelo.

## Escopo ainda mockado

Autenticação/autorização, banco de produção, importação definitiva, cálculo definitivo de reposição, geração persistida de pedidos, relatórios exportáveis e integração com IA ainda não foram implementados. O motor determinístico e a IA futura permanecem separados por decisão arquitetural.

## Frontend conectado

As páginas `Estoque / Produtos` e `Fornecedores` consomem a API real com
loading, estado vazio, erros, busca, filtros, paginação server-side, cadastro,
edição e exclusão com confirmação. O dashboard e as demais áreas continuam
com dados demonstrativos até as próximas etapas.

## API

A API REST roda por padrão em `http://localhost:3001`.

- `GET /api/health`: verifica se a API está disponível.
- `GET /api/produtos`: lista produtos com `page`, `limit`, `search`, `tipo` e `categoria`.
- `GET /api/produtos/:id`: consulta um produto.
- `POST /api/produtos`: cadastra um produto.
- `PUT /api/produtos/:id`: atualiza um produto.
- `DELETE /api/produtos/:id`: exclui somente produtos sem relacionamentos.
- `GET /api/estoque`: lista estoque com `page`, `limit`, `search` e `status` (`NORMAL` ou `ESTOQUE_BAIXO`).
- `GET /api/estoque/:id`: consulta um registro de estoque.
- `GET /api/estoque/produto/:produtoId`: consulta estoque pelo produto.
- `POST /api/estoque`: cria um estoque, respeitando um registro por produto.
- `PUT /api/estoque/:id`: atualiza quantidades não negativas.
- `GET /api/fornecedores`: lista fornecedores com `page`, `limit` e `search` por nome/CNPJ.
- `GET /api/fornecedores/:id`: consulta um fornecedor.
- `POST /api/fornecedores`: cadastra fornecedor com validação de CNPJ e e-mail.
- `PUT /api/fornecedores/:id`: atualiza um fornecedor.
- `DELETE /api/fornecedores/:id`: exclui somente fornecedores sem pedidos relacionados.

As respostas de erro seguem o formato `{ "error": { "code": "...", "message": "..." } }`. A validação é feita com Zod e o status do estoque é calculado dinamicamente; ele ainda não representa previsão de ruptura por demanda.
