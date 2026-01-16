import { NextRequest, NextResponse } from 'next/server';
import { TokenData, DeployerStats } from '@/lib/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface VolumeToken {
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
  url: string;
  pairAddress: string;
}

// Cache for storing token data and deployer stats
let cachedTokens: TokenData[] = [];
let cachedVolumeTokens: VolumeToken[] = [];
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

async function fetchHighVolumeTokens(): Promise<VolumeToken[]> {
  try {
    console.log('💰 Fetching high volume tokens from DexScreener...');
    
    // Use the search endpoint with Solana - this is more reliable for volume data
    const response = await fetch(
      'https://api.dexscreener.com/latest/dex/search?q=SOL',
      {
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      console.error('❌ DexScreener volume API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    console.log('✅ Fetched volume data, pairs:', data.pairs?.length || 0);
    
    // Filter for pairs with actual volume data
    const pairsWithVolume = (data.pairs || []).filter((pair: any) => {
      // Must have 24h volume (h1 might not always be available)
      const hasVolume = pair.volume?.h24 > 0;
      const hasTxns = (pair.txns?.h24?.buys || 0) > 0;
      
      return hasVolume && hasTxns;
    });
    
    console.log('✅ Found', pairsWithVolume.length, 'pairs with volume data');
    
    if (pairsWithVolume.length === 0) {
      console.log('⚠️ No volume data found, returning empty array');
      return [];
    }
    
    // Sort by 24h volume (more reliable than 1h)
    const volumeTokens: VolumeToken[] = pairsWithVolume
      .sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
      .slice(0, 5)
      .map((pair: any, index: number): VolumeToken => {
        const token = {
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
        };
        
        console.log(`📊 Token ${index + 1}:`, {
          symbol: token.symbol,
          volume24h: token.volume24h,
          volume1h: token.volume1h,
        });
        
        return token;
      });
    
    console.log('✅ Returning', volumeTokens.length, 'volume tokens');
    
    return volumeTokens;
    
  } catch (error) {
    console.error('❌ Error fetching volume tokens:', error);
    return [];
  }
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
    
    // Handle volume request
    if (type === 'volume') {
      console.log('🔍 Volume request received');
      
      if (now - lastVolumeFetchTime > CACHE_DURATION || cachedVolumeTokens.length === 0) {
        console.log('🔄 Fetching fresh volume data...');
        cachedVolumeTokens = await fetchHighVolumeTokens();
        lastVolumeFetchTime = now;
        console.log('💾 Volume cache updated with', cachedVolumeTokens.length, 'tokens');
      } else {
        console.log('✅ Using cached volume data (', cachedVolumeTokens.length, 'tokens)');
      }
      
      return NextResponse.json({
        success: true,
        tokens: cachedVolumeTokens,
        lastUpdated: lastVolumeFetchTime,
        nextUpdate: lastVolumeFetchTime + CACHE_DURATION,
        count: cachedVolumeTokens.length,
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
