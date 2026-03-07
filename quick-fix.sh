#!/usr/bin/env bash

# ============================================================
# Quick Fix Script for Render Deployment
# ============================================================

echo "🔧 Applying MIME type fixes..."

# Ensure _headers file exists
if [ ! -f "_headers" ]; then
  echo "❌ _headers file not found!"
  exit 1
fi

# Ensure render.yaml is updated
if ! grep -q "Content-Type: text/css" render.yaml; then
  echo "⚠️  render.yaml might need updating"
fi

# Commit and push
echo "📦 Committing fixes..."
git add .
git commit -m "fix: MIME type configuration for Render deployment"

echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Changes pushed!"
echo ""
echo "📋 Next steps:"
echo "  1. Go to Render Dashboard: https://dashboard.render.com"
echo "  2. Find your 'omams-portal' service"
echo "  3. Click 'Manual Deploy' → 'Deploy latest commit'"
echo "  4. Wait for deployment (2-3 minutes)"
echo "  5. Clear browser cache (Ctrl+Shift+Delete)"
echo "  6. Test your site"
echo ""
echo "If issues persist, see: RENDER_MIME_FIX.md"
echo ""
