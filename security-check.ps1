# ============================================================
# OMAMS Security Verification Script (PowerShell)
# ============================================================
# Run this before pushing to GitHub to verify no secrets exposed

Write-Host "🔍 OMAMS Web Portal - Security Check" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$issuesFound = 0

# Check 1: Verify .gitignore exists
Write-Host "✓ Checking .gitignore..." -ForegroundColor Yellow
if (-not (Test-Path ".gitignore")) {
    Write-Host "   ❌ ERROR: .gitignore not found!" -ForegroundColor Red
    $issuesFound++
} else {
    Write-Host "   ✅ .gitignore exists" -ForegroundColor Green
}

# Check 2: Look for common secret patterns
Write-Host ""
Write-Host "✓ Scanning for exposed secrets..." -ForegroundColor Yellow
$secretsFound = 0

# Check for hardcoded localhost in app.js (should use config)
$localhostMatches = Select-String -Path "app.js" -Pattern "localhost:8000" -ErrorAction SilentlyContinue
if ($localhostMatches -and ($localhostMatches | Where-Object { $_.Line -notmatch "//" })) {
    Write-Host "   ⚠️  Warning: Found hardcoded localhost in app.js" -ForegroundColor Yellow
    Write-Host "      This should be using CONFIG.apiBaseUrl instead"
    $secretsFound++
}

# Check for service account keys
if (Test-Path "*serviceAccountKey*") {
    Write-Host "   ❌ ERROR: Found serviceAccountKey file - DO NOT COMMIT!" -ForegroundColor Red
    $issuesFound++
}

if ($secretsFound -eq 0) {
    Write-Host "   ✅ No obvious secrets found" -ForegroundColor Green
}

# Check 3: Verify config.js exists
Write-Host ""
Write-Host "✓ Checking configuration files..." -ForegroundColor Yellow
if (-not (Test-Path "config.js")) {
    Write-Host "   ❌ ERROR: config.js not found!" -ForegroundColor Red
    $issuesFound++
} else {
    Write-Host "   ✅ config.js exists" -ForegroundColor Green
    
    # Verify it uses environment detection
    $configContent = Get-Content "config.js" -Raw
    if ($configContent -match "window\.location\.hostname") {
        Write-Host "   ✅ Environment detection configured" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Warning: Environment detection might not be configured" -ForegroundColor Yellow
    }
}

# Check 4: Verify render.yaml exists
Write-Host ""
Write-Host "✓ Checking Render deployment files..." -ForegroundColor Yellow
if (-not (Test-Path "render.yaml")) {
    Write-Host "   ⚠️  Warning: render.yaml not found (needed for Render deployment)" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ render.yaml exists" -ForegroundColor Green
}

if (-not (Test-Path "render-build.sh")) {
    Write-Host "   ⚠️  Warning: render-build.sh not found" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ render-build.sh exists" -ForegroundColor Green
}

# Check 5: Verify index.html loads config before app
Write-Host ""
Write-Host "✓ Checking script load order in index.html..." -ForegroundColor Yellow
$htmlContent = Get-Content "index.html" -Raw
if ($htmlContent -match "config\.js.*app\.js") {
    Write-Host "   ✅ config.js loaded before app.js" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Warning: Verify config.js is loaded before app.js in index.html" -ForegroundColor Yellow
}

# Check 6: Look for TODO or FIXME comments
Write-Host ""
Write-Host "✓ Checking for TODO/FIXME comments..." -ForegroundColor Yellow
$todoMatches = Select-String -Path "*.js","*.html","*.css" -Pattern "TODO|FIXME" -ErrorAction SilentlyContinue
$todoCount = ($todoMatches | Measure-Object).Count
if ($todoCount -gt 0) {
    Write-Host "   ℹ️  Found $todoCount TODO/FIXME comments (review before production)" -ForegroundColor Cyan
    $todoMatches | Select-Object -First 5 | ForEach-Object {
        Write-Host "      $($_.Filename):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor Gray
    }
} else {
    Write-Host "   ✅ No TODO/FIXME comments found" -ForegroundColor Green
}

# Check 7: Verify no .env files are present (or they're in .gitignore)
Write-Host ""
Write-Host "✓ Checking for .env files..." -ForegroundColor Yellow
$envFiles = Get-ChildItem -Filter ".env*" -ErrorAction SilentlyContinue
if ($envFiles) {
    Write-Host "   ⚠️  Warning: Found .env files - ensure they're in .gitignore!" -ForegroundColor Yellow
    $gitignoreContent = Get-Content ".gitignore" -Raw -ErrorAction SilentlyContinue
    if ($gitignoreContent -match "\.env") {
        Write-Host "   ✅ .env is in .gitignore" -ForegroundColor Green
    } else {
        Write-Host "   ❌ ERROR: .env not in .gitignore!" -ForegroundColor Red
        $issuesFound++
    }
} else {
    Write-Host "   ✅ No .env files found" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
if ($issuesFound -eq 0) {
    Write-Host "✅ All checks passed! Safe to push to GitHub." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. git add ."
    Write-Host "  2. git commit -m 'feat: production-ready portal'"
    Write-Host "  3. git push origin main"
    Write-Host "  4. Deploy to Render (see RENDER_DEPLOYMENT.md)"
} else {
    Write-Host "❌ Found $issuesFound issue(s) - Fix before pushing!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Review the warnings above and fix before committing."
    exit 1
}

Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   • Security: SECURITY.md"
Write-Host "   • Deployment: RENDER_DEPLOYMENT.md"
Write-Host "   • Environment: ENVIRONMENT_SETUP.md"
Write-Host ""
