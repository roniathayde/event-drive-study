#!/usr/bin/env bash
set -euo pipefail

# Diretório raiz do projeto (pasta acima deste script, que fica em scripts/)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ---- Postgres (ecommerce) ----
POSTGRES_CONTAINER="ecommerce-postgres"
POSTGRES_USER="postgres"
POSTGRES_DB="ecommerce"

clean_postgres_tables() {
  if ! command -v docker &>/dev/null; then
    echo "Docker não encontrado — pulando limpeza do Postgres."
    return
  fi

  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${POSTGRES_CONTAINER}$"; then
    echo "Container '${POSTGRES_CONTAINER}' não está rodando — pulando limpeza do Postgres."
    return
  fi

  docker exec "${POSTGRES_CONTAINER}" psql \
    --username "${POSTGRES_USER}" \
    --dbname "${POSTGRES_DB}" \
    --command "TRUNCATE TABLE orders, order_saga, inbox, outbox RESTART IDENTITY CASCADE;"

  echo "Tabelas do Postgres (${POSTGRES_DB}) truncadas."
}

clean_postgres_tables

# ---- SQLite (.db files) ----
echo ""
echo "Procurando arquivos .db em $ROOT_DIR..."

db_files=$(find "$ROOT_DIR" -name "*.db" -not -path "*/node_modules/*")

if [ -z "$db_files" ]; then
  echo "Nenhum arquivo .db encontrado."
  exit 0
fi

echo "$db_files" | while read -r file; do
  rm -f "$file"
  echo "Removido: $file"
done

echo "Concluído."
