# Render Deployment Checklist

## Pre-Deployment

- [ ] Code pushed to GitHub
- [ ] `.env.local` files are in `.gitignore`
- [ ] Supabase project created
- [ ] SQL tables created (run `supabase_setup_tables.sql`)
- [ ] All credentials copied (don't share in chat/code!)

## Environment Variables

### Frontend (Render Static Site)
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_BASE_URL=https://hermes-backend.onrender.com/api
```

### Backend (Render Web Service)
```
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://hermes-frontend.onrender.com
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...
```

## Deploy Steps

1. **Backend First**:
   - New Web Service → server/ folder
   - Build: `npm install`
   - Start: `npm start`
   - Add env vars
   - Wait for "Deploy Succeeded"
   - Copy the URL (e.g., `https://hermes-backend.onrender.com`)

2. **Frontend Second**:
   - New Static Site → client/ folder
   - Build: `npm install && npm run build`
   - Publish: `dist`
   - Add env vars (use backend URL for VITE_API_BASE_URL)
   - Deploy

3. **Test**:
   - Visit frontend URL
   - Create account
   - Verify in Supabase

## Post-Deployment

- [ ] Test login/signup
- [ ] Check Supabase tables populated
- [ ] Verify role assignment works (Client vs Admin)
- [ ] Test all features

## Security Reminders

- Rotate any accidentally exposed keys immediately
- Use strong passwords for Supabase
- Enable 2FA on all accounts
- Monitor security_logs table
