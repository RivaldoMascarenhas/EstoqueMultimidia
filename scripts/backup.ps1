# ==============================================================================
# Script de Backup Automatizado do PostgreSQL (pgvector) - PowerShell
# ==============================================================================
param (
    [string]$BackupDir = "./backups",
    [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$FileName = "unifap_estoque_backup_$Timestamp.sql"
$TargetDir = Resolve-Path -Path $BackupDir -ErrorAction SilentlyContinue

if (-not $TargetDir) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    $TargetDir = Resolve-Path -Path $BackupDir
}

$TargetPath = Join-Path -Path $TargetDir -ChildPath $FileName

Write-Host "[$((Get-Date).ToString())] Iniciando backup via Docker unifap-postgres..." -ForegroundColor Cyan

docker exec unifap-postgres pg_dump -U postgres estoque_multimidia > $TargetPath

if (Test-Path $TargetPath) {
    $Item = Get-Item $TargetPath
    Write-Host "[$((Get-Date).ToString())] Backup concluído com sucesso: $TargetPath ($([math]::Round($Item.Length / 1MB, 2)) MB)" -ForegroundColor Green
} else {
    Write-Error "Falha ao gerar o arquivo de backup."
}

# Limpeza de backups antigos
Write-Host "[$((Get-Date).ToString())] Aplicando política de retenção ($RetentionDays dias)..." -ForegroundColor Yellow
$CutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $TargetDir -Filter "unifap_estoque_backup_*.sql" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | Remove-Item -Force

Write-Host "[$((Get-Date).ToString())] Rotina finalizada." -ForegroundColor Cyan
