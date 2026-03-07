# ============================================================
# Quick Fix Script for Render Deployment (PowerShell)
# ============================================================

Write-Host "🔧 Applying MIME type fixes..." -ForegroundColor Cyan

# Ensure _headers file exists
if (-not (Test-Path "_headers")) {
    Write-Host "❌ _headers file not found!" -ForegroundColor Red
    exit 1
}

# Ensure render.yaml is updated
$renderContent = Get-Content "render.yaml" -Raw
if ($renderContent -notmatch "Content-Type.*text/css") {
    Write-Host "⚠️  render.yaml might need updating" -ForegroundColor Yellow
}

# Commit and push
Write-Host "📦 Committing fixes..." -ForegroundColor Yellow
git add .
git commit -m "fix: MIME type configuration for Render deployment"

Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "✅ Changes pushed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Go to Render Dashboard: https://dashboard.render.com"
Write-Host "  2. Find your 'omams-portal' service"
Write-Host "  3. Click 'Manual Deploy' → 'Deploy latest commit'"
Write-Host "  4. Wait for deployment (2-3 minutes)"
Write-Host "  5. Clear browser cache (Ctrl+Shift+Delete)"
Write-Host "  6. Test your site"
Write-Host ""
Write-Host "If issues persist, see: RENDER_MIME_FIX.md" -ForegroundColor Yellow
Write-Host ""
