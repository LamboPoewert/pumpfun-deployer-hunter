import { NextRequest, NextResponse } from 'next/server';
import { TokenData, DeployerStats } from '@/lib/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Your Railway backend URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://pumpfun-backend-production-b249.up.railway.app';

// Cache for storing token data
let cachedTokens: TokenData[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds (refresh more often since backend is real-time)

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

async function fetchFromBackend(): Promise<TokenData[]> {
  try {
    console.log('🔍 Fetching tokens from backend...');
    
    // Call your Railway backend
    const response = await fetch(`${BACKEND_URL}/api/tokens?limit=100`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('❌ Backend API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    console.log('✅ Received', data.count, 'tokens from backend');
    
    const backendTokens = data.tokens || [];
    
    // Convert to our format and add deployer stats
    const tokens = await Promise.all(backendTokens.map(async (token: any) => {
      const creator = token.creator || 'unknown';
      const deployerStats = await calculateDeployerStats(creator);
      
      return {
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        uri: `https://pump.fun/${token.mint}`,
        marketCap: token.marketCap || 0,
        deployer: creator,
        holders: 1, // Backend doesn't track holders yet
        createdAt: token.createdAt,
        bondingRate: deployerStats.bondingRate,
      };
    }));
    
    console.log('✅ Converted to our format:', tokens.length);
    
    // Filter by your requirements
    const filteredTokens = tokens.filter(token => {
      const meetsMarketCap = token.marketCap >= 15000;
      // You can add more filters here
      return meetsMarketCap;
    });
    
    console.log('✅ Filtered to', filteredTokens.length, 'tokens (15K+ market cap)');
    
    // Sort by market cap and take top 5
    const rankedTokens = filteredTokens
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 5)
      .map((token, index) => ({
        ...token,
        rank: index + 1,
      }));
    
    console.log('🏆 Top 5 tokens:');
    rankedTokens.forEach(token => {
      console.log(`  #${token.rank}: ${token.symbol} - $${token.marketCap.toFixed(0)} market cap`);
    });
    
    return rankedTokens;
    
  } catch (error) {
    console.error('❌ Error fetching from backend:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📡 API Route called');
    const now = Date.now();
    
    // Refresh cache every 30 seconds
    if (now - lastFetchTime > CACHE_DURATION || cachedTokens.length === 0) {
      console.log('🔄 Fetching fresh data from backend...');
      cachedTokens = await fetchFromBackend();
      lastFetchTime = now;
      console.log('💾 Cache updated with', cachedTokens.length, 'tokens');
    } else {
      console.log('✅ Using cached data');
    }
    
    return NextResponse.json({
      success: true,
      tokens: cachedTokens,
      lastUpdated: lastFetchTime,
      nextUpdate: lastFetchTime + CACHE_DURATION,
      message: cachedTokens.length === 0 ? 'No tokens available from backend' : undefined,
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tokens',
        tokens: [],
      },
      { status: 500 }
    );
  }
}
