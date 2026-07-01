# Render + Supabase Deployment Guide

## Step 1: Prepare Environment Variables

### Frontend (client/.env.local)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=https://your-backend.onrender.com/api
```

### Backend (server/.env.local)
```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend.onrender.com

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Zoom (optional)
ZOOM_CLIENT_ID=your-id
ZOOM_CLIENT_SECRET=your-secret
ZOOM_ACCOUNT_ID=your-account
ZOOM_USER_EMAIL=your-email

# Google Calendar (optional)
GOOGLE_CLIENT_EMAIL=your-service-account
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=your-calendar
GOOGLE_MEET_LINK=https://meet.google.com/xxx

# Email (optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# AI (optional)
GROQ_API_KEY=your-key
```

## Step 2: Setup Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. Get your Project URL and Anon Key from: **Project Settings → API**
3. Get Service Role Key: **Project Settings → API → Service Role Key**
4. Open SQL Editor → New Query
5. Run the entire contents of `supabase_setup_tables.sql`

## Step 3: Deploy to Render

### Option A: Blueprint (Automatic)

1. Push code to GitHub
2. Go to [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)
3. Click **New Blueprint Instance**
4. Connect your GitHub repo
5. Render will create both services automatically

### Option B: Manual Setup

#### Backend Service:
1. Dashboard → **New +** → **Web Service**
2. Connect GitHub repo
3. Configure:
   - **Name**: `hermes-backend`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. Add Environment Variables (copy from .env.local above)

#### Frontend Service:
1. Dashboard → **New +** → **Static Site**
2. Connect same repo
3. Configure:
   - **Name**: `hermes-frontend`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` (use your backend Render URL + `/api`)

## Step 4: Update CORS

After deployment, update `FRONTEND_URL` in backend env vars with your actual frontend URL.

## Step 5: Test

1. Visit your frontend URL
2. Try creating an account
3. Check Supabase Table Editor → profiles (should show new user)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Update FRONTEND_URL to match actual Render URL |
| 404 API | Check backend service logs |
| Database errors | Verify DATABASE_URL format |
| Auth not working | Check Supabase URL and keys are correct |

## Important Notes

- **Never commit .env files** - they're in .gitignore
- **Use Render Dashboard** for production secrets
- **Free tier** spins down after 15 min inactivity (cold start delay)
- **Custom domain** (optional): Add in Render → Settings → Custom Domain
