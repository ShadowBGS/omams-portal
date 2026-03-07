#!/usr/bin/env bash

# ============================================================
# OMAMS Security Verification Script
# ============================================================
# Run this before pushing to GitHub to verify no secrets exposed

echo "🔍 OMAMS Web Portal - Security Check"
echo "======================================"
echo ""

ISSUES_FOUND=0

# Check 1: Verify .gitignore exists
echo "✓ Checking .gitignore..."
if [ ! -f ".gitignore" ]; then
  echo "❌ ERROR: .gitignore not found!"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo "   ✅ .gitignore exists"
fi

# Check 2: Look for common secret patterns
echo ""
echo "✓ Scanning for exposed secrets..."
SECRETS_FOUND=0

# Check for localhost hardcoding in main files (should use config)
if grep -n "localhost:8000" app.js | grep -v "config.js" | grep -v "//"; then
  echo "   ⚠️  Warning: Found hardcoded localhost in app.js"
  echo "      This should be using CONFIG.apiBaseUrl instead"
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

# Check for real secrets (passwords, private keys, etc.)
if grep -rn "password.*=.*['\"][^'\"]*['\"]" . --exclude-dir=.git --exclude="*.md" --exclude="security-check.sh"; then
  echo "   ⚠️  Warning: Found potential hardcoded password"
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

if grep -rn "secret.*=.*['\"][^'\"]*['\"]" . --exclude-dir=.git --exclude="*.md" --exclude="security-check.sh"; then
  echo "   ⚠️  Warning: Found potential hardcoded secret"
  SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

# Check for service account keys
if ls -la | grep -i "serviceAccountKey"; then
  echo "   ❌ ERROR: Found serviceAccountKey file - DO NOT COMMIT!"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ $SECRETS_FOUND -eq 0 ]; then
  echo "   ✅ No obvious secrets found"
fi

# Check 3: Verify config.js exists
echo ""
echo "✓ Checking configuration files..."
if [ ! -f "config.js" ]; then
  echo "❌ ERROR: config.js not found!"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo "   ✅ config.js exists"
  
  # Verify it uses environment detection
  if grep -q "window.location.hostname" config.js; then
    echo "   ✅ Environment detection configured"
  else
    echo "   ⚠️  Warning: Environment detection might not be configured"
  fi
fi

# Check 4: Verify render.yaml exists
echo ""
echo "✓ Checking Render deployment files..."
if [ ! -f "render.yaml" ]; then
  echo "⚠️  Warning: render.yaml not found (needed for Render deployment)"
else
  echo "   ✅ render.yaml exists"
fi

if [ ! -f "render-build.sh" ]; then
  echo "⚠️  Warning: render-build.sh not found"
else
  echo "   ✅ render-build.sh exists"
  
  # Check if it's executable
  if [ -x "render-build.sh" ]; then
    echo "   ✅ render-build.sh is executable"
  else
    echo "   ⚠️  Warning: render-build.sh is not executable"
    echo "      Run: chmod +x render-build.sh"
  fi
fi

# Check 5: Verify index.html loads config before app
echo ""
echo "✓ Checking script load order in index.html..."
if grep -q "config.js.*app.js" index.html; then
  echo "   ✅ config.js loaded before app.js"
else
  echo "   ⚠️  Warning: Verify config.js is loaded before app.js in index.html"
fi

# Check 6: Look for TODO or FIXME comments
echo ""
echo "✓ Checking for TODO/FIXME comments..."
TODO_COUNT=$(grep -rn "TODO\|FIXME" . --exclude-dir=.git --exclude="*.md" --exclude="security-check.sh" | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
  echo "   ℹ️  Found $TODO_COUNT TODO/FIXME comments (review before production)"
  grep -rn "TODO\|FIXME" . --exclude-dir=.git --exclude="*.md" --exclude="security-check.sh" | head -5
else
  echo "   ✅ No TODO/FIXME comments found"
fi

# Check 7: Verify no .env files are present (or they're in .gitignore)
echo ""
echo "✓ Checking for .env files..."
if ls -la | grep "\.env"; then
  echo "   ⚠️  Warning: Found .env files - ensure they're in .gitignore!"
  if grep -q "\.env" .gitignore; then
    echo "   ✅ .env is in .gitignore"
  else
    echo "   ❌ ERROR: .env not in .gitignore!"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  fi
else
  echo "   ✅ No .env files found"
fi

# Summary
echo ""
echo "======================================"
if [ $ISSUES_FOUND -eq 0 ]; then
  echo "✅ All checks passed! Safe to push to GitHub."
  echo ""
  echo "Next steps:"
  echo "  1. git add ."
  echo "  2. git commit -m 'feat: production-ready portal'"
  echo "  3. git push origin main"
  echo "  4. Deploy to Render (see RENDER_DEPLOYMENT.md)"
else
  echo "❌ Found $ISSUES_FOUND issue(s) - Fix before pushing!"
  echo ""
  echo "Review the warnings above and fix before committing."
  exit 1
fi

echo ""
echo "📚 Documentation:"
echo "   • Security: SECURITY.md"
echo "   • Deployment: RENDER_DEPLOYMENT.md"
echo "   • Environment: ENVIRONMENT_SETUP.md"
echo ""
