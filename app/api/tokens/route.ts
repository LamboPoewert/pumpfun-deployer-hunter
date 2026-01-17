import { NextRequest, NextResponse } from 'next/server';
import { TokenData, DeployerStats } from '@/lib/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cache for storing token data
let cachedTokens: TokenData[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function testPumpFunAPI(): Promise<void> {
  console.log('🧪 Testing PumpFun API endpoint...');
  
  try {
    const response = await fetch('https://frontend-api.pump.fun/coins?limit=10&includeNsfw=false', {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('📡 Response body (first 500 chars):', text.substring(0, 500));
    
    try {
      const json = JSON.parse(text);
      console.log('📡 Parsed JSON:', json);
      console.log('📡 Data type:', typeof json, Array.isArray(json) ? 'Array' : 'Object');
      if (Array.isArray(json)) {
        console.log('📡 Array length:', json.length);
        if (json.length > 0) {
          console.log('📡 First item:', JSON.stringify(json[0], null, 2));
        }
      }
    } catch (parseError) {
      console.log('❌ Failed to parse as JSON:', parseError);
    }
  } catch (error) {
    console.log('❌ Fetch error:', error);
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

async function generateMockTokens(): Promise<TokenData[]> {
  console.log('🎲 Generating mock tokens as fallback...');
  
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
    
    tokens.push({
      rank: i + 1,
      mint: `7xKXt${i}ZnP9Qm2yVw3Rd5Hc${i}8Lf4Gk6Bj1Ns9TvXm`,
      name: token.name,
      symbol: token.symbol,
      uri: `https://pump.fun/coin/${token.symbol.toLowerCase()}`,
      marketCap: 10000 + (i * 5000),
      deployer: deployer,
      holders: 100 - (i * 15),
      createdAt: now - (i * 10 * 60 * 1000),
      bondingRate: deployerStats.bondingRate,
    });
  }
  
  console.log('✅ Generated 5 mock tokens');
  return tokens;
}

export async function GET(request: NextRequest) {
  try {
    console.log('========================================');
    console.log('📡 API Route /api/tokens called');
    console.log('========================================');
    
    const now = Date.now();
    
    // Test the API first
    await testPumpFunAPI();
    
    // For now, use mock data
    console.log('🔄 Using mock data...');
    cachedTokens = await generateMockTokens();
    lastFetchTime = now;
    
    console.log('💾 Returning', cachedTokens.length, 'tokens');
    console.log('========================================');
    
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
        error: 'Failed to fetch tokens',
        message: error instanceof Error ? error.message : 'Unknown error',
        tokens: [],
      },
      { status: 500 }
    );
  }
}
