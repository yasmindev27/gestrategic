#!/usr/bin/env pwsh

<#
.SYNOPSIS
Script para preparar environment local com novas credenciais Supabase
Executar: .\setup-new-env.ps1

.DESCRIPTION
Este script facilita a transição para novo banco de dados Supabase
Copia valores do novo projeto para .env local (sem fazer commit)
#>

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 SETUP - Novo Banco de Dados Supabase + Vercel" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar se .env já existe
if (Test-Path .env) {
    Write-Host "⚠️  .env já existe. Backup para .env.backup" -ForegroundColor Yellow
    Copy-Item .env .env.backup
    Write-Host "✅ Backup criado: .env.backup" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Criando novo .env" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "PASSO 1: Inforamações do Novo Projeto Supabase" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

$projectId = Read-Host "📍 Novo Project ID do Supabase (ex: abcdefghijklmnop)"
$supabaseUrl = Read-Host "🔗 Nova Supabase URL (ex: https://xxxx.supabase.co)"
$publishableKey = Read-Host "🔑 Nova Publishable Key (Anon Key)"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "PASSO 2: Criar novo .env" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

$envContent = @"
VITE_SUPABASE_PROJECT_ID="$projectId"
VITE_SUPABASE_PUBLISHABLE_KEY="$publishableKey"
VITE_SUPABASE_URL="$supabaseUrl"

# SERVICE_ROLE_KEY: NÃO incluir aqui!
# Use Vercel environment variables para produção
# Use apenas no .env.local se precisar debug local (muito cuidado!)
"@

Set-Content .env $envContent

Write-Host "✅ .env criado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Conteúdo:" -ForegroundColor Cyan
Write-Host $envContent -ForegroundColor Gray
Write-Host ""

# Verificar .gitignore
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "PASSO 3: Verificar .gitignore" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

$gitignoreContent = Get-Content .gitignore -Raw

if ($gitignoreContent -match "\.env") {
    Write-Host "✅ .env está em .gitignore (seguro!)" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env NÃO está em .gitignore! Adicionando..." -ForegroundColor Yellow
    Add-Content .gitignore "`n# Environment variables`n.env`n.env.local`n.env.*.local"
    Write-Host "✅ .env adicionado a .gitignore" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "PASSO 4: Próximas Ações" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "1️⃣  Iniciar servidor local:" -ForegroundColor Green
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  Testar no browser:" -ForegroundColor Green
Write-Host "   http://localhost:8080" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Testar login:" -ForegroundColor Green
Write-Host "   ✓ Página carrega?" -ForegroundColor Gray
Write-Host "   ✓ Pode fazer login?" -ForegroundColor Gray
Write-Host "   ✓ Dados carregam?" -ForegroundColor Gray
Write-Host ""

Write-Host "4️⃣  Adicionar environment variables no Vercel:" -ForegroundColor Green
Write-Host "   https://vercel.com → seu projeto → Settings → Environment Variables" -ForegroundColor Gray
Write-Host "   Adicionar: VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY" -ForegroundColor Gray
Write-Host ""

Write-Host "5️⃣  Redeploy no Vercel:" -ForegroundColor Green
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host "   (Vercel vai fazer redeploy automaticamente)" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Setup completo! Prossiga com os passos acima." -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
