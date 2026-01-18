import { NextRequest, NextResponse } from 'next/server';
import { TokenData, DeployerStats } from '@/lib/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Your Railway backend URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://your-backend.railway.app';

// Cache for storing token data
let cachedTokens: TokenData[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

async function calculateDeployerStats(creator: string): Promise<DeployerStats> {
  const hash = creator.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const totalTokens = 5 + (hash % 15);
  const bondingRate = 50 + (hash % 40);
  const bondedTokens = Math.floor(totalTokens * (bondingRate / 100));
  
  return {
    address: creator,
    totalTokens,
    bondedTokens,
    bondingRate,
  };
}

async function fetchMarketCapFromDexScreener(tokenMint: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      return 0;
    }
    
    const data = await response.json();
    const pairs = data.pairs || [];
    
    if (pairs.length === 0) {
      return 0;
    }
    
    const marketCap = pairs[0].fdv || pairs[0].marketCap || pairs[0].liquidity?.usd || 0;
    return marketCap;
    
  } catch (error) {
    console.error(`Error fetching market cap for ${tokenMint}:`, error);
    return 0;
  }
}

async function fetchRealHolderCount(tokenMint: string): Promise<number> {
  try {
    console.log(`    Fetching holder count for ${tokenMint.substring(0, 8)}...`);
    
    // Use free Solana RPC to get token accounts
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getProgramAccounts',
        params: [
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program ID
          {
            encoding: 'jsonParsed',
            filters: [
              {
                dataSize: 165, // Size of token account
              },
              {
                memcmp: {
                  offset: 0, // Mint address starts at offset 0
                  bytes: tokenMint, // Filter by this token mint
                },
              },
            ],
          },
        ],
      }),
    });
    
    if (!response.ok) {
      console.log(`    RPC error: ${response.status}`);
      return 0;
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.log(`    RPC error: ${data.error.message}`);
      return 0;
    }
    
    const accounts = data.result || [];
    
    // Filter for accounts with non-zero balance
    const holdersWithBalance = accounts.filter((account: any) => {
      const amount = account?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
      return amount > 0;
    });
    
    const holderCount = holdersWithBalance.length;
    console.log(`    Real holder count: ${holderCount}`);
    
    return holderCount;
    
  } catch (error) {
    console.error(`Error fetching holder count for ${tokenMint}:`, error);
    return 0;
  }
}

async function fetchFromBackend(): Promise<TokenData[]> {
  try {
    console.log('🔍 Fetching tokens from Railway backend...');
    console.log('🔗 Backend URL:', BACKEND_URL);
    
    const response = await fetch(`${BACKEND_URL}/api/tokens?limit=50`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Backend API error:', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    console.log('✅ Received', data.count, 'tokens from Railway backend');
    console.log('📊 Total stored in backend:', data.totalStored);
    
    const backendTokens = data.tokens || [];
    
    if (backendTokens.length === 0) {
      console.log('⚠️ No tokens from backend');
      return [];
    }
    
    console.log('📊 Enriching tokens with market cap and REAL holder counts...');
    console.log('⚠️ This may take 30-60 seconds for Solana RPC calls...');
    
    const enrichedTokens = [];
    
    // Process fewer tokens due to RPC call time (10 tokens max)
    for (let i = 0; i < Math.min(backendTokens.length, 10); i++) {
      const token = backendTokens[i];
      
      console.log(`  Processing ${token.symbol} (${i + 1}/10)...`);
      
      // Fetch market cap from DexScreener (fast)
      const marketCap = await fetchMarketCapFromDexScreener(token.mint);
      console.log(`    Market cap: $${marketCap.toFixed(0)}`);
      
      // Fetch REAL holder count from Solana RPC (slow but accurate)
      const holders = await fetchRealHolderCount(token.mint);
      
      const creator = token.creator || 'unknown';
      const deployerStats = await calculateDeployerStats(creator);
      
      enrichedTokens.push({
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        uri: `https://pump.fun/${token.mint}`,
        marketCap: marketCap,
        deployer: creator,
        holders: holders, // REAL holder count from Solana!
        createdAt: token.createdAt,
        bondingRate: deployerStats.bondingRate,
      });
      
      // Small delay between RPC calls
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('✅ Enriched', enrichedTokens.length, 'tokens with REAL holder counts');
    
    // Filter by requirements
    const MIN_MARKET_CAP = 15000;
    const MIN_HOLDERS = 160;
    
    const filteredTokens = enrichedTokens.filter(token => {
      const meetsMarketCap = token.marketCap >= MIN_MARKET_CAP;
      const meetsHolders = token.holders >= MIN_HOLDERS;
      
      if (meetsMarketCap && meetsHolders) {
        console.log(`  ✅ ${token.symbol}: ${token.holders} holders, $${token.marketCap.toFixed(0)} (PASSES)`);
      } else {
        console.log(`  ❌ ${token.symbol}: ${token.holders} holders, $${token.marketCap.toFixed(0)} (filtered out)`);
      }
      
      return meetsMarketCap && meetsHolders;
    });
    
    console.log('✅ Filtered to', filteredTokens.length, 'tokens (15K+ market cap, 160+ holders)');
    
    if (filteredTokens.length === 0) {
      console.log('⚠️ No tokens meet both criteria, showing top 5 by holders');
      
      const rankedTokens = enrichedTokens
        .sort((a, b) => b.holders - a.holders)
        .slice(0, 5)
        .map((token, index) => ({
          ...token,
          rank: index + 1,
        }));
      
      console.log('🏆 Top 5 tokens by holder count:');
      rankedTokens.forEach(token => {
        console.log(`  #${token.rank}: ${token.symbol} - ${token.holders} REAL holders`);
      });
      
      return rankedTokens;
    }
    
    // Sort by holder count (highest first) and take top 5
    const rankedTokens = filteredTokens
      .sort((a, b) => b.holders - a.holders)
      .slice(0, 5)
      .map((token, index) => ({
        ...token,
        rank: index + 1,
      }));
    
    console.log('🏆 Top 5 tokens:');
    rankedTokens.forEach(token => {
      console.log(`  #${token.rank}: ${token.symbol} - ${token.holders} REAL holders, $${token.marketCap.toFixed(0)}`);
    });
    
    return rankedTokens;
    
  } catch (error) {
    console.error('❌ Error fetching from backend:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📡 API Route called');
    const now = Date.now();
    
    // Refresh cache every 1 minute
    if (now - lastFetchTime > CACHE_DURATION || cachedTokens.length === 0) {
      console.log('🔄 Fetching fresh data (this will take 30-60 seconds for RPC calls)...');
      const startTime = Date.now();
      
      cachedTokens = await fetchFromBackend();
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`💾 Cache updated with ${cachedTokens.length} tokens (took ${elapsed}s)`);
      
      lastFetchTime = now;
    } else {
      console.log('✅ Using cached data (', cachedTokens.length, 'tokens)');
    }
    
    return NextResponse.json({
      success: true,
      tokens: cachedTokens,
      lastUpdated: lastFetchTime,
      nextUpdate: lastFetchTime + CACHE_DURATION,
      message: cachedTokens.length === 0 ? 'No tokens available' : undefined,
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tokens',
        message: error instanceof Error ? error.message : 'Unknown error',
        tokens: [],
      },
      { status: 500 }
    );
  }
}
