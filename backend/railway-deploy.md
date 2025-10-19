# Railway Deployment Guide (No GitHub Required)

## 🚀 Step-by-Step Deployment

### 1. Prepare Your Backend
Your backend is already ready! I've added:
- ✅ `Procfile` - Tells Railway how to start your app
- ✅ Updated `package.json` - Production start script
- ✅ Health check endpoint - For monitoring

### 2. Deploy to Railway

#### Option A: Direct Upload (Easiest)
1. **Go to [railway.app](https://railway.app)**
2. **Sign up** (free account)
3. **Click "New Project"**
4. **Select "Deploy from local directory"**
5. **Upload your `backend` folder**
6. **Railway will automatically:**
   - Install dependencies
   - Start your server
   - Give you a URL like `https://your-app.railway.app`

#### Option B: Railway CLI (Advanced)
1. **Install Railway CLI**: `npm install -g @railway/cli`
2. **Login**: `railway login`
3. **Deploy**: `railway up` (from backend folder)

### 3. Configure Environment Variables
In Railway dashboard:
- **JWT_SECRET**: Generate a random string
- **PORT**: Railway sets this automatically

### 4. Update Frontend API URL
Once deployed, update your frontend to use the Railway URL:
- Change `API_BASE` in `portal/app.js`
- Update `netlify.toml` redirects

## 💰 Cost
- **Free tier**: 500 hours/month
- **Paid tier**: $5/month for unlimited

## 🔧 What Railway Handles
- ✅ Node.js runtime
- ✅ Automatic HTTPS
- ✅ Environment variables
- ✅ Database (SQLite file)
- ✅ Health monitoring
- ✅ Automatic restarts

## 🌐 Your Backend Will Be Live At
`https://your-app-name.railway.app`

## 📱 Next Steps
1. Deploy backend to Railway
2. Deploy frontend to Netlify
3. Update API URLs
4. Test everything works!
