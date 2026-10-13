# Plano de migração do PharmaSmart

## Estado inicial analisado

O projeto continha somente `pharmasmart-v2.html`, um protótipo monolítico com CSS, markup e JavaScript inline. O arquivo possui login demonstrativo, shell com sidebar/topbar, nove telas, modal de produto, toast, abas, dados mockados e navegação baseada em `navigate(...)`.

## Conversão realizada

- O HTML original foi preservado na raiz.
- O shell visual foi dividido em `Sidebar`, `Topbar`, `Toast`, `Modal`, `KpiCard`, `StatusBadge` e `Icons`.
- Cada tela passou a ser uma rota React real usando React Router.
- O estado de login/perfil é local e demonstrativo; ainda não é autenticação.
- A tela de importação passou a aceitar visualmente CSV, XLS e XLSX e validar a extensão no frontend.
- Os valores do dashboard, tabelas, sugestões e relatórios continuam mockados.
- O backend inicial expõe somente saúde da API; regras de negócio e persistência ainda não foram implementadas.

## Próxima fase

Implementar os repositories/services do backend, validar o schema em PostgreSQL, criar migrations somente após revisão acadêmica, e substituir progressivamente os mocks por chamadas à API.

