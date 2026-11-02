-- Usuario is empty before this migration; replace authentication email with normalized login.
ALTER TABLE "usuario" DROP COLUMN "email";
ALTER TABLE "usuario" ADD COLUMN "login" TEXT NOT NULL;
CREATE UNIQUE INDEX "usuario_login_key" ON "usuario"("login");