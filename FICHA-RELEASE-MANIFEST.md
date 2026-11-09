# Backend — ficha de venda — preparação isolada

Worktree: `/home/ubuntu/comprefi-work/backend-ficha-release`.
Branch: `feat/ficha-venda-release-isolada-20261104`. Base/HEAD permanece `dc70b6796db967f0dbcec4c0373b2d8ede4d5533`; nenhum commit/push/deploy realizado. Nenhum banco acessado ou migrado nesta implementação. Nenhum `.env` externo, credencial ou webhook real usado pelos comandos de build/teste.

## Estado e evidência

Implementação funcional para auditoria independente, **não liberada para produção**. Build e TypeScript passaram; feature: 65 testes em 7 suítes passaram. Suíte integral da base: 206 testes em 25 suítes passaram. Lint da feature passou; lint geral: zero erros e 9 warnings pré-existentes `no-explicit-any`. Logs locais em `validation/`.

Dependências copiadas privadamente com dereference dos symlinks superiores de `backend-seminovos-consolidacao/node_modules`, e árvore real de jsPDF de `backend-ficha-v1`; nenhuma dependência/client Prisma da árvore original foi alterada. A cópia efetiva tem Prisma 6.19.0 e jsPDF 4.2.1 (versões reais da origem), dentro dos ranges/lock de dependências. Client Prisma gerado somente nesta cópia.

## Contrato HTTP

Prefixo `/ficha-venda`, sem prefixo `/api` adicional. Auth real existente: `POST /auth/login` com `{email,password}` retorna `{access_token,user}`. Não há login/seed local na feature.

| Método e endpoint | Acesso e resposta |
|---|---|
| GET `/health` | Público, `{status:'ok',crmMode:'disabled'|'datacrazy'}` |
| GET `/catalog` | JWT + papel atual ADMIN/SALES, catálogo central ativo e SKU atual |
| GET `/admin` | ADMIN todas; SALES somente próprias; `SheetSnapshot[]` |
| POST `/admin` | ADMIN/SALES; `SheetTermsDto`; **Idempotency-Key obrigatório**; `{sheet,token?,replayed}` |
| GET `/admin/:id` | ADMIN ou SALES proprietário; `SheetSnapshot` |
| POST `/admin/:id/link` | ADMIN/proprietário; ficha não enviada/não revogada; `{sheet,token}` |
| POST `/admin/:id/revoke` | ADMIN/proprietário; ficha não enviada; `SheetSnapshot` |
| GET `/admin/:id/contract` | ADMIN/proprietário; lê PDF privado persistido; `application/pdf` attachment |
| POST `/admin/:id/contract/retry` | ADMIN/proprietário; pendente/falha/lease expirado; **PDF pronto retorna 409**, nunca sobrescreve |
| GET `/admin/:id/crm-payload` | **Somente ADMIN**; payload congelado; SKU ausente/manual retorna 409 |
| POST `/admin/:id/crm/retry` | **Somente ADMIN**; somente espera/preparação sem tentativa; sent/sending/uncertain bloqueados |
| GET `/public/:token` | `PublicSheet`, sem customer/createdBy/seller/SKU/CRM/lease; IMEI/tradeNotes/notes vazios |
| POST `/public/:token` | `{customer,accepted:true}`; **Idempotency-Key obrigatório**; `{reference,revision,submitted:true,pdfStatus,crmStatus}` |

Todos os dados privados têm `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`. Projeções admin removem hashes de link/idempotência, vendedor jurídico, payload privado e claims. Customer aparece somente no admin autorizado, nunca no público já recebido.

`Idempotency-Key`: string aleatória 8–128 caracteres `[A-Za-z0-9._-]`. Criação unique por proprietário + hash da chave, com hash do DTO transformado, excluindo `lineId` de apresentação; corpo divergente: 409. Replay não depende de consulta ao catálogo alterado. Token de 32 bytes/base64url (hash SHA256 apenas no DB) é retornado **somente na criação original**; replay devolve mesma ficha, `replayed:true`, sem token bruto. Se a resposta original foi perdida, renovar link pelo endpoint autorizado; frontend deve tratar token opcional. Link TTL sete dias; rotacionar invalida o antigo; expirado/revogado: 410. Não pode alterar link após submit.

Submit transforma/normaliza cadastro e calcula hash estável da chave/corpo: replay igual retorna estado atual; mesma chave/corpo divergente ou nova chave depois de enviada: 409. CPF matemático e e-mail sintático não verificam identidade/titularidade. Submit não confirma pagamento.

## Persistência, concorrência e tarefas

PrismaModule + PrismaService reais; guard consulta usuário atual e exige mesmo papel do JWT, incluindo metadados atuais do vendedor. Ownership é conferido no serviço em cada endpoint relevante.

Migração **aditiva, não aplicada**: `migrations/20261104120000_sale_sheet_private/migration.sql`. Apenas tabelas/índices/função/trigger novos: `sale_sheets` (snapshot JSONB + owner/token/revision/status indexados), `sale_sheet_documents` (Bytes privado, unique ficha/revisão), `sale_sheet_events` (audit trail sem cliente/token). FK proprietário para usuário existente; sem alteração de suas colunas. CHECK documento 1–2.097.152 bytes, e trigger impede UPDATE/DELETE de PDF versionado. Tasks pdf/crm ficam no único snapshot por ficha/revisão; não existe fila ou store Map de produção.

Cada mutação usa transação PostgreSQL READ COMMITTED + `pg_advisory_xact_lock(1946110401)` global do módulo. Leitura acontece depois de adquirir lock; modificações do snapshot/evento/documento têm commit atômico. V1 deliberadamente serializa batches pequenos; não é solução para grandes volumes. Lock global exige que futuros writers da feature respeitem o mesmo port/lock. Sem rede ou render dentro de transação.

PDF e CRM recebem `leaseId` aleatório + `leaseUntil` de 120 segundos, persistidos antes do render/HTTP, com CAS do lease na conclusão. CRM registra attempts/attemptedAt antes da rede. Startup preserva claims vivos; PDF waiting ou lease expirado pode recuperar; CRM sending expirado fica uncertain **sem envio de startup**. Timeout/reset/non-2xx sempre uncertain, sem retry automático; 2xx é estado técnico `sent`, não negócio garantido nem exactly-once remoto. PDF falha é independente de CRM/cadastro. PDF ready não é regenerado nem no download/retry/startup. Payload, seller, customer, negociação, data, versão e revisão ficam congelados ao submit. Versão comercial distinta e modo persistido; renderer usa versão congelada e não modo atual para recovery.

## Configuração

- `FICHA_VENDA_ENABLED=false` padrão: AppModule inclui SaleSheetModule apenas com string `true`. Rotas feature ausentes quando false, funções existentes intactas.
- `FICHA_CONTRACT_MODE=demonstration` padrão, dados demonstrativos e marca NÃO ASSINADO/SEM VALIDADE.
- Comercial opt-in: `FICHA_CONTRACT_MODE=commercial`, `FICHA_CONTRACT_LEGAL_APPROVED=true`, `FICHA_SELLER_IDENTITY_JSON` privado completo. Configuração inválida lança erro, sem fallback vendedor fictício. Estrutural: não certifica identidade fiscal nem revisão jurídica efetiva.
- `FICHA_CRM_MODE=disabled` padrão. Futuro opt-in `datacrazy` requer `FICHA_CRM_DEDICATED_URL` HTTPS exata, sem query/fragment/credentials/root path, e `FICHA_CRM_DEDICATED_URL_SHA256` SHA256 da string URL ou `FICHA_CRM_ALLOWED_URLS_JSON` array de URLs exatas. URLs de funil configuradas não podem ser reutilizadas. URL exata (host + path) aprovada, sem redirects.
- `FICHA_CRM_TIMEOUT_MS=5000` padrão (100–30000).
- Mock de teste **somente** `NODE_ENV=test` + `FICHA_CRM_TEST_LOOPBACK=true` + URL `http://127.0.0.1:porta/path` ou `http://[::1]:porta/path`, e pin/allowlist exata ainda obrigatórios. Sem mock em development/production.
- Anexos CRM sempre disabled; sem URL pública PDF/object storage, adapter de estoque, catálogo estático ou mapas SKU.

## Comandos exatos seguros de validação (sem DB)

Executar no worktree indicado; `env -i` impede herança de envs/credenciais. NÃO usar `npm start`/`start:prod`: os scripts preexistentes fazem migrate deploy.

```bash
cd /home/ubuntu/comprefi-work/backend-ficha-release
# Client privado, schema local e URL fictícia; generate não acessa banco.
env -i PATH="$PATH" HOME=/home/ubuntu DATABASE_URL=postgresql://ficha_fake:ficha_fake@127.0.0.1:6543/ficha_fake node node_modules/prisma/build/index.js generate --schema schema.prisma
env -i PATH="$PATH" HOME=/home/ubuntu NODE_ENV=test node node_modules/typescript/bin/tsc --noEmit
env -i PATH="$PATH" HOME=/home/ubuntu NODE_ENV=test node node_modules/@nestjs/cli/bin/nest.js build
env -i PATH="$PATH" HOME=/home/ubuntu NODE_ENV=test node node_modules/eslint/bin/eslint.js 'src/modules/sale-sheet/**/*.ts' src/database/prisma.module.ts src/app.module.ts
env -i PATH="$PATH" HOME=/home/ubuntu NODE_ENV=test node node_modules/jest/bin/jest.js --runInBand --testPathPatterns=modules/sale-sheet
env -i PATH="$PATH" HOME=/home/ubuntu NODE_ENV=test node node_modules/jest/bin/jest.js --runInBand
```

## Banco descartável e duas APIs — responsabilidade do auditor

**Ainda não executado neste subtask**: integração PostgreSQL novo, login real com usuários fictícios, duas APIs HTTP concorrentes, prova de feature false preservando login/catalog/site. O auditor deve criar banco vazio isolado com rede somente loopback e credenciais fictícias, aplicar schema/migração apenas nele, criar User ADMIN + dois SALES fictícios via Prisma/bcrypt e ProductGroup/ProductVariant centrais sintéticos, sem seeds/base de produção. Incluir CHECK/trigger da migração na preparação do DB (db push sozinho não cria ambos). Com DB próprio pronto, iniciar diretamente a saída do build, em processos de teste:

```bash
# Auditor substitui SOMENTE a URL pelo DB descartável LOCAL já criado.
env -i PATH="$PATH" HOME=/home/ubuntu NODE_ENV=test DATABASE_URL='postgresql://ficha_fake:ficha_fake@127.0.0.1:6543/ficha_fake' SECRET_KEY='ficha_audit_fake_secret_32_characters_only' EXPIRES_IN=1h FICHA_VENDA_ENABLED=true FICHA_CRM_MODE=disabled PORT=4311 node dist/src/main.js
# Outra instância: mesmas opções/banco, PORT=4312. Sem npm start.
```

Contrato de criação para fixtures: termos exatos em `src/modules/sale-sheet/sale-sheet.service.spec.ts` (`terms()`); cliente fictício em `contract/fixtures.ts`. Não copiar fichas de teste para banco existente. Auditor deve testar simultaneidade create/submit/despacho entre 4311/4312 e reconciliação startup de live vs expired leases, erro PostgreSQL/documento/CRM, status incerto e tentativa persistida. Futuros ajustes de produção (migração, envs, destino CRM, jurídica, observabilidade) exigem autorização separada.

## Atualização em 05/11 — contrato parametrizado fiel ao texto-base

Garantia de seminovos: seis meses CompreFi, decisão já estabelecida. Template corrente `modelo-comprefi-v1-campos-20261105` (demo) e `modelo-comprefi-v1-comercial-campos-20261105` (comercial). Cláusulas fixas preservadas, incluindo cláusula9 de24horas após assinatura, sem condição de disponibilidade de cobrança. Somente variáveis e exceções comerciais já aprovadas. Versões anteriores em `contract/template-legacy.ts`; PDF anterior comprovadamente byte-idêntico. Sem reinterpretar snapshots/documentos persistidos.

Suite completa revalidada:222testes/26suítes aprovados; build, lint da pasta contrato e diff-check aprovados. Três PDFs demonstrativos com13cláusulas, seis meses, valores/prazo e assinaturas em branco verificados visualmente e por texto. Não houve mudança de endpoint, frontend, migração, banco, CRM ou configuração real. Evidências em `/home/ubuntu/comprefi-audit/ficha-contrato-20261105`. Os resultados de auditoria integrada de banco/API são os de04/11 e não foram repetidos neste ajuste textual.

## Atualização em 05/11 — validações antes de staging

Primeiro submit público revalida a data máxima manual dentro da transação e antes de salvar cadastro/emissão/versão ou preparar PDF/CRM. Se o prazo venceu, retorna HTTP 400 com `code: delivery_deadline_expired` e orientação para revisar a negociação e receber uma nova ficha. Replay já enviado é resolvido antes dessa verificação; download e recuperação de PDF falhado continuam usando o snapshot congelado.

Nascimento e prazo compartilham o dia civil `America/Sao_Paulo`, independentemente do TZ do processo. Nascimento futuro não é aceito na janela em que UTC já mudou de dia e Brasília ainda não. Validação estrita de calendário preservada.

Regressões locais: 11 casos novos (6 serviço e 5 DTO); duas suítes/41 testes distintos passaram com TZ UTC e Pacific/Honolulu. Suíte completa do backend atual: 233 testes em 26 suítes, sem falhas. Tipos/build/lint da feature passaram. As duas validações não alteram template/renderer, dependências, schema, migração, datas de contratos existentes ou configurações reais. Configuração offline de staging demonstrativo validada, sem abrir conexão ou iniciar a aplicação.

A preparação permanece na branch isolada, sem commit, push, deploy ou aplicação de migração em banco existente. Evidências atuais e configuração de staging em `/home/ubuntu/comprefi-audit/ficha-staging-preparacao-20261105`; a auditoria integrada dessa pasta substitui os diagnósticos iniciais quando marcada como aprovada.
