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
    // Search DexScreener for this specific token
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
    
    // Get the first pair's market cap
    const marketCap = pairs[0].fdv || pairs[0].marketCap || pairs[0].liquidity?.usd || 0;
    
    return marketCap;
    
  } catch (error) {
    console.error(`Error fetching market cap for ${tokenMint}:`, error);
    return 0;
  }
}

async function fetchFromBackend(): Promise<TokenData[]> {
  try {
    console.log('🔍 Fetching tokens from Railway backend...');
    console.log('🔗 Backend URL:', BACKEND_URL);
    
    // Call Railway backend
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
    
    console.log('📊 Enriching tokens with DexScreener market cap data...');
    
    // Enrich tokens with market cap from DexScreener
    // Process in batches to avoid rate limits
    const enrichedTokens = [];
    
    for (let i = 0; i < Math.min(backendTokens.length, 20); i++) {
      const token = backendTokens[i];
      
      console.log(`  Fetching market cap for ${token.symbol} (${i + 1}/20)...`);
      
      // Fetch market cap from DexScreener
      const marketCap = await fetchMarketCapFromDexScreener(token.mint);
      
      console.log(`    ${token.symbol}: $${marketCap.toFixed(0)} market cap`);
      
      const creator = token.creator || 'unknown';
      const deployerStats = await calculateDeployerStats(creator);
      
      enrichedTokens.push({
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        uri: `https://pump.fun/${token.mint}`,
        marketCap: marketCap, // Real market cap from DexScreener!
        deployer: creator,
        holders: 1,
        createdAt: token.createdAt,
        bondingRate: deployerStats.bondingRate,
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Enriched', enrichedTokens.length, 'tokens with market cap data');
    
    // Filter by market cap requirement
    const MIN_MARKET_CAP = 15000;
    
    const filteredTokens = enrichedTokens.filter(token => {
      const meetsMarketCap = token.marketCap >= MIN_MARKET_CAP;
      if (meetsMarketCap) {
        console.log(`  ✅ ${token.symbol}: $${token.marketCap.toFixed(0)} (meets 15K requirement)`);
      }
      return meetsMarketCap;
    });
    
    console.log('✅ Filtered to', filteredTokens.length, 'tokens with 15K+ market cap');
    
    if (filteredTokens.length === 0) {
      console.log('⚠️ No tokens meet 15K market cap, showing top 5 by market cap anyway');
      
      // Return top 5 by market cap regardless
      const rankedTokens = enrichedTokens
        .sort((a, b) => b.marketCap - a.marketCap)
        .slice(0, 5)
        .map((token, index) => ({
          ...token,
          rank: index + 1,
        }));
      
      console.log('🏆 Top 5 tokens by market cap:');
      rankedTokens.forEach(token => {
        console.log(`  #${token.rank}: ${token.symbol} - $${token.marketCap.toFixed(0)}`);
      });
      
      return rankedTokens;
    }
    
    // Sort by market cap (highest first) and take top 5
    const rankedTokens = filteredTokens
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 5)
      .map((token, index) => ({
        ...token,
        rank: index + 1,
      }));
    
    console.log('🏆 Top 5 tokens with 15K+ market cap:');
    rankedTokens.forEach(token => {
      console.log(`  #${token.rank}: ${token.symbol} - $${token.marketCap.toFixed(0)} market cap`);
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
      console.log('🔄 Fetching fresh data from backend and enriching with DexScreener...');
      cachedTokens = await fetchFromBackend();
      lastFetchTime = now;
      console.log('💾 Cache updated with', cachedTokens.length, 'tokens');
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
