# Deployment Guide

## Deploy to Render (Recommended)

### Backend Deployment

1. **Sign up at [Render.com](https://render.com)**

2. **Create a new Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `https://github.com/Gotnochill/Disaster-Manager`
   - Configure:
     - **Name**: disaster-manager-backend
     - **Root Directory**: Leave empty (root)
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free

3. **Add Environment Variables**
   Go to Environment tab and add:
   ```
   MONGODB_URI=your_mongodb_connection_string_here
   PORT=3000
   NODE_ENV=production
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (takes 2-3 minutes)
   - Copy your backend URL (e.g., `https://disaster-manager-backend.onrender.com`)

### Frontend Deployment

1. **Create another Web Service for Frontend**
   - Click "New +" → "Static Site"
   - Connect same GitHub repository
   - Configure:
     - **Name**: disaster-manager-frontend
     - **Root Directory**: `frontend`
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `build`

2. **Add Environment Variable**
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   ```
   Replace with your actual backend URL from step 4 above.

3. **Update Backend CORS**
   After frontend deploys, go back to backend environment variables and add:
   ```
   FRONTEND_URL=https://your-frontend-url.onrender.com
   ```

4. **Redeploy Both Services**
   - Backend: Manual Deploy → "Deploy latest commit"
   - Frontend: Manual Deploy → "Clear build cache & deploy"

### Your Live URLs
- **Frontend**: `https://disaster-manager-frontend.onrender.com`
- **Backend API**: `https://disaster-manager-backend.onrender.com`

---

## Alternative: Deploy to Vercel

### Backend (Vercel)
```bash
npm install -g vercel
cd d:/Code/Hackathons/Disaster_Manager
vercel
```

### Frontend (Vercel)
```bash
cd frontend
vercel
```

Add environment variables in Vercel dashboard.

---

## Alternative: Deploy to Railway

1. Sign up at [Railway.app](https://railway.app)
2. Create new project from GitHub
3. Add MongoDB URI and other environment variables
4. Railway auto-detects and deploys both services

---

## Important Notes

- **Free tier limitations**: Services may sleep after 15 minutes of inactivity
- **MongoDB Atlas**: Ensure your IP whitelist includes `0.0.0.0/0` for cloud deployments
- **First load**: May take 30-60 seconds to wake up on free tier
- **Custom domain**: Can be added in Render/Vercel settings

## Testing Your Deployment

After deployment, test these endpoints:
- `https://your-backend-url.onrender.com/api/disasters` (should return JSON)
- `https://your-frontend-url.onrender.com` (should load the React app)
