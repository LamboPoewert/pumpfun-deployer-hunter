# PumpFun API Integration Guide

This guide explains how to integrate real PumpFun API endpoints into your application.

## Overview

The application currently uses mock data. You need to replace the placeholder functions in `app/api/tokens/route.ts` with actual API calls to PumpFun.

## Required API Endpoints

### 1. Fetch Recent Tokens

**Purpose**: Get all tokens created in the last 60 minutes

**Implementation Needed**:
```typescript
async function fetchRecentTokens(): Promise<any[]> {
  // Example implementation (adjust based on actual PumpFun API)
  const response = await fetch('https://api.pump.fun/tokens/recent', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Add API key if required
      // 'Authorization': `Bearer ${process.env.PUMPFUN_API_KEY}`
    },
    params: {
      limit: 100,
      timeRange: '1h'
    }
  });
  
  const data = await response.json();
  
  // Transform data to match expected format
  return data.tokens.map(token => ({
    mint: token.mint_address,
    name: token.name,
    symbol: token.symbol,
    uri: token.metadata_uri,
    marketCap: token.market_cap,
    deployer: token.creator_address,
    holders: token.holder_count,
    createdAt: token.created_timestamp,
  }));
}
```

### 2. Fetch Deployer History

**Purpose**: Get all tokens previously created by a deployer

**Implementation Needed**:
```typescript
async function fetchDeployerHistory(deployer: string): Promise<any[]> {
  // Option A: Using PumpFun API
  const response = await fetch(`https://api.pump.fun/deployer/${deployer}/tokens`, {
    headers: {
      'Content-Type': 'application/json',
    }
  });
  
  return response.json();
  
  // Option B: Using Solana blockchain directly
  // const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!);
  // const publicKey = new PublicKey(deployer);
  // const transactions = await connection.getSignaturesForAddress(publicKey);
  // // Parse transactions to find token creation events
}
```

### 3. Check Token Bonding Status

**Purpose**: Determine if a token has bonded/migrated to Raydium

**Implementation Needed**:
```typescript
async function isTokenBonded(mint: string): Promise<boolean> {
  // Check if token has graduated from PumpFun to Raydium
  
  // Option A: PumpFun API
  const response = await fetch(`https://api.pump.fun/tokens/${mint}/status`);
  const data = await response.json();
  return data.bonded || data.graduated;
  
  // Option B: Check Raydium liquidity pools
  // const raydiumResponse = await fetch(`https://api.raydium.io/v2/main/pairs?mint=${mint}`);
  // const pairs = await raydiumResponse.json();
  // return pairs.length > 0;
}
```

### 4. Calculate Deployer Stats

**Implementation Needed**:
```typescript
async function calculateDeployerStats(deployer: string): Promise<DeployerStats> {
  const deployerTokens = await fetchDeployerHistory(deployer);
  
  let bondedCount = 0;
  
  // Check bonding status for each token
  for (const token of deployerTokens) {
    const isBonded = await isTokenBonded(token.mint);
    if (isBonded) {
      bondedCount++;
    }
  }
  
  const totalTokens = deployerTokens.length;
  const bondingRate = totalTokens > 0 ? (bondedCount / totalTokens) * 100 : 0;
  
  return {
    address: deployer,
    totalTokens,
    bondedTokens: bondedCount,
    bondingRate,
  };
}
```

## Alternative: Using Solana Web3.js Directly

If PumpFun doesn't provide public APIs, you can query the Solana blockchain directly:

### Setup
```typescript
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com'
);
```

### Find Token Creation Transactions
```typescript
async function getDeployerTokens(deployer: string): Promise<string[]> {
  const publicKey = new PublicKey(deployer);
  
  // Get all signatures for this address
  const signatures = await connection.getSignaturesForAddress(publicKey, {
    limit: 1000
  });
  
  const tokenMints: string[] = [];
  
  // Parse transactions to find token creations
  for (const sig of signatures) {
    const tx = await connection.getParsedTransaction(sig.signature);
    
    if (!tx) continue;
    
    // Look for token mint instructions
    for (const instruction of tx.transaction.message.instructions) {
      if ('parsed' in instruction) {
        if (instruction.parsed.type === 'initializeMint') {
          tokenMints.push(instruction.parsed.info.mint);
        }
      }
    }
  }
  
  return tokenMints;
}
```

## Rate Limiting & Caching

To avoid hitting API rate limits:

```typescript
// Use a simple in-memory cache with TTL
const cache = new Map<string, { data: any; expiry: number }>();

async function cachedFetch(key: string, fetcher: () => Promise<any>, ttl: number = 60000) {
  const cached = cache.get(key);
  
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, expiry: Date.now() + ttl });
  
  return data;
}

// Usage
const tokens = await cachedFetch('recent-tokens', fetchRecentTokens, 5 * 60 * 1000);
```

## Error Handling

Implement robust error handling:

```typescript
async function fetchRecentTokens(): Promise<any[]> {
  try {
    const response = await fetch('https://api.pump.fun/tokens/recent', {
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch tokens:', error);
    
    // Return empty array or cached data
    return [];
  }
}
```

## Environment Variables

Create `.env.local`:

```env
# PumpFun API (if available)
PUMPFUN_API_KEY=your_api_key_here
PUMPFUN_API_URL=https://api.pump.fun

# Solana RPC
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com

# Or use a paid RPC for better performance
# NEXT_PUBLIC_SOLANA_RPC=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

## Testing Your Integration

1. **Test API endpoints individually**:
```bash
# Test in your terminal
curl https://api.pump.fun/tokens/recent
```

2. **Test in your app**:
```typescript
// Add a test endpoint in app/api/test/route.ts
export async function GET() {
  const tokens = await fetchRecentTokens();
  return NextResponse.json({ count: tokens.length, tokens });
}
```

3. **Check logs**:
```bash
# Development
npm run dev

# Check Vercel logs after deployment
vercel logs your-deployment-url
```

## Resources

- **Solana Web3.js**: https://solana-labs.github.io/solana-web3.js/
- **Solana RPC Methods**: https://docs.solana.com/api/http
- **Raydium API**: https://docs.raydium.io/
- **Jupiter API** (for token data): https://station.jup.ag/docs/apis/

## Next Steps

1. Research PumpFun's actual API documentation
2. Set up API authentication if required
3. Test with small datasets first
4. Implement proper error handling
5. Add retry logic for failed requests
6. Consider using a queue for processing large datasets
7. Monitor API usage and costs

## Need Help?

- Check PumpFun's official documentation
- Join their Discord/Telegram for API support
- Consider using existing SDKs if available
- Look at other projects using similar APIs for reference
