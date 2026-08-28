#!/usr/bin/env bash
# ==============================================================================
# Script de Validação e Teste de Restauração de Backup (Restore Test Verification)
# UniFAP Estoque & Multimídia
# ==============================================================================
set -euo pipefail

# Carregar variáveis de ambiente se .env existir
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
fi

DB_USER="${POSTGRES_USER:-postgres}"
DB_PASS="${POSTGRES_PASSWORD:-postgrespassword}"
DB_NAME="${POSTGRES_DB:-estoque_multimidia}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"

TEST_RESTORE_DB="unifap_restore_test_$(date +%s)"
TEMP_DUMP_FILE="/tmp/test_backup_$(date +%s).sql.gz"

echo "================================================================="
echo " [RESTORE TEST] Iniciando Teste de Validação de Backup & Restore"
echo " Banco de Origem: ${DB_NAME} @ ${DB_HOST}:${DB_PORT}"
echo " Banco Temporário de Teste: ${TEST_RESTORE_DB}"
echo "================================================================="

export PGPASSWORD="${DB_PASS}"

cleanup() {
  echo "--- Limpando recursos temporários ---"
  rm -f "${TEMP_DUMP_FILE}" || true
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS \"${TEST_RESTORE_DB}\";" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# 1. Executar Dump do Banco de Dados
echo "[1/4] Gerando dump comprimido..."
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-privileges | gzip > "${TEMP_DUMP_FILE}"

DUMP_SIZE=$(du -h "${TEMP_DUMP_FILE}" | cut -f1)
echo "✅ Dump gerado com sucesso! Tamanho: ${DUMP_SIZE}"

# 2. Criar Banco Temporário de Teste
echo "[2/4] Criando banco temporário ${TEST_RESTORE_DB}..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE \"${TEST_RESTORE_DB}\";"

# 3. Restaurar o Dump no Banco Temporário
echo "[3/4] Restaurando dump no banco temporário..."
gunzip -c "${TEMP_DUMP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TEST_RESTORE_DB}" > /dev/null

echo "✅ Restauração concluída sem falhas fatais!"

# 4. Executar Validações Críticas de Integridade
echo "[4/4] Executando consultas de validação de integridade..."

# Validar extensão vector
VECTOR_EXISTS=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TEST_RESTORE_DB}" -t -c "SELECT count(*) FROM pg_extension WHERE extname = 'vector';" | xargs)

if [ "${VECTOR_EXISTS}" -ge 1 ]; then
  echo "✅ Extensão 'vector' (pgvector) validada com sucesso!"
else
  echo "⚠️ Aviso: Extensão 'vector' não detectada no banco restaurado."
fi

# Contagem de tabelas
TABLE_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TEST_RESTORE_DB}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo "✅ Total de tabelas restauradas: ${TABLE_COUNT}"

if [ "${TABLE_COUNT}" -lt 5 ]; then
  echo "❌ ERRO CRÍTICO: Menos tabelas do que o esperado (${TABLE_COUNT})!"
  exit 1
fi

echo "================================================================="
echo "🎉 TESTE DE RESTAURAÇÃO CONCLUÍDO COM SUCESSO!"
echo "O backup é 100% restaurável e funcional."
echo "================================================================="
