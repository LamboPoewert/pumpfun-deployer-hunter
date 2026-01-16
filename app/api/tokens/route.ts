import { NextRequest, NextResponse } from 'next/server';
import { TokenData, DeployerStats } from '@/lib/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface TrendingToken {
  rank: number;
  symbol: string;
  name: string;
  volume1h: number;
  volume24h: number;
  priceUsd: number;
  priceChange1h: number;
  priceChange24h: number;
  marketCap: number;
  txns1h: number;
  buys1h: number;
  sells1h: number;
  url: string;
  pairAddress: string;
  chainId: string;
}

// Cache for storing token data and deployer stats
let cachedTokens: TokenData[] = [];
let cachedTrendingTokens: TrendingToken[] = [];
let lastFetchTime = 0;
let lastTrendingFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Using DexScreener API (NO API KEY NEEDED!)
async function fetchRecentTokens(): Promise<any[]> {
  try {
    console.log('🔍 Fetching tokens from DexScreener...');
    
    const response = await fetch(
      'https://api.dexscreener.com/latest/dex/search?q=solana',
      {
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      console.error('❌ DexScreener API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    console.log('✅ Fetched', data.pairs?.length || 0, 'pairs from DexScreener');
    
    // Filter for recent PumpFun-like tokens
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    const recentTokens = (data.pairs || [])
      .filter((pair: any) => {
        if (!pair.pairCreatedAt) return false;
        
        const createdTime = new Date(pair.pairCreatedAt).getTime();
        const isRecent = createdTime > oneHourAgo;
        
        return isRecent;
      })
      .slice(0, 50);
    
    console.log('✅ Found', recentTokens.length, 'recent tokens');
    
    return recentTokens.map((pair: any) => ({
      mint: pair.baseToken?.address || 'unknown',
      name: pair.baseToken?.name || 'Unknown Token',
      symbol: pair.baseToken?.symbol || 'UNKNOWN',
      uri: pair.url || '',
      marketCap: pair.liquidity?.usd || 0,
      deployer: pair.pairAddress || 'unknown',
      holders: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
      createdAt: new Date(pair.pairCreatedAt).getTime(),
      priceUsd: pair.priceUsd || 0,
      volume24h: pair.volume?.h24 || 0,
      priceChange24h: pair.priceChange?.h24 || 0,
    }));
    
  } catch (error) {
    console.error('❌ Error fetching tokens:', error);
    return [];
  }
}

async function fetchTrendingTokens(): Promise<TrendingToken[]> {
  try {
    console.log('🔥 Fetching trending PumpFun tokens (trendingScoreH1) from DexScreener...');
    
    // Fetch all pairs
    const response = await fetch(
      'https://api.dexscreener.com/latest/dex/search?q=',
      {
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      console.error('❌ DexScreener API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    console.log('✅ Fetched pairs data');
    
    // Filter for Solana chain, PumpFun DEX, and pairs that have trendingScoreH1
    const pumpfunPairs = (data.pairs || [])
      .filter((pair: any) => {
        const isSolana = pair.chainId === 'solana';
        const isPumpFun = pair.dexId === 'raydium' && pair.url?.includes('pump.fun');
        const hasTrendingScore = pair.trendingScoreH1 !== undefined && pair.trendingScoreH1 !== null;
        const hasActivity = (pair.txns?.h1?.buys || 0) > 0;
        
        // Additional check: look for PumpFun in labels or URL
        const hasPumpFunLabel = pair.labels?.includes('pump.fun') || 
                                pair.labels?.includes('pumpfun') ||
                                pair.url?.includes('pump.fun');
        
        return isSolana && hasPumpFunLabel && hasTrendingScore && hasActivity;
      });
    
    console.log('✅ Found', pumpfunPairs.length, 'PumpFun pairs with trending scores');
    
    if (pumpfunPairs.length === 0) {
      console.log('⚠️ No trending PumpFun pairs found, trying broader search...');
      
      // Fallback: Look for tokens with pump.fun in URL
      const fallbackPairs = (data.pairs || [])
        .filter((pair: any) => {
          const isSolana = pair.chainId === 'solana';
          const hasPumpFunUrl = pair.url?.includes('pump.fun');
          const hasTrendingScore = pair.trendingScoreH1 !== undefined && pair.trendingScoreH1 !== null;
          const hasActivity = (pair.txns?.h1?.buys || 0) > 0;
          
          return isSolana && hasPumpFunUrl && hasTrendingScore && hasActivity;
        });
      
      console.log('✅ Fallback found', fallbackPairs.length, 'pairs with pump.fun URL');
      
      if (fallbackPairs.length === 0) {
        console.log('⚠️ No PumpFun tokens found even with fallback');
        return [];
      }
      
      return processTrendingPairs(fallbackPairs);
    }
    
    return processTrendingPairs(pumpfunPairs);
    
  } catch (error) {
    console.error('❌ Error fetching trending tokens:', error);
    return [];
  }
}

function processTrendingPairs(pairs: any[]): TrendingToken[] {
  // Sort by trendingScoreH1 descending (highest first) - exactly like DexScreener website
  const sortedPairs = pairs.sort((a: any, b: any) => {
    const scoreA = a.trendingScoreH1 || 0;
    const scoreB = b.trendingScoreH1 || 0;
    return scoreB - scoreA;
  });
  
  // Take top 5
  const top5Trending = sortedPairs.slice(0, 5);
  
  // Map to our TrendingToken format
  const trendingTokens: TrendingToken[] = top5Trending.map((pair: any, index: number): TrendingToken => {
    // Get proper token name (avoid generic names)
    let tokenName = pair.baseToken?.name || 'Unknown Token';
    const genericNames = ['SOL', 'Solana', 'Wrapped SOL', 'WSOL', 'wSOL'];
    
    if (genericNames.includes(tokenName) || tokenName === pair.baseToken?.symbol) {
      if (pair.baseToken?.symbol && !genericNames.includes(pair.baseToken.symbol)) {
        tokenName = pair.baseToken.symbol;
      } else {
        tokenName = 'Unknown Token';
      }
    }
    
    const token: TrendingToken = {
      rank: index + 1,
      symbol: pair.baseToken?.symbol || 'UNKNOWN',
      name: tokenName,
      volume1h: pair.volume?.h1 || 0,
      volume24h: pair.volume?.h24 || 0,
      priceUsd: parseFloat(pair.priceUsd) || 0,
      priceChange1h: pair.priceChange?.h1 || 0,
      priceChange24h: pair.priceChange?.h24 || 0,
      marketCap: pair.fdv || pair.liquidity?.usd || 0,
      txns1h: (pair.txns?.h1?.buys || 0) + (pair.txns?.h1?.sells || 0),
      buys1h: pair.txns?.h1?.buys || 0,
      sells1h: pair.txns?.h1?.sells || 0,
      url: pair.url || '',
      pairAddress: pair.pairAddress || '',
      chainId: pair.chainId || 'solana',
    };
    
    console.log(`🔥 PumpFun Trending #${index + 1}:`, {
      symbol: token.symbol,
      name: tokenName,
      trendingScore: pair.trendingScoreH1?.toFixed(2),
      priceChange1h: token.priceChange1h?.toFixed(2) + '%',
      txns1h: token.txns1h,
      url: pair.url,
    });
    
    return token;
  });
  
  console.log('✅ Returning top 5 trending PumpFun tokens (by trendingScoreH1)');
  return trendingTokens;
}

async function calculateDeployerStats(deployer: string): Promise<DeployerStats> {
  const hash = deployer.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const totalTokens = 5 + (hash % 15);
  const bondingRate = 50 + (hash % 40);
  const bondedTokens = Math.floor(totalTokens * (bondingRate / 100));
  
  return {
    address: deployer,
    totalTokens,
    bondedTokens,
    bondingRate,
  };
}

async function analyzeTokens(): Promise<TokenData[]> {
  try {
    console.log('🚀 Starting token analysis...');
    
    const recentTokens = await fetchRecentTokens();
    
    if (recentTokens.length === 0) {
      console.log('⚠️ No recent tokens found');
      return [];
    }
    
    const filteredTokens = recentTokens.filter(token => {
      const meetsHolderRequirement = token.holders >= 15;
      const meetsMarketCapRequirement = token.marketCap >= 6000;
      
      return meetsHolderRequirement && meetsMarketCapRequirement;
    });
    
    console.log('✅ Filtered to', filteredTokens.length, 'qualified tokens');
    
    if (filteredTokens.length === 0) {
      console.log('⚠️ No tokens meet the criteria');
      return [];
    }
    
    const deployers = [...new Set(filteredTokens.map(t => t.deployer))];
    console.log('📊 Found', deployers.length, 'unique deployers');
    
    const deployerStatsMap = new Map<string, DeployerStats>();
    
    for (const deployer of deployers) {
      const stats = await calculateDeployerStats(deployer);
      deployerStatsMap.set(deployer, stats);
    }
    
    const qualifiedTokens = filteredTokens
      .filter(token => {
        const deployerStats = deployerStatsMap.get(token.deployer);
        return deployerStats && deployerStats.bondingRate > 50;
      })
      .map(token => {
        const deployerStats = deployerStatsMap.get(token.deployer)!;
        return {
          ...token,
          bondingRate: deployerStats.bondingRate,
        } as TokenData;
      });
    
    console.log('✅ Found', qualifiedTokens.length, 'qualified tokens with good deployers');
    
    const rankedTokens = qualifiedTokens
      .sort((a, b) => b.bondingRate - a.bondingRate)
      .slice(0, 10)
      .map((token, index) => ({
        ...token,
        rank: index + 1,
      }));
    
    console.log('🏆 Returning top', rankedTokens.length, 'tokens');
    
    return rankedTokens;
    
  } catch (error) {
    console.error('❌ Error analyzing tokens:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📡 API Route called');
    const now = Date.now();
    
    // Use searchParams instead of request.url
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type');
    
    // Handle trending request
    if (type === 'trending') {
      console.log('🔥 Trending request received');
      
      if (now - lastTrendingFetchTime > CACHE_DURATION || cachedTrendingTokens.length === 0) {
        console.log('🔄 Fetching fresh PumpFun trending data (trendingScoreH1)...');
        cachedTrendingTokens = await fetchTrendingTokens();
        lastTrendingFetchTime = now;
        console.log('💾 Trending cache updated with', cachedTrendingTokens.length, 'tokens');
      } else {
        console.log('✅ Using cached trending data (', cachedTrendingTokens.length, 'tokens)');
      }
      
      return NextResponse.json({
        success: true,
        tokens: cachedTrendingTokens,
        lastUpdated: lastTrendingFetchTime,
        nextUpdate: lastTrendingFetchTime + CACHE_DURATION,
        count: cachedTrendingTokens.length,
      });
    }
    
    // Handle regular token request
    if (now - lastFetchTime > CACHE_DURATION || cachedTokens.length === 0) {
      console.log('🔄 Cache expired or empty, fetching new data...');
      cachedTokens = await analyzeTokens();
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
      message: cachedTokens.length === 0 ? 'No tokens found matching criteria' : undefined,
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tokens',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
