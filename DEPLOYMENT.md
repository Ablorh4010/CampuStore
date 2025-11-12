# Deployment Guide

This guide provides step-by-step instructions for deploying CampusAffordHub to production.

## Pre-Deployment Checklist

- [ ] All TypeScript errors resolved (`npm run check`)
- [ ] Environment variables configured
- [ ] Database is provisioned and accessible
- [ ] Stripe account is set up
- [ ] Resend account is set up
- [ ] Build succeeds (`npm run build`)
- [ ] Application runs locally in production mode (`npm start`)

## Option 1: Deploy to Replit

### Step 1: Import Project
1. Go to https://replit.com
2. Click "Create Repl"
3. Import from GitHub: `https://github.com/Ablorh4010/CampuStore`

### Step 2: Configure Environment
1. Open the "Secrets" tab (Tools > Secrets)
2. Add all required environment variables:
   - `DATABASE_URL`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `VITE_STRIPE_PUBLIC_KEY`
   - `SESSION_SECRET`
   - `RESEND_API_KEY`

### Step 3: Provision Database
1. In Replit, go to Tools > Database
2. Enable PostgreSQL
3. Copy the connection string to `DATABASE_URL`

### Step 4: Run Migrations
```bash
npm run db:push
```

### Step 5: Deploy
1. Click the "Run" button
2. Application will be available at your Repl URL

## Option 2: Deploy to Vercel

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Configure Project
Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Step 4: Set Environment Variables
```bash
vercel env add DATABASE_URL
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_PUBLISHABLE_KEY
vercel env add VITE_STRIPE_PUBLIC_KEY
vercel env add SESSION_SECRET
vercel env add RESEND_API_KEY
```

### Step 5: Deploy
```bash
npm run build
vercel --prod
```

## Option 3: Deploy to Railway

### Step 1: Install Railway CLI
```bash
npm i -g @railway/cli
```

### Step 2: Login to Railway
```bash
railway login
```

### Step 3: Initialize Project
```bash
railway init
```

### Step 4: Add PostgreSQL
```bash
railway add
# Select PostgreSQL
```

### Step 5: Set Environment Variables
```bash
railway variables set STRIPE_SECRET_KEY=sk_test_...
railway variables set STRIPE_PUBLISHABLE_KEY=pk_test_...
railway variables set VITE_STRIPE_PUBLIC_KEY=pk_test_...
railway variables set SESSION_SECRET=your_secret_here
railway variables set RESEND_API_KEY=re_...
```

### Step 6: Deploy
```bash
railway up
```

## Option 4: Deploy to Render

### Step 1: Create Account
1. Go to https://render.com
2. Sign up or log in

### Step 2: Create PostgreSQL Database
1. Click "New +" → "PostgreSQL"
2. Configure database settings
3. Copy the Internal Database URL

### Step 3: Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - Name: `campusstore`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

### Step 4: Add Environment Variables
Add the following in the Environment section:
- `DATABASE_URL` = (from Step 2)
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLIC_KEY`
- `SESSION_SECRET`
- `RESEND_API_KEY`
- `NODE_ENV` = `production`

### Step 5: Deploy
Click "Create Web Service"

## Post-Deployment Steps

### 1. Run Database Migrations
Connect to your production database and run:
```bash
npm run db:push
```

### 2. Seed Categories
Insert initial categories:
```sql
INSERT INTO categories (name, icon, color) VALUES
  ('Electronics', 'Laptop', '#3B82F6'),
  ('Books', 'Book', '#10B981'),
  ('Clothing', 'Shirt', '#F59E0B'),
  ('Furniture', 'Sofa', '#8B5CF6'),
  ('Sports', 'Dumbbell', '#EF4444'),
  ('Other', 'Package', '#6B7280');
```

### 3. Create Admin Account
Use the secure admin registration link:
```
https://your-domain.com/admin-register?token=CSE_ADMIN_2025_SECURE_a9f4b7c2d8e1
```

### 4. Test Application
- [ ] User registration works
- [ ] Email OTP is received
- [ ] Login works
- [ ] Product listing works
- [ ] Store creation works
- [ ] Cart functionality works
- [ ] Payment processing works
- [ ] Admin dashboard accessible

### 5. Switch to Production Keys
Replace test Stripe keys with production keys:
- `STRIPE_SECRET_KEY` → `sk_live_...`
- `STRIPE_PUBLISHABLE_KEY` → `pk_live_...`
- `VITE_STRIPE_PUBLIC_KEY` → `pk_live_...`

### 6. Configure Custom Domain (Optional)
Follow your hosting provider's instructions to add a custom domain.

## Monitoring

### Health Checks
Monitor these endpoints:
- `GET /` - Application health
- `GET /api/categories` - API health

### Logs
Check application logs for errors:
- Replit: Console tab
- Vercel: Dashboard → Functions → Logs
- Railway: Dashboard → Deployments → Logs
- Render: Dashboard → Logs

### Database
Monitor database:
- Connection pool usage
- Query performance
- Storage usage

## Backup

### Database Backups
Set up automated database backups:

**PostgreSQL:**
```bash
pg_dump $DATABASE_URL > backup.sql
```

**Restore:**
```bash
psql $DATABASE_URL < backup.sql
```

### File Uploads
Back up the `uploads/` directory regularly.

## Scaling

### Vertical Scaling
Increase resources:
- RAM: 512MB → 1GB → 2GB
- CPU: 1 core → 2 cores → 4 cores

### Horizontal Scaling
- Use load balancer
- Multiple server instances
- CDN for static assets
- Database read replicas

## Security Checklist

- [ ] HTTPS enabled (SSL certificate)
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Session secret is strong and unique
- [ ] Admin token is secure
- [ ] File upload validation enabled
- [ ] SQL injection protection (using ORM)
- [ ] XSS protection enabled

## Troubleshooting

### Application Won't Start
1. Check logs for errors
2. Verify all environment variables are set
3. Ensure database is accessible
4. Check build output for errors

### Database Connection Errors
1. Verify `DATABASE_URL` is correct
2. Check database server is running
3. Verify network connectivity
4. Check firewall rules

### Payment Processing Issues
1. Verify Stripe keys
2. Check Stripe dashboard for errors
3. Test with test cards
4. Review webhook configuration

### Email Not Sending
1. Verify Resend API key
2. Check domain verification
3. Review Resend logs
4. Test with test emails

## Performance Optimization

### Frontend
- Enable Vite build optimization
- Use CDN for static assets
- Enable browser caching
- Minimize bundle size

### Backend
- Enable compression
- Use connection pooling
- Cache frequently accessed data
- Optimize database queries

### Database
- Add indexes to frequently queried columns
- Use prepared statements
- Regular VACUUM operations
- Monitor slow queries

## Support

For deployment issues:
1. Check this guide
2. Review application logs
3. Check platform documentation
4. Contact support

## Additional Resources

- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)
- [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Stripe Documentation](https://stripe.com/docs)
- [Resend Documentation](https://resend.com/docs)
