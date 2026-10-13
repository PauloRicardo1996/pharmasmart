# Notas do modelo de dados

O schema inicial segue as entidades documentadas: Produto, Estoque, HistoricoVenda, Fornecedor, ParametroReposicao, CalculoReposicao, SugestaoCompra, PedidoCompra, ItemPedidoCompra e RelatorioReposicao.

Diferenças técnicas necessárias no modelo relacional:

1. `Estoque` recebe `produtoId` único para representar um estoque atual por produto e uma relação explícita com `Produto`.
2. `HistoricoVenda` recebe uma chave única composta por produto, mês e ano para evitar duplicidade do mesmo período.
3. `CalculoReposicao` precisa referenciar o produto calculado, além do parâmetro utilizado; essa relação é necessária para auditar o cálculo.
4. O relacionamento entre relatório e sugestão foi materializado por `RelatorioSugestao`, uma tabela associativa N:N, pois um relatório pode conter várias sugestões e uma sugestão pode aparecer em relatórios diferentes.
5. Os campos de status e tipo foram representados por enums Prisma para restringir valores inválidos.
6. Datas de criação/atualização e valores monetários foram tipados no banco (`DateTime` e `Decimal`).

Não foi criada migration nesta etapa, conforme solicitado. O schema deve ser revisado antes de `prisma migrate dev`.

