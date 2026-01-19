# Production Deployment Notes - Moving from localhost to HTTPS

## 📋 Prerequisites

Before deploying to production, you need:
- ✅ Domain name (e.g., suipass.app)
- ✅ HTTPS certificate (automatic with Vercel/Netlify)
- ✅ Same Google OAuth Client ID (don't create a new one!)

---

## 🔧 Step 1: Update Google Cloud Console

### 1.1 Add Production URLs

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID (the one you created for localhost)
3. Click "Edit" or pencil icon

### 1.2 Update Authorized JavaScript origins

**Add production URL** (keep localhost for local development):
```
http://localhost:5173              ← Keep this
http://localhost:3000              ← Keep this
https://suipass.app                ← ADD THIS
https://www.suipass.app            ← ADD THIS (if using www)
```

**DO NOT remove localhost** - you still need it for local development!

### 1.3 Update Authorized redirect URIs

**Add production callback** (keep localhost):
```
http://localhost:5173/auth/callback              ← Keep this
http://localhost:5173                            ← Keep this
https://suipass.app/auth/callback                ← ADD THIS
https://www.suipass.app/auth/callback            ← ADD THIS (if using www)
```

⚠️ **CRITICAL**: No trailing slashes! `https://suipass.app/auth/callback` NOT `https://suipass.app/auth/callback/`

4. Click "Save"
5. Wait 1-2 minutes for changes to propagate

---

## 🌐 Step 2: Create Production Environment File

### 2.1 Create .env.production file

In your `frontend/` directory, create `.env.production`:

```bash
cd ~/SuiPass/frontend

# Create production env file
cat > .env.production << 'EOF'
# Production Environment Variables

# Sui Package ID (same as local)
VITE_SUI_PACKAGE_ID=0xYOUR_PACKAGE_ID_HERE

# Google OAuth Client ID (same as local - DO NOT CHANGE)
VITE_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com

# Production Redirect URI
VITE_REDIRECT_URI=https://suipass.app/auth/callback
EOF
```

⚠️ **IMPORTANT**: 
- Use **SAME** Google Client ID as localhost
- Use **SAME** Sui Package ID as localhost
- Only change the REDIRECT_URI to your production domain

### 2.2 Update package.json build script (optional)

If deploying manually, ensure your build uses the correct env:

```json
{
  "scripts": {
    "build": "tsc && vite build",
    "build:prod": "tsc && vite build --mode production"
  }
}
```

---

## 🚀 Step 3: Deploy to Hosting Platform

### Option A: Vercel (Recommended - Easiest)

1. Install Vercel CLI (if not already):
```bash
npm install -g vercel
```

2. Navigate to frontend directory:
```bash
cd ~/SuiPass/frontend
```

3. Deploy:
```bash
vercel --prod
```

4. Follow prompts:
   - Project name: `suipass`
   - Link to existing project? No
   - Deploy? Yes

5. Vercel will give you a URL like: `https://suipass.vercel.app`

6. **Add Custom Domain** (optional):
   - Go to Vercel dashboard: https://vercel.com/dashboard
   - Select your project
   - Settings → Domains
   - Add: `suipass.app`
   - Update DNS records as instructed

### Option B: Netlify

1. Build project:
```bash
cd ~/SuiPass/frontend
npm run build
```

2. Deploy to Netlify:
   - Go to: https://app.netlify.com
   - Drag and drop the `dist/` folder
   - Or use CLI: `netlify deploy --prod`

3. Configure custom domain in Netlify dashboard

### Option C: Your Own Server (VPS/Cloud)

1. Build project:
```bash
cd ~/SuiPass/frontend
npm run build
```

2. Upload `dist/` folder to server

3. Configure nginx/Apache:

**Nginx Example:**
```nginx
server {
    listen 443 ssl http2;
    server_name suipass.app;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    root /var/www/suipass/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Important for React Router
    location /auth/callback {
        try_files $uri /index.html;
    }
}
```

4. Restart nginx: `sudo systemctl restart nginx`

---

## ✅ Step 4: Verify Production Deployment

### 4.1 Test OAuth Flow

1. Visit: `https://suipass.app`
2. Click "Sign in with Google"
3. Select Google account
4. Should redirect to: `https://suipass.app/auth/callback`
5. Should complete login and show dashboard

### 4.2 Check Browser Console

Open DevTools (F12) and check:
```
✅ "🔐 Starting zkLogin flow..."
✅ "🌐 Redirecting to Google OAuth..."
✅ "🔄 Processing OAuth callback..."
✅ "🧂 Requesting user salt from Mysten..."
✅ "✅ Received user salt"
✅ "🔐 Requesting ZK proof from Mysten prover..."
✅ "✅ Received ZK proof"
✅ "✅ zkLogin completed successfully!"
```

### 4.3 Common Issues

**Issue: "redirect_uri_mismatch"**
→ Solution: Double-check Google Cloud Console authorized redirect URIs
→ Make sure `https://suipass.app/auth/callback` is EXACTLY listed
→ No typos, no trailing slashes
→ Wait 2 minutes after saving changes

**Issue: "access_denied"**
→ Solution: Your Google account not added to test users
→ Go to OAuth consent screen → Test users → Add your email

**Issue: CORS errors**
→ Solution: Make sure you're using HTTPS, not HTTP
→ Check browser console for specific CORS error
→ Mysten services require HTTPS in production

**Issue: "Configuration error"**
→ Solution: Check `.env.production` file exists and has correct values
→ Rebuild app: `npm run build`
→ Clear browser cache

---

## 🔒 Step 5: Security Hardening (Production Only)

### 5.1 Update OAuth Consent Screen

When ready for public users:

1. Go to: OAuth consent screen in Google Cloud Console
2. Click "Publish App"
3. Submit for verification (required for >100 users)
4. Verification takes 1-2 weeks

### 5.2 Add Privacy Policy & Terms

Create these pages:
- `https://suipass.app/privacy`
- `https://suipass.app/terms`

Update links in Google OAuth consent screen.

### 5.3 Environment Variables Security

**Never commit** `.env.production` to git!

Add to `.gitignore`:
```
.env
.env.local
.env.production
.env.*.local
```

For hosting platforms:
- Vercel: Use environment variables in dashboard
- Netlify: Use environment variables in settings
- VPS: Use secrets management service

---

## 📊 Step 6: Monitoring & Analytics (Optional)

### 6.1 Add Error Tracking

Install Sentry:
```bash
npm install @sentry/react
```

Configure in `App.tsx`:
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: 'production',
});
```

### 6.2 Add Analytics

```bash
npm install @vercel/analytics
```

Add to `App.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <>
      <Dashboard />
      <Analytics />
    </>
  );
}
```

---

## 🔄 Step 7: Updating After Deployment

### When you update code:

1. Make changes locally
2. Test on `http://localhost:5173`
3. Commit to git
4. Deploy to production:

**Vercel:**
```bash
git push origin main  # Auto-deploys
# OR
vercel --prod
```

**Netlify:**
```bash
npm run build
netlify deploy --prod
```

**Manual:**
```bash
npm run build
# Upload dist/ to server
```

### When you redeploy smart contracts:

1. Deploy new contract
2. Get new Package ID
3. Update `.env.local` AND `.env.production`
4. Rebuild and redeploy frontend

**Users will need to:**
- Clear their vaults (old package ID won't work)
- Create new vaults with new package

⚠️ **WARNING**: Redeploying contracts is destructive! Only do in testing phase.

---

## 📝 Production Checklist

Before going live:

- [ ] Google Cloud Console updated with production URLs
- [ ] `.env.production` created with correct values
- [ ] Built and deployed to hosting platform
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS certificate active
- [ ] Tested OAuth flow in production
- [ ] Tested creating vault
- [ ] Tested adding/viewing passwords
- [ ] Privacy policy and terms added
- [ ] Error tracking configured (optional)
- [ ] Analytics configured (optional)

---

## 🆘 Emergency Rollback

If production is broken:

1. **Revert frontend:**
   - Vercel: Dashboard → Deployments → Previous deployment → Promote
   - Netlify: Dashboard → Deploys → Previous deploy → Publish
   - Manual: Upload previous `dist/` backup

2. **Check Google Cloud Console:**
   - Make sure redirect URIs are correct
   - Verify authorized origins include production domain

3. **Check Mysten Services:**
   - zkLogin prover: https://prover-dev.mystenlabs.com/v1 (should return 404 for GET)
   - Salt service: https://salt.api.mystenlabs.com (should be accessible)

---

## 📞 Getting Help

If you encounter issues:

1. Check browser DevTools console for errors
2. Check network tab for failed requests
3. Verify environment variables are loaded: `console.log(import.meta.env)`
4. Check Sui testnet status: https://status.sui.io
5. Post in Sui Discord: https://discord.gg/sui

---

**Good luck with your production deployment! 🚀**