#!/bin/bash
# Website <-> API end-to-end journey (tests/e2e/intake-journey.mjs) against a local copy of the API.
# Usage: API_DIR=<crm-windows-api checkout> PHP_IMAGE=<php 8.4 image with pdo_mysql> E2E_PLAYWRIGHT=<playwright-core dir>
#        bash tests/e2e/run.sh <MySQL/MariaDB container with root password p2d-local-test> <its bridge IP>
# Synthetic only: isolated database p2d_public_intake_e2e, loopback ports, no provider calls, nothing deployed.
set -euo pipefail
W="$(cd "$(dirname "$0")/../.." && (pwd -W 2>/dev/null || pwd))"; API_DIR=${API_DIR:?set API_DIR}; PHP_IMAGE=${PHP_IMAGE:?set PHP_IMAGE}; E2E_PLAYWRIGHT=${E2E_PLAYWRIGHT:?set E2E_PLAYWRIGHT}
DB=${1:?db container}; IP=${2:?db ip}
E="$W/test-results/e2e"; mkdir -p "$E"; : > "$E/outbox.jsonl"
SECRET=e2e-proxy-secret-0123456789-abcdefghij
docker rm -f p2d-e2e-api >/dev/null 2>&1 || true
docker exec $DB mysql -uroot -pp2d-local-test -e "DROP DATABASE IF EXISTS p2d_public_intake_e2e; CREATE DATABASE p2d_public_intake_e2e CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" 2>/dev/null
CONSENTS='{"ENQUIRY_CONTACT_WORDING":["2026-09-24-enquiry-1"],"WEBSITE_TERMS":["2026-09-24-website-1"],"APPLICATION_TERMS":["2026-09-24-fact-find-1"],"USE_OF_FUNDS_DECLARATION":["2026-09-25-use-of-funds-1"]}'
MSYS_NO_PATHCONV=1 docker run -d --name p2d-e2e-api -p 127.0.0.1:8099:8099 -w /src -v "$API_DIR:/src:ro" -v "$E:/e2e" \
  -e P2D_PUBLIC_INTAKE_E2E=synthetic-only -e "P2D_PUBLIC_INTAKE_E2E_DSN=mysql:host=$IP;port=3306;dbname=p2d_public_intake_e2e;charset=utf8mb4" \
  -e P2D_PUBLIC_INTAKE_E2E_PASS=p2d-local-test -e P2D_E2E_OUTBOX=/e2e/outbox.jsonl \
  -e P2D_PUBLIC_INTAKE_ENABLED=1 -e P2D_PUBLIC_INTAKE_ORIGINS=http://localhost:8788 \
  -e P2D_PUBLIC_INTAKE_KEY=e2e-hmac-key-0123456789-0123456789-abcdef \
  -e P2D_PUBLIC_INTAKE_RESUME_URL=https://www.pay2day.co.uk/fact-find.html -e "P2D_PUBLIC_INTAKE_CONSENTS=$CONSENTS" \
  -e P2D_PUBLIC_INTAKE_IMPORT_ENABLED=1 -e P2D_PUBLIC_INTAKE_OWNER_USER_ID=1 -e P2D_PUBLIC_INTAKE_PROXY_SECRET=$SECRET \
  "$PHP_IMAGE" php -d display_errors=0 -S 0.0.0.0:8099 tests/support/public_intake_e2e_router.php >/dev/null
for i in $(seq 1 50); do curl -s -o /dev/null http://127.0.0.1:8099/ && break; sleep 0.2; done
docker exec p2d-e2e-api php tests/support/public_intake_e2e_router.php --setup
direct=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8099/api/intake/v1/session)
echo "direct API call without the proxy secret: HTTP $direct (expected 404)"; [ "$direct" = 404 ]
cd "$W"
PAY2DAY_INTAKE_READY=yes PAY2DAY_TURNSTILE_SITE_KEY=1x00000000000000000000AA node build.mjs --production --live
E2E_API=http://127.0.0.1:8099 E2E_SECRET=$SECRET E2E_OUTBOX="$E/outbox.jsonl" \
E2E_INSPECT="docker exec p2d-e2e-api php tests/support/public_intake_e2e_router.php --inspect" \
node tests/e2e/intake-journey.mjs; rc=$?
docker logs p2d-e2e-api 2>&1 | grep -iE "fatal|warning|error" | head -5 || true
docker rm -f p2d-e2e-api >/dev/null
exit $rc
