# ==============================================================================
# Script de Validação e Teste de Restauração de Backup (Restore Test Verification)
# UniFAP Estoque & Multimídia (PowerShell)
# ==============================================================================
[CmdletBinding()]
param(
    [string]$DbUser = "postgres",
    [string]$DbPass = "postgrespassword",
    [string]$DbName = "estoque_multimidia",
    [string]$DbHost = "127.0.0.1",
    [string]$DbPort = "5432"
)

$ErrorActionPreference = "Stop"

if (Test-Path ".env") {
    Get-Content ".env" | Where-Object { $_ -notmatch '^\s*#' -and $_ -match '=' } | ForEach-Object {
        $key, $value = $_ -split '=', 2
        if ($key -eq "POSTGRES_USER") { $DbUser = $value.Trim() }
        if ($key -eq "POSTGRES_PASSWORD") { $DbPass = $value.Trim() }
        if ($key -eq "POSTGRES_DB") { $DbName = $value.Trim() }
    }
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$TestDbName = "unifap_restore_test_$Timestamp"
$TempDump = "$env:TEMP\unifap_test_dump_$Timestamp.sql"

$env:PGPASSWORD = $DbPass

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " [RESTORE TEST] Iniciando Teste de Validação de Backup & Restore" -ForegroundColor Cyan
Write-Host " Banco de Origem: $DbName @ ${DbHost}:${DbPort}" -ForegroundColor Gray
Write-Host " Banco Temporário de Teste: $TestDbName" -ForegroundColor Gray
Write-Host "=================================================================" -ForegroundColor Cyan

try {
    Write-Host "[1/4] Gerando dump de teste..." -ForegroundColor Yellow
    & pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName --clean --if-exists --no-owner --no-privileges -f $TempDump
    if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar dump do PostgreSQL." }
    Write-Host " Dump gerado com sucesso!" -ForegroundColor Green

    Write-Host "[2/4] Criando banco temporário de validação: $TestDbName..." -ForegroundColor Yellow
    & psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE `"$TestDbName`";"
    if ($LASTEXITCODE -ne 0) { throw "Falha ao criar banco de teste." }

    Write-Host "[3/4] Restaurando dump no banco temporário..." -ForegroundColor Yellow
    & psql -h $DbHost -p $DbPort -U $DbUser -d $TestDbName -f $TempDump | Out-Null
    Write-Host " Restauração executada!" -ForegroundColor Green

    Write-Host "[4/4] Executando consultas de validação de integridade..." -ForegroundColor Yellow
    $TableCount = & psql -h $DbHost -p $DbPort -U $DbUser -d $TestDbName -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
    Write-Host " Total de tabelas restauradas: $($TableCount.Trim())" -ForegroundColor Green

    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host " TESTE DE RESTAURAÇÃO CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "=================================================================" -ForegroundColor Cyan
}
catch {
    Write-Host " ERRO NO TESTE DE RESTAURAÇÃO: $_" -ForegroundColor Red
}
finally {
    Write-Host "--- Limpando recursos temporários ---" -ForegroundColor Gray
    if (Test-Path $TempDump) { Remove-Item -Force $TempDump }
    & psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS `"$TestDbName`";" 2>$null
}
