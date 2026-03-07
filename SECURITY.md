# 🔒 Security Guide - OMAMS Web Portal

## Security Overview

This guide explains the security measures implemented in the OMAMS Web Portal and best practices for secure deployment.

## ✅ Security Measures Implemented

### 1. **Configuration Management**
- ✅ Separated configuration from application code (`config.js`)
- ✅ Environment-aware configuration (auto-detects localhost vs production)
- ✅ No hardcoded backend URLs
- ✅ Configuration objects are frozen to prevent runtime tampering

### 2. **Secret Management**
- ✅ No private keys or secrets in client code
- ✅ Firebase API keys are public-facing (by design) - security via Firebase Rules
- ✅ `.gitignore` configured to exclude sensitive files
- ✅ Backend API requires authentication tokens

### 3. **Authentication & Authorization**
- ✅ Firebase Authentication for user management
- ✅ JWT tokens sent with every API request
- ✅ Token refresh handled automatically
- ✅ XSS prevention through HTML escaping (`esc()` function)
- ✅ No sensitive data stored in localStorage

### 4. **Network Security**
- ✅ HTTPS enforced (handled by Render)
- ✅ CORS configured on backend
- ✅ Bearer token authentication for API calls
- ✅ Error messages don't expose internal details in production

### 5. **Content Security**
- ✅ Content Security Policy (CSP) headers via `render.yaml`
- ✅ X-Frame-Options: SAMEORIGIN (prevents clickjacking)
- ✅ X-Content-Type-Options: nosniff (prevents MIME sniffing)
- ✅ X-XSS-Protection enabled
- ✅ Referrer-Policy configured

### 6. **Input Validation**
- ✅ Email format validation on login
- ✅ Required field checks
- ✅ HTML escaping for all user-generated content
- ✅ CSV export properly escapes data

### 7. **Error Handling**
- ✅ Generic error messages for users (no stack traces)
- ✅ Detailed logging only in development mode
- ✅ API errors don't expose backend implementation

## 🔑 Firebase Security

### Public vs Private Keys

**Firebase API Keys are PUBLIC** - This is by design:
- They identify your Firebase project
- They're meant to be included in client-side code
- Security is enforced through Firebase Security Rules, not API key secrecy

**Real Security Layer:**
```javascript
// Firebase Security Rules (configured in Firebase Console)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Firebase Security Checklist
- ✅ Enable only required authentication methods
- ✅ Configure authorized domains in Firebase Console
- ✅ Set up proper Security Rules for Firestore (if used)
- ✅ Enable Firebase App Check (optional, advanced)
- ✅ Monitor authentication activity in Firebase Console

## 🚀 Render Deployment Security

### Environment Variables
Set these in Render Dashboard (NOT in code):

```env
API_URL=https://your-backend.onrender.com
NODE_ENV=production
```

### Security Headers (Configured in render.yaml)
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Enables browser XSS filter
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features
- **Content-Security-Policy**: Controls resource loading

### HTTPS
- ✅ Automatically enabled by Render
- ✅ Free SSL certificate
- ✅ Auto-renewal

## 🛡️ Backend Security Requirements

Your FastAPI backend MUST have:

### 1. Firebase Token Verification
```python
# backend/app/auth.py
from firebase_admin import auth

def verify_token(token: str):
    try:
        decoded = auth.verify_id_token(token)
        return decoded
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### 2. CORS Configuration
```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-portal.onrender.com",
        "http://localhost:8080",  # Only for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. Rate Limiting (Recommended)
```python
# Protect against brute force and DoS
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request):
    pass
```

### 4. Input Validation
```python
# Use Pydantic models for ALL endpoints
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
```

## 🔍 Security Testing

### Before Deployment Checklist

- [ ] Run security scan with `npm audit` (if using npm)
- [ ] Check for exposed secrets: `git grep -i "password\|secret\|key" | grep -v ".md"`
- [ ] Verify `.gitignore` is working: `git status --ignored`
- [ ] Test CORS from production domain
- [ ] Verify Firebase authorized domains include production URL
- [ ] Test authentication flow end-to-end
- [ ] Check CSP headers with browser DevTools
- [ ] Verify HTTPS redirect works
- [ ] Test with different user roles
- [ ] Check error messages don't expose sensitive info

### Vulnerability Scanning

**Check for common vulnerabilities:**
```bash
# If using npm
npm audit

# Check for exposed secrets (before committing)
git secrets --scan

# Or manually check
grep -r "password\|secret\|api_key\|private" --exclude-dir=node_modules .
```

## 📋 Secure Development Practices

### 1. Before Committing
```bash
# Always check what you're committing
git diff
git status

# Never commit these files
# - serviceAccountKey.json
# - .env files with real secrets
# - config.production.js (if containing secrets)
# - Any file ending in .backup, .secret, .private
```

### 2. Environment-Specific Config
```javascript
// ✅ GOOD: Environment-aware
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000'
  : window.ENV.API_URL;

// ❌ BAD: Hardcoded production URL
const API_URL = 'https://my-backend.com';
```

### 3. Error Messages
```javascript
// ✅ GOOD: Generic message for users
catch (error) {
  showError('Unable to load data. Please try again.');
  if (DEBUG_MODE) console.error('Details:', error);
}

// ❌ BAD: Exposes internal error
catch (error) {
  showError(error.message); // Could expose API details
}
```

### 4. Logging
```javascript
// ✅ GOOD: Debug-mode only
if (DEBUG_MODE) {
  console.log('API Response:', response);
}

// ❌ BAD: Always logs sensitive data
console.log('User token:', token); // Never do this
```

## 🚨 What NOT to Commit

Never commit these to GitHub:

```
❌ serviceAccountKey.json (Firebase admin SDK)
❌ .env with real secrets
❌ Private API keys (Stripe, AWS, etc.)
❌ Database credentials
❌ OAuth client secrets (backend only)
❌ Encryption keys
❌ User data / PII
❌ SSL private keys
❌ Backup files with sensitive data
```

## ✅ What IS Safe to Commit

These are OK in public repos:

```
✅ Firebase client config (public API keys)
✅ Public API endpoints
✅ Frontend code
✅ .gitignore
✅ README and documentation
✅ render.yaml (without secrets)
✅ Package manifests (package.json, requirements.txt)
```

## 🔐 Emergency Response

### If You Accidentally Commit Secrets

**Act Immediately:**

1. **Revoke the exposed secret** (Firebase Console, API provider)
2. **Remove from Git history:**
   ```bash
   # Remove file from history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/secret/file" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Or use BFG Repo-Cleaner (easier)
   java -jar bfg.jar --delete-files secret.json
   ```
3. **Force push** (⚠️ coordinate with team first):
   ```bash
   git push origin --force --all
   ```
4. **Generate new secrets**
5. **Update deployment with new secrets**

### Monitoring for Security Issues

1. **Monitor Firebase Console** for suspicious auth activity
2. **Check Render logs** for unusual API patterns
3. **Set up alerts** for failed authentication attempts
4. **Review error logs** weekly

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/security)
- [Web Security Checklist](https://www.sensedeep.com/blog/posts/2021/web-security-checklist.html)
- [Content Security Policy Guide](https://content-security-policy.com/)

## 🆘 Support

If you discover a security vulnerability:
1. DO NOT open a public GitHub issue
2. Contact the project maintainer directly
3. Allow time for the issue to be fixed before disclosure

---

**Last Updated**: March 7, 2026  
**Portal Version**: 2.0.0
