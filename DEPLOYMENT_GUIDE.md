# Web Portal Deployment Guide

## Quick Start

### Development
```bash
# 1. Start the backend
cd backend
python -m uvicorn app.main:app --reload

# 2. Serve the web portal (option 1: Python)
cd web_portal
python -m http.server 8080

# 2. Serve the web portal (option 2: Node.js)
npx serve . -p 8080

# 3. Open browser
# Navigate to http://localhost:8080
```

### Production Setup

#### 1. Environment Configuration

**Update API endpoint in `app.js`:**
```javascript
// Change this line to your production backend URL
const API_BASE = 'https://your-api-domain.com';
```

**Firebase Configuration:**
- Ensure `firebaseConfig` in `app.js` points to production Firebase project
- Enable email/password and Google authentication in Firebase Console
- Add authorized domains in Firebase Console

#### 2. Backend Deployment

**Requirements:**
- Python 3.9+
- PostgreSQL or SQLite database
- HTTPS enabled

**Deploy backend to:**
- Heroku
- AWS EC2/Lambda
- Google Cloud Run
- DigitalOcean App Platform
- Azure App Service

**Environment Variables:**
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
FIREBASE_ADMIN_SDK=path/to/serviceAccountKey.json
CORS_ORIGINS=https://your-portal-domain.com
```

#### 3. Frontend Deployment

**Static Hosting Options:**

1. **Netlify** (Recommended)
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Deploy
   cd web_portal
   netlify deploy --prod
   ```

2. **Vercel**
   ```bash
   npm install -g vercel
   cd web_portal
   vercel --prod
   ```

3. **GitHub Pages**
   - Push to GitHub repository
   - Enable GitHub Pages in repository settings
   - Select branch and `/web_portal` folder

4. **Firebase Hosting**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy
   ```

5. **AWS S3 + CloudFront**
   - Create S3 bucket
   - Enable static website hosting
   - Upload files
   - Add CloudFront distribution for HTTPS

#### 4. Web Server Configuration

**Nginx** (`/etc/nginx/sites-available/omams`):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/omams/web_portal;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Apache** (`.htaccess`):
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-Content-Type-Options "nosniff"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

## SSL/HTTPS Setup

### Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (cron job)
0 12 * * * /usr/bin/certbot renew --quiet
```

### CloudFlare (Free SSL + CDN)
1. Add domain to CloudFlare
2. Update nameservers
3. Enable "Always Use HTTPS"
4. Enable "Auto Minify" for CSS/JS
5. Set SSL mode to "Full"

## Performance Optimization

### 1. Minification
```bash
# Install minification tools
npm install -g uglify-js clean-css-cli html-minifier

# Minify JavaScript
uglifyjs app.js -o app.min.js -c -m

# Minify CSS
cleancss -o style.min.css style.css

# Minify HTML
html-minifier --collapse-whitespace --remove-comments \
  --minify-css true --minify-js true \
  index.html -o index.min.html
```

### 2. Compression
```bash
# Gzip files
gzip -k -9 app.js style.css

# Brotli (better compression)
brotli -k -9 app.js style.css
```

### 3. CDN Configuration
- Use Firebase CDN for Firebase SDK
- Consider CDN for custom assets
- Enable caching headers

### 4. Asset Optimization
```bash
# Optimize images
npm install -g imagemin-cli
imagemin assets/*.png --out-dir=assets/optimized
```

## Monitoring & Analytics

### 1. Error Tracking
```javascript
// Add to app.js (optional)
window.addEventListener('error', (event) => {
  // Send to error tracking service
  fetch('https://your-error-tracker.com/log', {
    method: 'POST',
    body: JSON.stringify({
      message: event.error.message,
      stack: event.error.stack,
      url: window.location.href,
      timestamp: new Date().toISOString()
    })
  });
});
```

### 2. Analytics Integration
```html
<!-- Add to index.html before </head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA-XXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA-XXXXX');
</script>
```

### 3. Uptime Monitoring
- Use services like:
  - UptimeRobot (free)
  - Pingdom
  - StatusCake
  - AWS CloudWatch

## Security Checklist

- [ ] HTTPS enabled (SSL certificate)
- [ ] Security headers configured
- [ ] Firebase rules properly set
- [ ] API endpoints require authentication
- [ ] CORS configured correctly
- [ ] No sensitive data in client code
- [ ] Input validation on all forms
- [ ] XSS prevention (HTML escaping)
- [ ] CSP headers (optional)
- [ ] Rate limiting on API (backend)

## Backup Strategy

### Database
```bash
# PostgreSQL backup
pg_dump -U user -d omams_db -F c -f backup_$(date +%Y%m%d).dump

# Automated daily backups
0 2 * * * pg_dump -U user -d omams_db -F c -f /backups/db_$(date +\%Y\%m\%d).dump
```

### Files
```bash
# Backup web portal files
tar -czf portal_backup_$(date +%Y%m%d).tar.gz web_portal/

# Sync to S3
aws s3 sync /backups s3://your-backup-bucket/omams-backups/
```

## Rollback Plan

### Quick Rollback
```bash
# Keep previous version
cp -r web_portal web_portal.backup

# Deploy new version
rsync -av web_portal/ /var/www/omams/

# Rollback if needed
rm -rf /var/www/omams
mv web_portal.backup /var/www/omams
```

### Version Control
```bash
# Tag releases
git tag -a v2.0.0 -m "Production release 2.0.0"
git push origin v2.0.0

# Rollback to previous version
git checkout v1.9.0
# Deploy
```

## Troubleshooting

### Common Issues

**1. Cannot connect to backend**
- Check API_BASE URL in app.js
- Verify backend is running
- Check CORS settings on backend
- Verify firewall/security groups

**2. Firebase authentication fails**
- Check Firebase configuration
- Verify authorized domains in Firebase Console
- Check browser console for specific error
- Ensure Firebase API keys are correct

**3. White screen / blank page**
- Check browser console for errors
- Verify all assets are loading
- Check file paths are correct
- Ensure JavaScript is enabled

**4. Slow loading**
- Enable compression (gzip/brotli)
- Use CDN for static assets
- Optimize images
- Minify CSS/JS
- Check network tab in browser

## Maintenance

### Regular Tasks
- [ ] Monitor error logs weekly
- [ ] Review performance metrics monthly
- [ ] Update dependencies quarterly
- [ ] Backup database daily
- [ ] Test restore procedure monthly
- [ ] Review security best practices quarterly
- [ ] Update SSL certificates before expiry

### Updates
```bash
# Pull latest changes
git pull origin main

# Test locally
python -m http.server 8080

# Deploy to production
rsync -av web_portal/ user@server:/var/www/omams/
```

## Support Contacts

- **Backend Issues**: Check backend logs
- **Firebase Issues**: Firebase Console > Authentication
- **Hosting Issues**: Check hosting provider dashboard
- **SSL Issues**: Check certificate expiry and configuration

---

**Deployment Status**: Ready ✅  
**Last Updated**: March 7, 2026  
**Version**: 2.0.0
