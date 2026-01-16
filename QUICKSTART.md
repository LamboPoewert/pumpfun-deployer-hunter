# Quick Start Guide - PumpFun Deployer Hunter

## 🚀 Get Running in 5 Minutes

### 1. Prerequisites
- Node.js 18+ installed ([Download here](https://nodejs.org/))
- Code editor (VS Code recommended)
- Git (optional, for deployment)

### 2. Installation

```bash
# Navigate to the project folder
cd pumpfun-deployer-hunter

# Install dependencies
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser 🎉

### 4. What You'll See

- **Futuristic UI** with cyberpunk aesthetics
- **Mock token data** (10+ example tokens)
- **Auto-refresh** every 5 minutes
- **Ranked list** of tokens by bonding rate

### 5. Next Steps

#### For Testing
The app works out of the box with mock data. Perfect for:
- Testing the UI
- Understanding the flow
- Demoing to stakeholders

#### For Production
You need to integrate real PumpFun API:

1. **Read API_INTEGRATION.md** for detailed instructions
2. **Update** `app/api/tokens/route.ts` with real API calls
3. **Add environment variables** in `.env.local`
4. **Test** with real data
5. **Deploy** to Vercel

### 6. Deploy to Vercel

**Super Quick Method:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Dashboard Method:**
1. Push code to GitHub
2. Go to vercel.com
3. Click "Import Project"
4. Select your repo
5. Click "Deploy"

Done! Your app is live 🚀

### 7. Project Structure

```
pumpfun-deployer-hunter/
├── app/
│   ├── api/tokens/route.ts    ← Backend API (UPDATE THIS)
│   ├── page.tsx               ← Main UI
│   └── globals.css            ← Styles
├── lib/types.ts               ← TypeScript types
├── README.md                  ← Full documentation
├── API_INTEGRATION.md         ← API setup guide
└── DEPLOYMENT.md              ← Deployment guide
```

### 8. Common Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check
```

### 9. Troubleshooting

**Port already in use?**
```bash
npm run dev -- -p 3001
```

**Dependencies not installing?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors?**
- Check `tsconfig.json`
- Run `npm run type-check`

### 10. Customization Tips

**Change refresh interval** (app/api/tokens/route.ts):
```typescript
const CACHE_DURATION = 5 * 60 * 1000; // Change to 3 minutes
```

**Adjust token criteria**:
```typescript
token.holders >= 15 &&      // Change minimum holders
token.marketCap >= 6000 &&  // Change minimum market cap
```

**Modify colors** (app/globals.css):
```css
:root {
  --cyber-blue: #00d4ff;     /* Change primary color */
  --cyber-purple: #9d4edd;   /* Change secondary color */
}
```

### 11. Features Overview

✅ **Automatic scanning** every 5 minutes
✅ **Smart filtering** by holders, market cap, and age
✅ **Deployer analysis** with bonding rate calculation
✅ **Real-time countdown** to next update
✅ **Responsive design** for all devices
✅ **Futuristic animations** and effects
✅ **Top 10 ranking** by deployer performance

### 12. Support & Resources

- 📖 **Full docs**: README.md
- 🔌 **API guide**: API_INTEGRATION.md
- 🚀 **Deploy guide**: DEPLOYMENT.md
- 💬 **Need help?** Check the troubleshooting sections

---

**Ready to make it yours?** Start by updating the API integration! 🎯
