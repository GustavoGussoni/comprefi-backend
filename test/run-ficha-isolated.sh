#!/bin/bash
set -euo pipefail
WORKTREE=/home/ubuntu/comprefi-work/backend-ficha-usabilidade-20261110
AUDIT=${FICHA_TEST_AUDIT_DIR:-/home/ubuntu/comprefi-audit/pedidos-desarquivar-20261111/backend}
[[ "$AUDIT" =~ ^/home/ubuntu/comprefi-audit/[A-Za-z0-9_-]+/backend(/[A-Za-z0-9_-]+)*$ ]] || { echo 'invalid sanitized audit directory'; exit 1; }
NODE_DIR=/home/ubuntu/.nvm/versions/node/v22.13.0/bin
PG=/usr/lib/postgresql/17/bin
if [[ ! -x "$PG/postgres" ]]; then
  PG=/home/ubuntu/comprefi-audit/ficha-usabilidade-20261110/backend/tools/pg17/usr/lib/postgresql/17/bin
fi
PG_CLIENT=/usr/lib/postgresql/17/bin
if [[ ${1:-} != --inside ]]; then
  cd /home/ubuntu/comprefi-ficha-preview
  exec sudo env -i PATH=/usr/bin:/bin HOME=/home/ubuntu NODE_ENV=test unshare -n /bin/sh -c "/usr/sbin/ip link set lo up && exec /usr/sbin/runuser -u ubuntu -- env -i PATH=$NODE_DIR:/usr/bin:/bin HOME=/home/ubuntu NODE_ENV=test FICHA_TEST_AUDIT_DIR=$AUDIT /bin/bash $WORKTREE/test/run-ficha-isolated.sh --inside"
fi
# No AppModule/main, existing DB, secret, envfile or external network is used.
[[ ${NODE_ENV:-} == test ]] || { echo 'NODE_ENV=test required'; exit 1; }
[[ $(readlink /proc/self/ns/net) != $(readlink /proc/1/ns/net) ]] || { echo 'exclusive network namespace required'; exit 1; }
[[ $(/usr/sbin/ip -o link show | wc -l) == 1 ]] || { echo 'loopback-only network required'; exit 1; }
cd "$WORKTREE"
mkdir -p "$AUDIT"
CLUSTER=$(mktemp -d /tmp/ficha-usabilidade-pg17-XXXXXX)
cleanup() {
  "$PG/pg_ctl" -D "$CLUSTER/data" -m immediate -w stop >> "$AUDIT/postgres.log" 2>&1 || true
  rm -rf "$CLUSTER"
}
trap cleanup EXIT
{
  printf 'NODE_ENV=%s; fresh env; network namespace: loopback only\n' "$NODE_ENV"
  /usr/sbin/ip -brief address
  "$PG/postgres" --version
} > "$AUDIT/isolation.log"
"$PG/initdb" -D "$CLUSTER/data" -U ubuntu -A trust --no-locale > "$AUDIT/postgres.log" 2>&1
"$PG/pg_ctl" -D "$CLUSTER/data" -l "$CLUSTER/server.log" -o "-h 127.0.0.1 -p 55479 -k $CLUSTER" -w start >> "$AUDIT/postgres.log" 2>&1
"$PG_CLIENT/createdb" -h 127.0.0.1 -p 55479 -U ubuntu ficha_usabilidade_test
"$PG_CLIENT/psql" -h 127.0.0.1 -p 55479 -U ubuntu -d ficha_usabilidade_test -v ON_ERROR_STOP=1 >> "$AUDIT/postgres.log" 2>&1 <<'SQL'
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SALES');
CREATE TABLE "users" (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, role "UserRole" NOT NULL);
SQL
"$PG_CLIENT/psql" -h 127.0.0.1 -p 55479 -U ubuntu -d ficha_usabilidade_test -v ON_ERROR_STOP=1 -f "$WORKTREE/migrations/20261104120000_sale_sheet_private/migration.sql" >> "$AUDIT/postgres.log" 2>&1
# This is an invented disposable local DSN, not a production credential.
FICHA_TEST_DATABASE_URL='postgresql://ubuntu@127.0.0.1:55479/ficha_usabilidade_test?schema=public' node node_modules/jest/bin/jest.js --config test/jest-ficha-isolated.json --runInBand --json --outputFile="$AUDIT/jest-integration.json" > "$AUDIT/jest-integration.log" 2>&1
cat "$AUDIT/jest-integration.log"
# All unit suites are mock-only. The legacy test/integration.test.ts is not run.
node node_modules/jest/bin/jest.js --runInBand --json --outputFile="$AUDIT/jest-all-unit.json" > "$AUDIT/jest-all-unit.log" 2>&1
# Legacy unit suites log mocked business operations; retain only the test outcome.
grep -E '^(PASS |FAIL |Test Suites:|Tests:|Snapshots:|Time:|Ran all test suites|Test results written)' "$AUDIT/jest-all-unit.log" > "$AUDIT/jest-all-unit.sanitized"
mv "$AUDIT/jest-all-unit.sanitized" "$AUDIT/jest-all-unit.log"
cat "$AUDIT/jest-all-unit.log"
node node_modules/typescript/bin/tsc --noEmit --incremental false > "$AUDIT/typecheck.log" 2>&1
printf 'TypeScript noEmit passed. Temporary PG17 is being stopped and removed.\n'
