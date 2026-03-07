# 🚀 Deploy OMAMS Web Portal to Render

Complete step-by-step guide to deploy the OMAMS Web Portal to Render.com.

## Prerequisites

- ✅ GitHub account
- ✅ Render account (sign up at https://render.com)
- ✅ Backend API deployed and accessible via HTTPS
- ✅ Firebase project configured

## Step 1: Prepare Your Repository

### 1.1 Push to GitHub

```bash
# Initialize git if not already done
cd web_portal
git init

# Add files
git add .

# Commit
git commit -m "feat: add production-ready web portal with security"

# Create GitHub repository (via GitHub website or CLI)
# Then add remote
git remote add origin https://github.com/YOUR_USERNAME/omams-portal.git

# Push
git push -u origin main
```

### 1.2 Verify .gitignore

Check that sensitive files are NOT committed:
```bash
# Should show nothing (or only .gitignore itself)
git status --ignored
```

## Step 2: Deploy Backend First

**Important:** Deploy your FastAPI backend BEFORE the frontend.

Your backend URL will be something like:
```
https://omams-backend.onrender.com
```

### Backend Environment Variables
Set these in your backend Render service:
```env
DATABASE_URL=postgresql://...
FIREBASE_ADMIN_SDK_JSON={"type":"service_account",...}
CORS_ORIGINS=https://your-frontend.onrender.com,http://localhost:8080
```

## Step 3: Deploy Frontend to Render

### 3.1 Create New Static Site

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Static Site"**
3. Connect your GitHub repository
4. Configure the service:

```yaml
Name: omams-portal
Branch: main
Build Command: chmod +x render-build.sh && ./render-build.sh
Publish Directory: .
```

### 3.2 Set Environment Variables

In Render Dashboard → Your Static Site → Environment:

| Key | Value | Notes |
|-----|-------|-------|
| `API_URL` | `https://your-backend.onrender.com` | Your backend URL |
| `NODE_ENV` | `production` | Enable production mode |

**Important:** NO trailing slash on `API_URL`

### 3.3 Configure Custom Domain (Optional)

1. Go to Settings → Custom Domains
2. Add your domain (e.g., `portal.omams.com`)
3. Update DNS records as instructed
4. Wait for SSL certificate (5-10 minutes)

## Step 4: Configure Firebase

### 4.1 Add Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **"Add domain"**
5. Add your Render URLs:
   ```
   your-app.onrender.com
   portal.yourdomain.com (if using custom domain)
   ```

### 4.2 Update Firebase Security Rules (if using Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Step 5: Update Backend CORS

Update your backend to allow requests from frontend:

```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend.onrender.com",
        "https://portal.yourdomain.com",  # If using custom domain
        "http://localhost:8080",  # For local testing
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Redeploy backend after updating CORS.

## Step 6: Verify Deployment

### 6.1 Check Build Logs

In Render Dashboard → Your Static Site → Logs:
```
✓ Checking environment variables...
✓ Creating production config...
✓ Security headers will be set via render.yaml
✓ Deployment preparation complete!
```

### 6.2 Test the Portal

1. Visit your Render URL: `https://your-app.onrender.com`
2. Check that login page loads
3. Open browser DevTools → Console (should have no errors)
4. Try logging in with email/password
5. Try logging in with Google
6. Verify dashboard loads data from backend
7. Test all features (courses, students, attendance, export)

### 6.3 Check Security Headers

Open DevTools → Network → Select index.html → Headers:

Should see:
```
x-frame-options: SAMEORIGIN
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
referrer-policy: strict-origin-when-cross-origin
content-security-policy: default-src 'self'; ...
```

## Step 7: Monitor and Maintain

### Enable Render Notifications

1. Go to Account Settings → Notifications
2. Enable deploy notifications
3. Add email/Slack webhook

### Set Up Uptime Monitoring

Use a free service like:
- **UptimeRobot**: https://uptimerobot.com
- **StatusCake**: https://www.statuscake.com

Monitor:
- `https://your-frontend.onrender.com` (portal)
- `https://your-backend.onrender.com/health` (API)

### Check Logs Regularly

Render Dashboard → Logs → Filter by error

## Troubleshooting

### Issue: "Cannot connect to backend"

**Check:**
1. Backend is deployed and running
2. `API_URL` environment variable is set correctly
3. Backend CORS includes frontend domain
4. Backend is accessible: `curl https://your-backend.onrender.com/health`

**Fix:**
```bash
# Test backend directly
curl https://your-backend.onrender.com/health

# Should return: {"status":"healthy"}
```

### Issue: "Firebase authentication failed"

**Check:**
1. Frontend domain is in Firebase authorized domains
2. Firebase config in `config.js` is correct
3. Browser console for specific error

**Fix:**
- Add domain to Firebase Console → Authentication → Settings → Authorized domains

### Issue: "Build failed"

**Check:**
1. `render-build.sh` has executable permissions
2. Build logs in Render Dashboard
3. `API_URL` is set in environment variables

**Fix:**
```bash
# Locally test the build script
chmod +x render-build.sh
./render-build.sh

# Commit and push fix
git add render-build.sh
git commit -m "fix: update build script"
git push
```

### Issue: "Page not found" (404)

**Check:**
1. `render.yaml` has correct routes configuration
2. `staticPublishPath` is set to `.` (current directory)

**Fix:**
Update `render.yaml` routes:
```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

### Issue: White screen / blank page

**Check:**
1. Browser console for JavaScript errors
2. Network tab - are all files loading?
3. `config.js` loaded before `app.js`?

**Fix:**
```html
<!-- index.html - ensure correct order -->
<script src="config.js"></script>
<script src="app.js"></script>
```

### Issue: CORS errors

**Symptoms:**
```
Access to fetch at 'https://backend.com' from origin 'https://frontend.com' 
has been blocked by CORS policy
```

**Fix:**
1. Update backend CORS to include frontend domain
2. Redeploy backend
3. Clear browser cache
4. Test again

## Performance Optimization

### 1. Enable Compression

Render automatically enables gzip/brotli compression for static sites.

### 2. Use CDN (Optional)

Render has built-in CDN, but you can add CloudFlare:
1. Point your domain to CloudFlare
2. Update CloudFlare DNS to point to Render
3. Enable CloudFlare proxy (orange cloud)

### 3. Optimize Assets

```bash
# Minify JavaScript
uglifyjs app.js -o app.min.js -c -m

# Minify CSS
cleancss style.css -o style.min.css

# Update index.html to use minified files
```

## Cost Estimation

### Render Free Tier
- ✅ Free static site hosting
- ✅ Free SSL certificate
- ✅ 100 GB bandwidth/month
- ✅ Custom domain support
- ⚠️ Goes to sleep after 15 min of inactivity (paid plans only for web services)

### Upgrade to Paid ($7/month)
- Always-on instances
- Faster builds
- More bandwidth
- Priority support

## Backup Strategy

### 1. GitHub Backup
Your code is already backed up on GitHub.

### 2. Export Deployment Settings
```bash
# Save render.yaml and environment variable names
cp render.yaml render.yaml.backup
```

### 3. Version Tags
```bash
# Tag stable releases
git tag -a v2.0.0 -m "Production release 2.0.0"
git push origin v2.0.0
```

## Rollback Plan

### Quick Rollback on Render

1. Go to Render Dashboard → Your Static Site → Deploys
2. Find previous successful deploy
3. Click **"Rollback to this version"**
4. Confirm rollback

### Git Rollback

```bash
# Revert to previous commit
git revert HEAD
git push

# Or reset to specific version
git reset --hard v1.9.0
git push --force
```

## Security Checklist

Before going live:

- [ ] No secrets in GitHub repository
- [ ] `.gitignore` configured correctly
- [ ] HTTPS enabled (automatic on Render)
- [ ] Firebase authorized domains updated
- [ ] Backend CORS configured for production domain
- [ ] CSP headers configured in `render.yaml`
- [ ] Environment variables set in Render (not in code)
- [ ] Test authentication flow
- [ ] Test all features end-to-end
- [ ] Monitor for errors in first 24 hours

## Next Steps

1. **Set up monitoring** → UptimeRobot
2. **Enable analytics** → Google Analytics
3. **Add error tracking** → Sentry
4. **Document for users** → Create user guide
5. **Collect feedback** → Set up feedback form

## Support

- **Render Docs**: https://render.com/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **GitHub Issues**: [Your repo]/issues

---

**Deployment Status**: Ready ✅  
**Last Updated**: March 7, 2026  
**Version**: 2.0.0

## Quick Reference

```bash
# Frontend URL
https://your-app.onrender.com

# Backend URL  
https://your-backend.onrender.com

# GitHub Repo
https://github.com/YOUR_USERNAME/omams-portal

# Firebase Console
https://console.firebase.google.com/project/attendance-4e2af
```
