# Deploy do PharmaSmart com Neon e Render

## Arquitetura

```text
GitHub (código)
  -> Render Web Service (Node/Express + frontend/dist)
  -> Neon PostgreSQL
```

O serviço Render publica um único domínio. O Express atende a API em `/api/*` e os arquivos compilados do React. As rotas do React usam fallback SPA para que `/dashboard`, `/historico`, `/sugestoes` e as demais funcionem após recarregar a página.

## Neon

- Projeto: `pharmasmart-prod`
- Project ID: `polished-mud-73605353`
- Organização: `org-sparkling-wildflower-10343958`
- Região: São Paulo
- Database de produção: `pharmasmart`
- Database separado para shadow: `pharmasmart_shadow`

O banco foi carregado a partir de um dump PostgreSQL custom validado com `pg_restore --list`. O database inicial `neondb` foi mantido sem uso pela aplicação.

O runtime deve usar a conexão pooled do Neon em `DATABASE_URL`. Tarefas administrativas e migrations futuras devem usar a conexão direta, sempre fora do processo normal do Web Service. Nenhuma senha ou URL real é armazenada neste documento.

`SHADOW_DATABASE_URL` deve apontar exclusivamente para `pharmasmart_shadow`. Produção não executa `prisma migrate dev`; migrations futuras usam `prisma migrate deploy` após revisão do SQL e backup.

## Variáveis do Render

Configurar somente no Environment do Web Service:

- `NODE_ENV`
- `DATABASE_URL`
- `SHADOW_DATABASE_URL`
- `JWT_SECRET`

`DATABASE_URL` recebe a URL pooled do database `pharmasmart`. `SHADOW_DATABASE_URL` recebe a URL do database separado. `JWT_SECRET` deve ser um segredo novo, forte e exclusivo da produção. Nenhuma dessas variáveis deve ser commitada no GitHub.

## Build e execução

O [package.json](../package.json) da raiz define:

- Build: `npm run build`
- Start: `npm start`

O build instala as dependências de `backend/` e as dependências de desenvolvimento de `frontend/` (incluindo o Vite), gera o Prisma Client e executa `vite build`. O start executa somente o Express de produção.

O [render.yaml](../render.yaml) configura o Web Service `pharmasmart`, deploy automático da branch `main` e health check em `/api/health`.

## Deploy inicial

1. Confirmar que o backup local foi criado e que `pg_restore --list` consegue ler o arquivo.
2. Restaurar o dump no database Neon vazio de produção.
3. Comparar as contagens locais e Neon.
4. Configurar as variáveis do Render sem expor valores.
5. Publicar a branch `main` no GitHub.
6. Aguardar o build e o deploy automático do Render.
7. Validar `/api/health`, login, `/api/auth/me` e as rotas protegidas.

O deploy inicial usa restore completo porque o dump contém schema, dados e `_prisma_migrations`. Não misturar esse restore com `migrate dev`.

## Desenvolvimento local

O `.env` local continua apontando para o PostgreSQL local. Em desenvolvimento, o frontend usa `http://localhost:3001/api`; em produção, quando `VITE_API_URL` não é definido, usa `/api` no mesmo domínio.

Não substituir o `.env` local pela conexão Neon.

## Migrations futuras

Revisar o arquivo SQL gerado, garantir backup e usar a conexão direta administrativa. Aplicar apenas com:

```text
npx prisma migrate deploy
```

Nunca usar `prisma migrate reset`, `prisma migrate dev` ou `prisma db push --force-reset` no banco de produção.

## Rollback

Falha de aplicação deve ser revertida pelo histórico de deploy do Render ou por um commit revertido no GitHub. Rollback de código não desfaz alterações de banco; migrations não devem ser revertidas de modo destrutivo automaticamente.

## Diagnóstico

- Health: `/api/health`
- API sem sessão: deve responder `401` nas rotas protegidas.
- Cookie de produção: HttpOnly, Secure, SameSite=Lax e path `/`.
- Uploads de importação são processados em memória; arquivos Excel reais não fazem parte do build.
- Backups locais permanecem ignorados pelo Git e não são enviados ao Render.
