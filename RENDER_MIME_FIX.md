# 🔧 Fixing MIME Type Issues on Render

## The Problem
Render is serving CSS files as `text/plain` instead of `text/css`, causing the browser to reject the stylesheet.

## Solutions

### Solution 1: Redeploy with Updated Configuration ✅

We've fixed the configuration. Push these changes and redeploy:

```bash
git add .
git commit -m "fix: correct MIME types for Render deployment"
git push origin main
```

Then in Render Dashboard:
1. Go to your static site
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for deployment to complete
4. Clear browser cache and test

### Solution 2: Alternative - Use Custom Web Server

If Solution 1 doesn't work, we can add a simple web server:

1. **Create `server.js`** (optional):
```javascript
const express = require('express');
const path = require('path');
const app = express();

// Serve static files with correct MIME types
app.use(express.static('.', {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

// SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

2. **Update `render.yaml`**:
```yaml
services:
  - type: web
    name: omams-portal
    env: node
    buildCommand: npm install express
    startCommand: node server.js
```

### Solution 3: Netlify Alternative

If Render continues to have issues, deploy to Netlify instead:

1. **Create `netlify.toml`**:
```toml
[build]
  publish = "."

[[headers]]
  for = "/*.css"
  [headers.values]
    Content-Type = "text/css; charset=utf-8"

[[headers]]
  for = "/*.js"
  [headers.values]
    Content-Type = "application/javascript; charset=utf-8"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. Deploy to Netlify:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

## What We Changed

### 1. `render.yaml`
- ✅ Added explicit Content-Type headers for `.css`, `.js`, `.html` files
- ✅ Added Cache-Control headers
- ✅ Fixed CSP to allow `*.onrender.com` for backend connections

### 2. `_headers` File
- ✅ Created Netlify-style headers file (Render may also support this)
- ✅ Sets correct MIME types

### 3. `index.html`
- ✅ Added `type="text/css"` to stylesheet link (explicit MIME type)
- ✅ Fixed deprecated `apple-mobile-web-app-capable` meta tag
- ✅ Added `mobile-web-app-capable` meta tag

### 4. `app.js`
- ✅ Performance logging now only in DEBUG_MODE (production clean)

## Verification Steps

After redeploying:

1. **Clear Browser Cache**:
   - Chrome: Ctrl+Shift+Delete → Clear cached images and files
   - Or open in Incognito/Private window

2. **Check Network Tab**:
   - Open DevTools → Network
   - Reload page
   - Find `style.css`
   - Check Response Headers → Should show `Content-Type: text/css`

3. **Check Console**:
   - Should have NO MIME type errors
   - Should have NO "Refused to apply style" errors

## Troubleshooting

### Still getting MIME type errors?

**Option A: Force Clear Everything**
```bash
# In Render Dashboard
1. Settings → Delete Service
2. Recreate from GitHub
3. Set API_URL environment variable
4. Deploy
```

**Option B: Switch to Vercel**
1. Go to vercel.com
2. Import your GitHub repo
3. Set `API_URL` environment variable
4. Deploy (Vercel handles MIME types automatically)

**Option C: Use Render Web Service instead of Static Site**
1. Create new Web Service (not Static Site)
2. Use `server.js` approach above
3. This gives you full control over headers

## Current Status

✅ Configuration files updated  
✅ Headers configured in 3 ways (render.yaml, _headers, HTML attributes)  
✅ Deprecated warnings fixed  
✅ Production console cleaned up  

**Next Step**: Push changes and redeploy!

```bash
git add .
git commit -m "fix: MIME type configuration for static assets"
git push origin main
```

Then manually deploy in Render Dashboard.

---

**Note**: If issues persist after trying all solutions, the problem might be Render's static site limitations. Consider switching to:
- **Netlify** (recommended for static sites)
- **Vercel** (excellent for static sites)
- **Render Web Service** with Express (gives full control)
