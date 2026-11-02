# Segurança local do banco

O banco principal do PharmaSmart é `pharmasmart`. O banco reservado para operações de shadow do Prisma é `pharmasmart_shadow`; ele deve ser diferente do banco principal.

O [schema.prisma](../backend/prisma/schema.prisma) usa `DATABASE_URL` para o banco principal e `SHADOW_DATABASE_URL` para o shadow. O arquivo `backend/.env` contém os valores locais; não versionar esse arquivo.

Para criar um backup custom do PostgreSQL, execute `scripts/backup-database.ps1`. O arquivo é salvo em `backup/`, com data e hora no nome. Backups reais são ignorados pelo Git.

Restore é uma operação manual. Execute `scripts/restore-database.ps1` somente com `-BackupFile`, `-TargetDatabase` e `-ConfirmRestore`. O script bloqueia explicitamente o destino `pharmasmart`.

Regra crítica: nunca executar `prisma migrate reset` no banco principal. Migrations devem ser revisadas e o shadow nunca pode apontar para `pharmasmart`.
