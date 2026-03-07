# Environment Configuration for Render.com

## Setup Instructions

### 1. Set Environment Variables in Render Dashboard

Go to: Dashboard → Your Static Site → Environment

Add these variables:

| Variable | Example Value | Required | Description |
|----------|--------------|----------|-------------|
| `API_URL` | `https://omams-backend.onrender.com` | ✅ Yes | Your backend API URL (no trailing slash) |
| `NODE_ENV` | `production` | ✅ Yes | Environment mode |

### 2. How It Works

The portal automatically detects the environment:

```javascript
// Development (localhost)
API_URL = 'http://localhost:8000'

// Production (Render or any domain)
API_URL = window.ENV.API_URL  // From environment variable
```

### 3. Local Development

No environment variables needed! The portal auto-detects localhost and uses `http://localhost:8000`.

To test production mode locally:

```html
<!-- Add before config.js in index.html -->
<script>
  window.ENV = {
    API_URL: 'https://your-backend.onrender.com'
  };
</script>
```

### 4. Production Override (Advanced)

If you need to override config without environment variables:

Create `config.production.js`:

```javascript
// config.production.js (add to .gitignore if it contains secrets)
window.PRODUCTION_CONFIG = {
  apiBaseUrl: 'https://your-backend.onrender.com',
};
```

Then load it in `index.html` after `config.js`:

```html
<script src="config.js"></script>
<script src="config.production.js"></script>  <!-- Optional override -->
<script src="app.js"></script>
```

## Render Build Process

The `render-build.sh` script runs during deployment:

1. ✅ Checks that `API_URL` environment variable is set
2. ✅ Creates `config.production.js` with the API_URL
3. ✅ Ready for deployment

## Troubleshooting

### Issue: "API_URL environment variable not set"

**Cause:** You forgot to add API_URL in Render environment variables.

**Fix:**
1. Go to Render Dashboard → Your Static Site → Environment
2. Add variable: `API_URL` = `https://your-backend.onrender.com`
3. Save and redeploy

### Issue: "Cannot connect to backend"

**Check:**
```bash
# Test backend is accessible
curl https://your-backend.onrender.com/health

# Should return: {"status":"healthy"}
```

**Fix:**
1. Ensure backend is deployed and running
2. Check `API_URL` has correct URL (no typos!)
3. Verify backend CORS allows your frontend domain

### Issue: Works locally but not in production

**Common Causes:**
- Backend CORS not configured for production domain
- Firebase authorized domains missing production URL
- Typo in API_URL environment variable

**Fix:**
1. Check browser console for specific error
2. Verify all domains are configured:
   - Backend CORS: includes frontend URL
   - Firebase: includes frontend domain in authorized domains

## Security Notes

- ✅ Firebase config is PUBLIC (by design) - security via Firebase Rules
- ✅ API_URL is PUBLIC (visible in browser DevTools)
- ❌ NEVER put private keys, secrets, or tokens in environment variables for static sites
- ✅ Authentication tokens are generated at runtime (not in environment)

## Environment Variable Access

In the portal:

```javascript
// Access in app.js
const API_URL = CONFIG.apiBaseUrl;  // Automatically set from environment

// Check environment in browser console
console.log(CONFIG);
// {
//   apiBaseUrl: "https://your-backend.onrender.com",
//   firebase: {...},
//   features: {...}
// }
```

## Multiple Environments

If deploying to multiple environments (staging, production):

### Option 1: Separate Render Services

Create two static sites on Render:
- `omams-portal-staging` → Set `API_URL` to staging backend
- `omams-portal-production` → Set `API_URL` to production backend

### Option 2: Branches

Use different GitHub branches:
- `develop` branch → Staging deployment
- `main` branch → Production deployment

Each Render service watches a different branch.

## Quick Reference

```bash
# Local Development
http://localhost:8080 → http://localhost:8000 (auto)

# Production
https://your-app.onrender.com → https://your-backend.onrender.com (from API_URL)
```

## Validation Checklist

Before deployment, verify:

- [ ] `API_URL` environment variable set in Render
- [ ] API_URL value is correct (HTTPS, no trailing slash)
- [ ] Backend is deployed and accessible
- [ ] Backend CORS includes frontend domain
- [ ] Firebase authorized domains includes frontend domain
- [ ] `render-build.sh` is executable (`chmod +x render-build.sh`)
- [ ] All changes committed and pushed to GitHub

---

**Last Updated**: March 7, 2026
