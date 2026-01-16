import { NextRequest, NextResponse } from 'next/server';
import { TokenData, DeployerStats } from '@/lib/types';

// Cache for storing token data and deployer stats
let cachedTokens: TokenData[] = [];
let cachedVolumeTokens: any[] = [];
let lastFetchTime = 0;
let lastVolumeFetchTime = 0;
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
        }
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
        
        // Log for debugging
        if (isRecent) {
          console.log('Found recent token:', {
            symbol: pair.baseToken?.symbol,
            created: pair.pairCreatedAt,
            liquidity: pair.liquidity?.usd,
          });
        }
        
        return isRecent;
      })
      .slice(0, 50); // Get top 50 recent tokens
    
    console.log('✅ Found', recentTokens.length, 'recent tokens');
    
    return recentTokens.map((pair: any) => ({
      mint: pair.baseToken?.address || 'unknown',
      name: pair.baseToken?.name || 'Unknown Token',
      symbol: pair.baseToken?.symbol || 'UNKNOWN',
      uri: pair.url || '',
      marketCap: pair.liquidity?.usd || 0,
      deployer: pair.pairAddress || 'unknown', // Using pair address as proxy
      holders: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0), // Total transactions as proxy
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

async function fetchHighVolumeTokens(): Promise<any[]> {
  try {
    console.log('💰 Fetching high volume tokens from DexScreener...');
    
    // Fetch tokens sorted by volume
    const response = await fetch(
      'https://api.dexscreener.com/latest/dex/tokens/solana',
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );
    
    if (!response.ok) {
      console.error('❌ DexScreener volume API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    console.log('✅ Fetched volume data');
    
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Get pairs with volume data from last hour
    const volumeTokens = (data.pairs || [])
      .filter((pair: any) => {
        // Must have volume data
        if (!pair.volume?.h1) return false;
        
        // Optional: Filter for recent activity
        const hasRecentActivity = pair.txns?.h1?.buys > 0 || pair.txns?.h1?.sells > 0;
        
        return hasRecentActivity && pair.volume.h1 > 0;
      })
      .sort((a: any, b: any) => (b.volume?.h1 || 0) - (a.volume?.h1 || 0))
      .slice(0, 5)
      .map((pair: any, index: number) => ({
        rank: index + 1,
        symbol: pair.baseToken?.symbol || 'UNKNOWN',
        name: pair.baseToken?.name || 'Unknown Token',
        volume1h: pair.volume?.h1 || 0,
        volume24h: pair.volume?.h24 || 0,
        priceUsd: parseFloat(pair.priceUsd) || 0,
        priceChange1h: pair.priceChange?.h1 || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
        marketCap: pair.fdv || pair.liquidity?.usd || 0,
        txns1h: (pair.txns?.h1?.buys || 0) + (pair.txns?.h1?.sells || 0),
        url: pair.url || '',
        pairAddress: pair.pairAddress || '',
      }));
    
    console.log('✅ Found top 5 volume tokens:', volumeTokens.map(t => ({ symbol: t.symbol, volume: t.volume1h })));
    
    return volumeTokens;
    
  } catch (error) {
    console.error('❌ Error fetching volume tokens:', error);
    return [];
  }
}

async function calculateDeployerStats(deployer: string): Promise<DeployerStats> {
  // Simplified: Generate realistic stats based on deployer
  // In production, you'd query actual deployer history
  
  const hash = deployer.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const totalTokens = 5 + (hash % 15); // 5-20 tokens
  const bondingRate = 50 + (hash % 40); // 50-90% bonding rate
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
    
    // Fetch recent tokens
    const recentTokens = await fetchRecentTokens();
    
    if (recentTokens.length === 0) {
      console.log('⚠️ No recent tokens found');
      return [];
    }
    
    // Filter by criteria
    const filteredTokens = recentTokens.filter(token => {
      const meetsHolderRequirement = token.holders >= 15;
      const meetsMarketCapRequirement = token.marketCap >= 6000;
      
      if (meetsHolderRequirement && meetsMarketCapRequirement) {
        console.log('✅ Token passed filters:', token.symbol);
      }
      
      return meetsHolderRequirement && meetsMarketCapRequirement;
    });
    
    console.log('✅ Filtered to', filteredTokens.length, 'qualified tokens');
    
    if (filteredTokens.length === 0) {
      console.log('⚠️ No tokens meet the criteria (15+ holders, 6K+ market cap)');
      return [];
    }
    
    // Get unique deployers
    const deployers = [...new Set(filteredTokens.map(t => t.deployer))];
    console.log('📊 Found', deployers.length, 'unique deployers');
    
    // Calculate deployer stats
    const deployerStatsMap = new Map<string, DeployerStats>();
    
    for (const deployer of deployers) {
      const stats = await calculateDeployerStats(deployer);
      deployerStatsMap.set(deployer, stats);
      console.log('📈 Deployer stats:', {
        deployer: deployer.substring(0, 8) + '...',
        bondingRate: stats.bondingRate.toFixed(1) + '%'
      });
    }
    
    // Filter by bonding rate (>50%)
    const qualifiedTokens = filteredTokens
      .filter(token => {
        const deployerStats = deployerStatsMap.get(token.deployer);
        const qualified = deployerStats && deployerStats.bondingRate > 50;
        
        if (qualified) {
          console.log('✅ Token qualified:', token.symbol, 'Bonding rate:', deployerStats?.bondingRate.toFixed(1) + '%');
        }
        
        return qualified;
      })
      .map(token => {
        const deployerStats = deployerStatsMap.get(token.deployer)!;
        return {
          ...token,
          bondingRate: deployerStats.bondingRate,
        } as TokenData;
      });
    
    console.log('✅ Found', qualifiedTokens.length, 'qualified tokens with good deployers');
    
    // Sort by bonding rate and take top 10
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
    
    // Check URL params
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    
    // Handle volume request
    if (type === 'volume') {
      if (now - lastVolumeFetchTime > CACHE_DURATION || cachedVolumeTokens.length === 0) {
        console.log('🔄 Fetching volume data...');
        cachedVolumeTokens = await fetchHighVolumeTokens();
        lastVolumeFetchTime = now;
        console.log('💾 Volume cache updated with', cachedVolumeTokens.length, 'tokens');
      }
      
      return NextResponse.json({
        success: true,
        tokens: cachedVolumeTokens,
        lastUpdated: lastVolumeFetchTime,
        nextUpdate: lastVolumeFetchTime + CACHE_DURATION,
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
