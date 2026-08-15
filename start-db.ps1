# Script de Inicialização do Banco de Dados PostgreSQL e Seed - UniFAP Estoque
Write-Host "🚀 Iniciando container PostgreSQL..." -ForegroundColor Cyan
docker compose up -d

Write-Host "⏳ Aguardando banco de dados ficar pronto..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "📦 Criando tabelas no PostgreSQL (Prisma DB Push)..." -ForegroundColor Cyan
npx prisma db push

Write-Host "🌱 Executando carga inicial de dados (Seed)..." -ForegroundColor Green
npm run prisma:seed

Write-Host "✅ Banco de dados PostgreSQL configurado e alimentado com sucesso!" -ForegroundColor Green
