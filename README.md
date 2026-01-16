# PumpFun Deployer Hunter (Powered by Claude)

A Next.js application that tracks and ranks PumpFun tokens based on deployer performance and token metrics.

## Features

- 🔍 **Smart Token Scanning**: Automatically scans for tokens meeting specific criteria
- 📊 **Deployer Analysis**: Evaluates deployer bonding rate (must be >50%)
- 🎯 **Token Filtering**: Only shows tokens with 15+ holders and 6K+ market cap
- ⏱️ **Real-time Updates**: Refreshes every 5 minutes
- 🎨 **Futuristic UI**: Cyberpunk-inspired design with animated elements
- 🏆 **Ranked Display**: Top 10 tokens ranked by deployer bonding rate

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Installation

1. Clone the repository or extract the files

2. Install dependencies:
```bash
npm install
```

## Configuration

### PumpFun API Integration

This application requires integration with PumpFun's API. You need to update the following functions in `app/api/tokens/route.ts`:

1. **fetchRecentTokens()**: Replace mock data with actual PumpFun API call
```typescript
async function fetchRecentTokens(): Promise<any[]> {
  const response = await fetch('https://api.pump.fun/tokens/recent?limit=100');
  const data = await response.json();
  return data.tokens;
}
```

2. **fetchDeployerHistory()**: Implement deployer token history fetching
```typescript
async function fetchDeployerHistory(deployer: string): Promise<any[]> {
  const response = await fetch(`https://api.pump.fun/deployer/${deployer}/tokens`);
  return response.json();
}
```

3. **calculateDeployerStats()**: Implement actual bonding rate calculation based on your bonding criteria

### Environment Variables (Optional)

Create a `.env.local` file for any API keys or configuration:

```
PUMPFUN_API_KEY=your_api_key_here
NEXT_PUBLIC_SOLANA_RPC=your_rpc_endpoint
```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Deployment to Vercel

### Quick Deploy

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Go to [Vercel](https://vercel.com)

3. Click "Add New Project"

4. Import your repository

5. Configure environment variables if needed

6. Click "Deploy"

### Using Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. For production deployment:
```bash
vercel --prod
```

## Project Structure

```
pumpfun-deployer-hunter/
├── app/
│   ├── api/
│   │   └── tokens/
│   │       └── route.ts          # Backend API for token analysis
│   ├── globals.css                # Global styles with futuristic theme
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Main page component
├── lib/
│   └── types.ts                   # TypeScript type definitions
├── public/                        # Static assets
├── next.config.js                 # Next.js configuration
├── package.json                   # Dependencies
├── tailwind.config.js             # Tailwind CSS configuration
└── tsconfig.json                  # TypeScript configuration
```

## Token Selection Criteria

The application filters tokens based on:

1. **Age**: Created within the last 60 minutes
2. **Holders**: Minimum 15 holders
3. **Market Cap**: Minimum $6,000
4. **Deployer Performance**: Deployer must have >50% bonding rate on previous tokens

## Ranking System

Tokens are ranked by deployer bonding rate (highest to lowest). Top 10 tokens are displayed.

## Customization

### Update Refresh Interval

In `app/api/tokens/route.ts`, modify:
```typescript
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
```

### Adjust Token Criteria

In `app/api/tokens/route.ts`, modify the filter conditions:
```typescript
const filteredTokens = recentTokens.filter(token => {
  return (
    token.holders >= 15 &&           // Change minimum holders
    token.marketCap >= 6000 &&       // Change minimum market cap
    token.createdAt >= sixtyMinutesAgo
  );
});
```

### Change Minimum Bonding Rate

```typescript
.filter(token => {
  const deployerStats = deployerStatsMap.get(token.deployer);
  return deployerStats && deployerStats.bondingRate > 50; // Change from 50
})
```

## Troubleshooting

### Tokens Not Showing

- Verify API integration is correct
- Check browser console for errors
- Ensure tokens meet all criteria
- Verify the API route is responding at `/api/tokens`

### Styling Issues

- Clear browser cache
- Rebuild the application
- Check that Tailwind CSS is properly configured

## Support

For issues or questions about:
- **Next.js**: [Next.js Documentation](https://nextjs.org/docs)
- **Vercel**: [Vercel Documentation](https://vercel.com/docs)
- **Solana**: [Solana Documentation](https://docs.solana.com)

## License

MIT License - Feel free to use and modify for your needs.
