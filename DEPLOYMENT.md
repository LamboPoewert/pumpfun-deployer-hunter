# Vercel Deployment Guide

## Step-by-Step Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Prepare Your Code**
   - Push your code to GitHub, GitLab, or Bitbucket
   - Make sure all files are committed

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up or log in
   - Click "Add New Project"
   - Select "Import Git Repository"

3. **Configure Project**
   - Select your repository
   - Vercel will auto-detect it's a Next.js project
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (keep default)
   - Build Command: `npm run build` (auto-filled)
   - Output Directory: `.next` (auto-filled)

4. **Environment Variables (Optional)**
   - Click "Environment Variables"
   - Add any API keys you need:
     - `PUMPFUN_API_KEY`
     - `NEXT_PUBLIC_SOLANA_RPC`
   - Click "Add" for each variable

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Your app will be live at `your-project-name.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd pumpfun-deployer-hunter
   vercel
   ```
   
4. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Post-Deployment

### Custom Domain (Optional)
1. Go to your project in Vercel dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### Environment Variables
1. Go to "Settings" → "Environment Variables"
2. Add your API keys
3. Redeploy for changes to take effect

### Monitoring
- Check "Deployments" tab for build logs
- View "Analytics" for usage stats
- Use "Logs" for runtime debugging

## Important Notes

### API Integration Required
Before deployment, you MUST update the API integration in `app/api/tokens/route.ts`:

1. Replace `fetchRecentTokens()` with actual PumpFun API
2. Replace `fetchDeployerHistory()` with actual deployer data fetching
3. Implement real bonding rate calculation

The current version uses mock data for demonstration.

### Rate Limiting
- Consider implementing rate limiting for the API route
- Use Vercel's Edge Config for storing rate limit data
- Add authentication if needed

### Performance Optimization
- The app caches data for 5 minutes by default
- Adjust `CACHE_DURATION` in `route.ts` if needed
- Consider using Vercel's Edge Functions for faster response times

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript has no errors: `npm run build` locally

### API Not Working
- Check function logs in Vercel
- Verify environment variables are set
- Test API route locally first: `http://localhost:3000/api/tokens`

### Styling Issues
- Clear deployment cache in Vercel
- Rebuild project
- Check that Tailwind CSS config is correct

## Automatic Deployments

Once connected to Git:
- **Push to main branch** → Automatic production deployment
- **Push to other branches** → Automatic preview deployment
- Pull requests get preview URLs automatically

## Scaling Considerations

For high traffic:
1. Enable Edge Functions in Vercel
2. Add Redis or similar for caching (Vercel KV)
3. Implement WebSocket for real-time updates
4. Use Vercel's Image Optimization if adding images

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
