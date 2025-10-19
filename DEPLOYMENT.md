# TBS Website Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Netlify (Frontend Only - Free)
1. Go to [netlify.com](https://netlify.com)
2. Sign up/login
3. Drag and drop your project folder to deploy
4. Your site will be live at a random URL like `https://amazing-name-123456.netlify.app`

### Option 2: Railway (Full-Stack - $5/month)
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project
4. Connect your GitHub repository
5. Railway will automatically detect and deploy your backend

### Option 3: Vercel (Full-Stack - Free tier)
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import your repository
4. Deploy both frontend and backend

## 📁 What Gets Deployed

### Frontend (Static Files)
- `index.html` - Main website
- `portal/` - Dashboard and admin pages
- `assets/` - Images and logos
- `styles.css` - Main styling
- `scripts.js` - Frontend JavaScript

### Backend (API Server)
- `backend/src/` - Node.js API server
- `backend/package.json` - Dependencies
- `tbs.sqlite` - Database (will be recreated on deployment)

## 🔧 Configuration Files Added

- `netlify.toml` - Netlify configuration
- `railway.json` - Railway configuration
- Health check endpoint added to backend

## 🌐 Custom Domain (Optional)

After deployment, you can:
1. Buy a domain (e.g., `tbsconstruction.com`)
2. Point it to your deployed site
3. Enable HTTPS automatically

## 💰 Cost Breakdown

- **Netlify**: Free (100GB bandwidth/month)
- **Railway**: $5/month (after free tier)
- **Domain**: ~$10-15/year (optional)

## 🚀 Recommended Steps

1. **Start with Netlify** (free frontend hosting)
2. **Add Railway** for backend API ($5/month)
3. **Buy domain** when ready ($10-15/year)

Total cost: ~$5-10/month for a professional website!
