#!/usr/bin/env bash
# Publica la app de finanzas en el servidor.
#
#   ./deploy.sh          -> web + api
#   ./deploy.sh web      -> solo el frontend
#   ./deploy.sh api      -> solo el backend
#
# El web se sirve desde disco (nginx lee el bind mount), así que solo hay que
# vaciar el directorio y descomprimir. La API corre en una imagen Docker que se
# reconstruye en el servidor: ARM64 nativo, sin emulación.
#
# shortcut: el backend se sube como código y se compila allá; si algún día el
# build tarda demasiado, conviene publicar la imagen desde CI y bajar solo el tag.
set -euo pipefail

HOST="ubuntu@141.148.159.101"
KEY="${DEPLOY_KEY:-/c/Users/Fernando/Downloads/Otros/ssh-key-2026-07-29.key}"
SSH="ssh -i $KEY -o StrictHostKeyChecking=no"
WEB_REMOTE="/home/ubuntu/apps/infra/web-finanzas/dist"
API_BUILD="/tmp/finanzas-api-build"
INFRA="/home/ubuntu/apps/infra"

QUE="${1:-todo}"
case "$QUE" in
  todo) HACER_WEB=1; HACER_API=1 ;;
  web)  HACER_WEB=1; HACER_API=0 ;;
  api)  HACER_WEB=0; HACER_API=1 ;;
  *) echo "uso: $0 [todo|web|api]"; exit 1 ;;
esac

cd "$(dirname "$0")"

if [ "$HACER_WEB" = 1 ]; then
  # Sin VITE_API_URL el bundle cae al fallback http://localhost:5063 y el
  # login falla desde cualquier dispositivo que no sea el servidor.
  VITE_API_URL="${VITE_API_URL:-https://api.ferthl.duckdns.org}"
  export VITE_API_URL

  echo "==> Compilando web (VITE_API_URL=$VITE_API_URL)"
  pnpm --filter web build >/dev/null

  if ! grep -RqF "$VITE_API_URL" apps/web/dist/assets; then
    echo "ERROR: el bundle web no contiene VITE_API_URL=$VITE_API_URL"
    exit 1
  fi

  echo "==> Subiendo web"
  TMP_WEB="/tmp/finanzas-web-$$.tgz"
  tar -czf "$TMP_WEB" -C apps/web/dist .
  LOCAL_HASH=$(sha256sum "$TMP_WEB" | cut -d' ' -f1)
  scp -i "$KEY" -o StrictHostKeyChecking=no "$TMP_WEB" "$HOST:/tmp/web.tgz"
  REMOTE_HASH=$($SSH "$HOST" "sha256sum /tmp/web.tgz | cut -d' ' -f1")

  if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
    echo "ERROR: el archivo subido no coincide (local $LOCAL_HASH vs remoto $REMOTE_HASH)"
    exit 1
  fi

  # Vaciado, no borrado: recrear el directorio rompe el bind mount de Docker.
  $SSH "$HOST" "rm -rf $WEB_REMOTE/* && tar -xzf /tmp/web.tgz -C $WEB_REMOTE && rm -f /tmp/web.tgz"
  rm -f "$TMP_WEB"
  echo "OK web"
fi

if [ "$HACER_API" = 1 ]; then
  echo "==> Subiendo backend"
  TMP_API="/tmp/finanzas-api-src-$$.tgz"
  tar -czf "$TMP_API" \
    --exclude='*/obj' --exclude='*/bin' --exclude='.git' \
    -C ../FinancialApp-backend .
  scp -i "$KEY" -o StrictHostKeyChecking=no "$TMP_API" "$HOST:/tmp/api.tgz"

  echo "==> Reconstruyendo imagen (ARM64, puede tardar)"
  $SSH "$HOST" "rm -rf $API_BUILD && mkdir -p $API_BUILD && \
    tar -xzf /tmp/api.tgz -C $API_BUILD && rm -f /tmp/api.tgz && \
    cd $API_BUILD && docker build -q -t finanzas-api:local . && \
    cd $INFRA && docker compose up -d api_finanzas"

  rm -f "$TMP_API"
  echo "OK api"
fi

echo "==> Estado"
$SSH "$HOST" "docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'api_finanzas|web_finanzas' || true"

echo "==> Verificando desde internet"
curl -s -o /dev/null -w "app  -> %{http_code}\n" -m 25 https://app.ferthl.duckdns.org/
curl -s -o /dev/null -w "api  -> %{http_code}\n" -m 25 https://api.ferthl.duckdns.org/api/savings/balance
echo "==> Listo"
