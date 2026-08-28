#!/bin/bash
# ==============================================================================
# Script de Backup Automatizado do PostgreSQL (pgvector) - UniFAP Estoque
# ==============================================================================
set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="unifap_estoque_backup_${TIMESTAMP}.sql.gz"
TARGET_PATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Iniciando rotina de backup do banco de dados..."

if [ -n "$DATABASE_URL" ]; then
  pg_dump "$DATABASE_URL" | gzip > "${TARGET_PATH}"
else
  PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-estoque_multimidia}" | gzip > "${TARGET_PATH}"
fi

FILESIZE=$(du -h "${TARGET_PATH}" | cut -f1)
echo "[$(date)] Backup concluído com sucesso: ${TARGET_PATH} (${FILESIZE})"

# Limpeza de backups antigos conforme política de retenção
echo "[$(date)] Aplicando política de retenção (${RETENTION_DAYS} dias)..."
find "${BACKUP_DIR}" -type f -name "unifap_estoque_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm -f {} \;
echo "[$(date)] Rotina de manutenção finalizada."
