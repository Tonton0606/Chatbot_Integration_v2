# HermesV2 Render Deployment Guide

## 🚀 Quick Deploy to Render

### Step 1: Create Backend Service
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `hermesv2-backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `server/`

### Step 2: Add Backend Environment Variables
In your Render dashboard → Web Service → Environment:

```
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://hermesv2-frontend.onrender.com

# Supabase (from your existing config)
DATABASE_URL=postgresql://postgres:PASSWORD@db.Hermes.supabase.co:5432/postgres
SUPABASE_URL=https://zktcypraugqiddqhntsp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key_here

# Zoom (from your existing config)
ZOOM_CLIENT_ID=paKph9p6RSOY_Gct0mPgwA
ZOOM_CLIENT_SECRET=your_secret
ZOOM_ACCOUNT_ID=v9uIWgerT-2AriZd5zvcGA
ZOOM_USER_EMAIL=raizahabania05@gmail.com

# Google (from your existing config)
GOOGLE_CLIENT_EMAIL=calendar-bot@eternal-reserve-494814-r0.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=raizahabania05@gmail.com
GOOGLE_MEET_LINK=https://meet.google.com/gvz-nqmv-hbs

# Email (from your existing config)
EMAIL_USER=raizahabania05@gmail.com
EMAIL_PASS=your_app_password
```

### Step 3: Create Frontend Service
1. Click **New +** → **Static Site**
2. Connect same repo
3. Configure:
   - **Name**: `hermesv2-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Root Directory**: `client/`

### Step 4: Add Frontend Environment Variables
```
VITE_SUPABASE_URL=https://zktcypraugqiddqhntsp.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_from_supabase
VITE_API_BASE_URL=https://hermesv2-backend.onrender.com/api
```

### Step 5: Update CORS (After First Deploy)
Once you have your actual Render URLs, update `server/server.js`:

```javascript
const corsOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://hermesv2-frontend.onrender.com',  // Your actual URL
      process.env.FRONTEND_URL,
    ].filter(Boolean)
  : ['http://localhost:5173', '*'];
```

### Step 6: Deploy
1. Push code to GitHub
2. Both services will auto-deploy
3. Backend URL: `https://hermesv2-backend.onrender.com`
4. Frontend URL: `https://hermesv2-frontend.onrender.com`

## 🔧 Local Development
```bash
# Terminal 1 - Backend
cd server
npm install
npm run dev

# Terminal 2 - Frontend
cd client
npm install
npm run dev
```

## 📝 Important Notes

### Security
- ✅ `.env.local` files are in `.gitignore` - NEVER commit them
- ✅ Use Render's Environment Variables dashboard for secrets
- ✅ Service role key stays on backend only
- ✅ Anon key is safe for frontend

### Supabase Setup Required
Ensure your Supabase project has these tables:
- `profiles` (id, email, full_name, role, created_at)
- `demo_bookings` (all booking fields)
- `projects` (project data)
- `customers` (customer data)

### Custom Domain (Optional)
1. Buy domain (Cloudflare, Namecheap, etc.)
2. In Render → Settings → Custom Domain
3. Add CNAME record pointing to Render

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Check FRONTEND_URL matches actual Render URL |
| 404 API errors | Verify backend routes are mounted correctly |
| Zoom not working | Check credentials in Render env vars |
| Email not sending | Verify Gmail app password (not regular password) |
| Database errors | Check DATABASE_URL format and Supabase connection |

## 🆘 Support
- Render Docs: https://render.com/docs
- Supabase Docs: https://supabase.com/docs
- Check server logs in Render dashboard
