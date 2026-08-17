#!/usr/bin/env bash
set -euo pipefail

# Configura variáveis de segurança obrigatórias no Railway (produção).
# Uso:
#   source "$HOME/.railway/env"
#   ./scripts/configure-railway-production-security.sh
#
# Opcional: CRON_SECRET=<valor> para reutilizar um secret existente.

source "${HOME}/.railway/env" 2>/dev/null || true

if ! command -v railway >/dev/null 2>&1; then
  echo "Railway CLI não encontrado. Instale com: bash <(curl -fsSL https://railway.com/install.sh)"
  exit 1
fi

if ! railway whoami >/dev/null 2>&1; then
  echo "Não autenticado no Railway. Execute: railway login"
  exit 1
fi

CRON_SECRET_VALUE="${CRON_SECRET:-$(openssl rand -hex 32)}"

echo "==> Projeto/serviço atual:"
railway status --json || railway status

echo ""
echo "==> Definindo variáveis de segurança no serviço da API..."

railway variable set \
  "CRON_SECRET=${CRON_SECRET_VALUE}" \
  "RECOVERY_SHOW_CODE=false" \
  "NODE_ENV=production"

echo ""
echo "==> Variáveis configuradas:"
railway variable list --json | python3 - <<'PY'
import json, sys
data = json.load(sys.stdin)
keys = {"CRON_SECRET", "RECOVERY_SHOW_CODE", "NODE_ENV"}
for item in data:
    if isinstance(item, dict) and item.get("name") in keys:
        name = item["name"]
        value = item.get("value", "***")
        if name == "CRON_SECRET":
            value = "***" if value else value
        print(f"  {name}={value}")
PY

echo ""
echo "Próximo passo: redeploy do serviço para aplicar as variáveis."
echo "  railway redeploy --yes"
echo ""
echo "Guarde o CRON_SECRET em local seguro (gerenciador de senhas)."
