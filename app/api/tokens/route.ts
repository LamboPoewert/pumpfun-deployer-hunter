import { NextRequest, NextResponse } from 'next/server';
import { TokenData, DeployerStats } from '@/lib/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cache for storing token data
let cachedTokens: TokenData[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

async function generateMockTokens(): Promise<TokenData[]> {
  console.log('🎲 Generating mock PumpFun tokens...');
  
  const tokenNames = [
    { symbol: 'PEPE', name: 'Pepe Coin' },
    { symbol: 'DOGE', name: 'Doge Meme' },
    { symbol: 'SHIB', name: 'Shiba Inu' },
    { symbol: 'FLOKI', name: 'Floki Coin' },
    { symbol: 'BONK', name: 'Bonk Token' },
  ];
  
  const tokens: TokenData[] = [];
  const now = Date.now();
  
  for (let i = 0; i < 5; i++) {
    const token = tokenNames[i];
    const deployer = `CkwPTqR3${i}yGpMtx7LnP9vQz2K4Hd${i}NsFb8Wj6VmXc`;
    const deployerStats = await calculateDeployerStats(deployer);
    
    const tokenData: TokenData = {
      rank: i + 1,
      mint: `7xKXt${i}ZnP9Qm2yVw3Rd5Hc${i}8Lf4Gk6Bj1Ns9TvXm`,
      name: token.name,
      symbol: token.symbol,
      uri: `https://pump.fun/coin/${token.symbol.toLowerCase()}`,
      marketCap: 10000 + (i * 5000),
      deployer: deployer,
      holders: 100 - (i * 15), // 100, 85, 70, 55, 40
      createdAt: now - (i * 10 * 60 * 1000), // 0, 10, 20, 30, 40 minutes ago
      bondingRate: deployerStats.bondingRate,
    };
    
    tokens.push(tokenData);
    
    console.log(`  Created token #${i + 1}:`, {
      symbol: tokenData.symbol,
      holders: tokenData.holders,
      rank: tokenData.rank,
    });
  }
  
  console.log('✅ Successfully generated 5 mock tokens');
  
  return tokens;
}

export async function GET(request: NextRequest) {
  try {
    console.log('📡 API Route /api/tokens called');
    
    const now = Date.now();
    
    // Always generate fresh data
    console.log('🔄 Generating fresh mock data...');
    cachedTokens = await generateMockTokens();
    lastFetchTime = now;
    
    console.log('💾 Returning', cachedTokens.length, 'tokens');
    
    return NextResponse.json({
      success: true,
      tokens: cachedTokens,
      lastUpdated: lastFetchTime,
      nextUpdate: lastFetchTime + CACHE_DURATION,
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate tokens',
        message: error instanceof Error ? error.message : 'Unknown error',
        tokens: [],
      },
      { status: 500 }
    );
  }
}
