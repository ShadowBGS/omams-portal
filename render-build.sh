#!/usr/bin/env bash

# ============================================================
# OMAMS Web Portal - Render Deployment Script
# ============================================================
# This script prepares the app for Render.com deployment

set -e  # Exit on error

echo "🚀 Preparing OMAMS Web Portal for deployment..."

# Check if running on Render
if [ -z "$RENDER" ]; then
  echo "⚠️  Warning: Not running on Render. This script is meant for Render deployment."
fi

# 1. Verify required environment variables
echo "✓ Checking environment variables..."
if [ -z "$API_URL" ]; then
  echo "❌ ERROR: API_URL environment variable not set!"
  echo "   Set it in Render dashboard: Environment > Environment Variables"
  exit 1
fi

echo "   API_URL: $API_URL"

# 2. Create production configuration
echo "✓ Creating production config..."
cat > config.production.js << EOF
// Auto-generated production config - DO NOT COMMIT
window.ENV = {
  API_URL: '$API_URL',
};
EOF

# 3. Inject CSP and security headers (for reference - actual setup in render.yaml)
echo "✓ Security headers will be set via render.yaml"

# 4. Create a simple health check endpoint
echo "✓ Creating health check..."
echo "OK" > health.txt

echo "✅ Deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Ensure API_URL is set in Render Environment Variables"
echo "   2. Add your backend domain to Firebase authorized domains"
echo "   3. Update backend CORS to allow your Render domain"
echo ""
