# Autenticação interna

O PharmaSmart é um sistema interno e fechado. As contas são criadas e administradas por usuários com perfil `GERENTE`; não existe auto cadastro, convite público ou recuperação de senha por e-mail. Se uma senha for esquecida, um gerente deve redefini-la pela administração de usuários.

O acesso utiliza `login` normalizado em lowercase e senha. O backend persiste somente `senhaHash` com bcrypt. A sessão é um JWT assinado, enviado em cookie HttpOnly com duração centralizada de oito horas; o token não é exposto ao frontend.

`FARMACEUTICO` acessa as operações da farmácia. `GERENTE` possui também configurações, usuários e auditoria. Essas regras são aplicadas no backend por `requireAuth` e `requireRole`; a visibilidade da Sidebar é apenas apoio à experiência de uso.

O primeiro gerente é criado somente pelo bootstrap administrativo explícito em [create-admin.js](../backend/scripts/create-admin.js), usando variáveis de ambiente temporárias. Credenciais não fazem parte do código, da documentação, dos testes ou dos logs.
