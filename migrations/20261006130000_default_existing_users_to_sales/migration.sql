-- A migração anterior preservou todos os usuários legados como ADMIN.
-- Não a reescrever: ela já foi aplicada no staging e tem checksum registrado.
-- Corrigir os papéis de modo conservador antes de publicar o novo backend.
-- Gustavo será promovido exclusivamente pelo script promote-admin-role.ts,
-- que exige ADMIN_EMAIL e uma conta existente (sem criar conta ou trocar senha).
UPDATE "users"
SET "role" = 'SALES'
WHERE "role" <> 'SALES';
