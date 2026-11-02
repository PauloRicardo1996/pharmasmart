# PharmaSmart — Auditoria completa do MVP

**Data:** 02/11/2026  
**Escopo:** análise, validação e documentação não destrutivas.  
**Raiz:** `C:\pharmasmart`  
**Revisão:** atualização após relatórios reais, autenticação, usuários, perfis, autorização e auditoria de ações.

## Conclusão executiva

O PharmaSmart pode ser considerado um **MVP funcional do ponto de vista de software**. O fluxo principal está implementado: importação mensal, análise histórica, reposição determinística, sugestões, relatórios, pedidos, usuários, autorização e auditoria.

Ainda existem limitações acadêmicas e operacionais: classificação completa de medicamentos, validação em múltiplos navegadores, disponibilidade de produção, teste de carga e massa real de usuários/fornecedores.

Critério: CONCLUÍDO = 1, PARCIAL = 0, NÃO IMPLEMENTADO = 0. Todos os requisitos têm o mesmo peso.

| Grupo | Conta | Percentual |
|---|---:|---:|
| RF01–RF10 | 9,5 / 10 | **95%** |
| RNF01–RNF10 | 8,5 / 10 | **85%** |
| Geral | 18 / 20 | **90%** |

## Contagens atuais do PostgreSQL

Consulta somente leitura:

| Modelo | Contagem |
|---|---:|
| Produto | 9.964 |
| Estoque | 9.377 |
| EstoqueSnapshot | 18.435 |
| EntradaMensal | 3.306 |
| Venda | 1.448 |
| ItemVenda | 5.948 |
| HistoricoVenda | 2.699 |
| ParametroReposicao | 1 |
| RelatorioReposicao | 1 |
| CalculoReposicao | 9.377 |
| SugestaoCompra | 324 |
| PedidoCompra | 0 |
| ItemPedidoCompra | 0 |
| Fornecedor | 0 |
| Usuario | 0 |
| Auditoria | 0 |

O banco agora possui um único usuário permanente, criado pelo bootstrap seguro: `Usuario = 1`, perfil `GERENTE`. Registros de auditoria podem existir a partir das validações reais de autenticação; não há usuário temporário permanente.

## Requisitos funcionais

| Requisito | Status | Evidência real | O que falta |
|---|---|---|---|
| RF01 — histórico e maior demanda | CONCLUÍDO | `HistoricoVenda`, motor, ranking no Dashboard e Histórico | Evoluções analíticas são futuras |
| RF02 — quantidade ideal de compra | CONCLUÍDO | Demanda, cobertura, segurança, alvo, `CalculoReposicao` e `SugestaoCompra` | Previsão estatística não pertence à V1 |
| RF03 — genérico, similar e marca | PARCIAL | `TipoMedicamento` contém `GENERICO`, `SIMILAR`, `MARCA` e `NAO_CLASSIFICADO`; há classificação segura | Parte dos produtos não tem evidência suficiente |
| RF04 — risco de falta | CONCLUÍDO | Cobertura e riscos `CRITICO`, `ALTO`, `MEDIO`, `BAIXO` calculados no backend | Não há previsão estatística/IA, sem prejuízo da detecção V1 |
| RF05 — importação | CONCLUÍDO | CSV, XLS e XLSX, pacote mensal de estoque, entradas e vendas | Nenhuma lacuna essencial |
| RF06 — validação | CONCLUÍDO | Formato, estrutura, tipo, período, datas, Decimal, anomalias, duplicidade e cruzamento | Diagnósticos adicionais são futuros |
| RF07 — processamento | CONCLUÍDO | Arquivos → PostgreSQL → histórico → motor → cálculos → sugestões | Nenhuma lacuna essencial |
| RF08 — visualização de vendas | CONCLUÍDO | Histórico mensal, detalhe de produto e vendas detalhadas | Nenhuma lacuna essencial |
| RF09 — relatórios analíticos | CONCLUÍDO | `/relatorios` real para vendas, entradas, estoque e reposição, filtros, paginação e CSV | PDF é evolução futura |
| RF10 — filtros | CONCLUÍDO | Período, grupo, subgrupo, risco, confiança, busca e tendências | Nenhuma lacuna essencial |

[importacaoService.js](../backend/src/services/importacaoService.js), [importacaoParser.js](../backend/src/utils/importacaoParser.js) e [ImportarDados.jsx](../frontend/src/pages/ImportarDados.jsx) implementam preview, validação e confirmação transacional. A integração usa `codigoExterno`; valores negativos e decimais são preservados; produtos sem evidência segura ficam `NAO_CLASSIFICADO`.

[Relatorios.jsx](../frontend/src/pages/Relatorios.jsx) consulta vendas, entradas, estoque e reposição reais, com filtros backend, paginação e CSV. PDF continua não implementado.

## Requisitos não funcionais

| Requisito | Status | Evidência | Limitação |
|---|---|---|---|
| RNF01 — interface intuitiva | CONCLUÍDO | Loading, erro, vazio, toasts, modais, filtros e navegação protegida | Melhorias visuais são evolutivas |
| RNF02 — segurança | CONCLUÍDO no MVP/local | bcrypt, JWT em cookie HttpOnly, SameSite, Secure em produção, perfis, autorização, `.env`, backup, restore, shadow, validações e transações | Sem MFA, CSRF dedicado, SIEM ou infraestrutura produtiva |
| RNF03 — resposta abaixo de 2 s | CONCLUÍDO no ambiente local medido | Dashboard 586 ms; Sugestões 53 ms; Histórico 374 ms; Produtos 19 ms; Estoque 278 ms; motor 1.956 ms | Não substitui teste de carga/produção |
| RNF04 — navegadores modernos | PARCIAL | React, Vite e APIs web compatíveis tecnicamente | Não houve execução separada em Chrome, Edge, Firefox e Safari |
| RNF05 — múltiplos usuários | CONCLUÍDO como capacidade | `Usuario`, login único normalizado, sessão, CRUD, perfis, ativação/desativação e autorização | A operação depende do bootstrap do primeiro gerente |
| RNF06 — disponibilidade | PARCIAL | Aplicação funcional localmente | Sem deploy, monitoramento, SLA, redundância ou HA |
| RNF07 — integridade | CONCLUÍDO no escopo local | PostgreSQL, uniques, snapshots, transações, rollback, backup, restore e shadow separado | Controles produtivos ainda são necessários |
| RNF08 — escalabilidade | PARCIAL | Camadas, paginação, filtros backend, índices e consultas em lote | Sem teste de carga ou infraestrutura escalável validada |
| RNF09 — auditoria de ações | CONCLUÍDO | `Auditoria`, `usuarioId`, ação, recurso, recursoId, data, IP, user-agent, metadados, filtros, paginação e `/auditoria` restrito a gerente | CRUD simples de produto, fornecedor e estoque audita após a mutação; operações principais são atômicas |
| RNF10 — manutenção | CONCLUÍDO | Services, controllers, routes, Prisma, testes, documentação e componentes reutilizáveis | Nenhum bloqueio estrutural |

## Autenticação, usuários e autorização

A autenticação demonstrativa foi substituída por `POST /api/auth/login`, `POST /api/auth/logout` e `GET /api/auth/me`, usando login normalizado em lowercase e senha com hash bcrypt. A sessão usa JWT assinado no backend em cookie HttpOnly por 8 horas; o JWT não fica acessível ao frontend. `requireAuth` recarrega o usuário ativo no banco, e `requireRole('GERENTE')` protege usuários, configurações e auditoria. Farmacêutico recebe 403 nesses recursos. O PharmaSmart é um sistema interno fechado: contas são administradas por gerentes, sem auto cadastro ou recuperação de senha por e-mail; a redefinição é administrativa.

O primeiro gerente é criado manualmente por [create-admin.js](../backend/scripts/create-admin.js), sem credencial previsível ou senha fixa no código.

## Auditoria de ações

O model [Auditoria](../backend/prisma/schema.prisma) possui `usuarioId`, `acao`, `recurso`, `recursoId`, `descricao`, JSON de dados, IP, user-agent e data. Os enums `AcaoAuditoria` e `RecursoAuditoria` centralizam os valores.

São auditados login bem-sucedido, usuários, produtos, estoque manual, fornecedores, importação confirmada, geração de reposição, configuração de reposição e pedidos. Leituras comuns e simulações não são auditadas. Senhas, hashes, JWTs, cookies, secrets, URLs de banco e arquivos completos são removidos dos metadados.

Importação, reposição, configurações, usuários e pedidos registram auditoria dentro da mesma transação. CRUD simples de produto, fornecedor e estoque registra após a mutação; essa limitação não impede o atendimento do RNF09 no MVP.

## Páginas

| Página | Estado | Dados reais | Autorização | Mock |
|---|---|---|---|---|
| Login | REAL | API de autenticação | Pública | Não |
| Dashboard | REAL | PostgreSQL via `/api/dashboard` | Autenticado | Não |
| Estoque / Produtos | REAL | APIs de produtos e estoque | Autenticado | Não |
| Histórico | REAL | Histórico, entradas, snapshots e vendas | Autenticado | Não |
| Sugestões | REAL | Cálculos e sugestões persistidos | Autenticado | Não |
| Pedidos | REAL, sem massa operacional | APIs de pedidos/fornecedores | Autenticado | Não |
| Fornecedores | REAL, banco vazio | CRUD real | Autenticado | Não |
| Importação | REAL | Preview, validação e confirmação | Autenticado | Não |
| Relatórios | REAL | Vendas, entradas, estoque, reposição e CSV | Autenticado | Não |
| Configurações | REAL | Parâmetros persistidos | GERENTE | Não |
| Usuários | REAL | CRUD administrativo | GERENTE | Não |
| Auditoria | REAL | Consulta paginada e detalhada | GERENTE | Não |

## Inventário de APIs

| Grupo | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Usuários | `GET/POST /api/usuarios`, `GET/PUT /api/usuarios/:id` |
| Dashboard | `GET /api/dashboard` |
| Produtos | `GET /api/produtos`, `GET /api/produtos/:id`, `POST`, `PUT /:id`, `DELETE /:id` |
| Estoque | `GET /api/estoque`, `GET /api/estoque/:id`, `GET /api/estoque/produto/:produtoId`, `POST`, `PUT /:id` |
| Histórico | `GET /api/historico`, `GET /api/historico/produtos/:produtoId` |
| Importação | `POST /api/importacoes/validar-periodo`, `POST /api/importacoes/confirmar` |
| Reposição | `GET /api/reposicao/simular`, `POST /api/reposicao/gerar`, `GET /api/reposicao/calculos`, `GET /api/reposicao/sugestoes`, `GET /api/reposicao/sugestoes/:id` |
| Pedidos | `POST /api/pedidos`, `GET /api/pedidos`, `GET /api/pedidos/:id`, `PUT /api/pedidos/:id`, `PATCH /api/pedidos/:id/status` |
| Fornecedores | `GET/POST /api/fornecedores`, `GET/PUT/DELETE /api/fornecedores/:id` |
| Configurações | `GET /api/configuracoes/reposicao`, `PUT /api/configuracoes/reposicao` |
| Relatórios | `GET /api/relatorios`, `GET /api/relatorios/exportar` |
| Auditoria | `GET /api/auditoria`, `GET /api/auditoria/:id` |
| Saúde | `GET /api/health` |

## Testes

Existem 11 arquivos em [backend/test](../backend/test), cobrindo auditoria, autenticação, configurações, Dashboard, Histórico, importação, Decimal, pedidos, relatórios e reposição. A execução atual de `node --test test/*.test.js` registrou **35 testes aprovados e 0 falhas**.

Os cenários cobrem importação, reposição, Dashboard, Histórico, pedidos, login, logout, sessão, autorização, consulta de auditoria, filtros, paginação e ausência de dados sensíveis. Não há suíte completa para múltiplos navegadores, carga, restore real ou pedido persistido com fornecedor real.

## Funcionalidades além do escopo original

Snapshots históricos, cruzamento mensal de fontes, Decimal, warnings de anomalia, `NAO_CLASSIFICADO`, confiança do cálculo, explicação determinística, persistência auditável da reposição, prevenção de duplicidade, parâmetros persistidos, pedidos, autenticação, perfis, autorização, auditoria, backup/restore e shadow database.

## Lacunas finais

### Obrigatório antes da entrega acadêmica

1. Criar o primeiro gerente pelo bootstrap seguro e registrar o procedimento de demonstração.
2. Documentar no TCC a limitação de classificação e o uso de `NAO_CLASSIFICADO`.
3. Registrar as medições locais e seus limites no material acadêmico.

### Recomendado antes da apresentação

1. Exercitar pedidos em ambiente controlado com fornecedor de teste.
2. Validar ao menos Chrome e Edge e registrar os resultados.
3. Revisar vulnerabilidades das dependências npm.

### Evolução futura

PDF, previsão estatística, sazonalidade, IA explicativa, MFA, CSRF dedicado, recuperação de senha, deploy, monitoramento, alta disponibilidade, cotação, fornecedor preferencial, envio externo, recebimento e SIEM.

## Próximas cinco ações

1. Criar o primeiro gerente e preparar o roteiro final de demonstração.
2. Documentar RF03, RNF03, RNF04 e RNF06 no material acadêmico.
3. Fazer uma validação multi-browser curta.
4. Exercitar pedidos em ambiente isolado.
5. Congelar o escopo e preparar a apresentação acadêmica.

## Integridade

Nesta auditoria não houve alteração de código de aplicação, schema, migration ou registro. Não foram criados usuários, auditorias, sugestões, importações ou pedidos. Os relatórios reais permaneceram intactos.

O hash SHA-256 de [pharmasmart-v2.html](../pharmasmart-v2.html) permanece:

`1705CEEB0CD43E172F21FB069060FDBCF380F43E29F0AFE1487E24A933D44A58`

## Resposta final

**PHARMASMART PODE SER CONSIDERADO MVP FUNCIONAL: SIM.**

O núcleo está funcional e conectado aos dados reais. A resposta para “atende completamente todos os RF/RNF acadêmicos?” é **NÃO**, devido às limitações documentadas de classificação completa, validação multi-browser, disponibilidade de produção, teste de carga e ausência de massa operacional de usuários/fornecedores.
