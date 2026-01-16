import { NextResponse } from 'next/server';

export async function GET() {
  const logs: string[] = [];
  
  try {
    logs.push('1. Starting volume data test...');
    
    // Test DexScreener tokens endpoint
    logs.push('2. Fetching from DexScreener...');
    const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/solana', {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    logs.push(`3. Response status: ${response.status}`);
    
    if (!response.ok) {
      logs.push(`❌ API error: ${response.statusText}`);
      return NextResponse.json({ success: false, logs });
    }
    
    const data = await response.json();
    logs.push(`4. Received data with ${data.pairs?.length || 0} pairs`);
    
    // Check for volume data
    const pairsWithVolume = (data.pairs || []).filter((p: any) => p.volume?.h1 > 0);
    logs.push(`5. Found ${pairsWithVolume.length} pairs with hourly volume`);
    
    // Get top 5
    const top5 = pairsWithVolume
      .sort((a: any, b: any) => (b.volume?.h1 || 0) - (a.volume?.h1 || 0))
      .slice(0, 5)
      .map((p: any) => ({
        symbol: p.baseToken?.symbol,
        volume1h: p.volume?.h1,
        txns: p.txns?.h1?.buys + p.txns?.h1?.sells,
      }));
    
    logs.push(`6. Top 5 tokens by volume:`);
    top5.forEach((t: any) => {
      logs.push(`   - ${t.symbol}: $${t.volume1h?.toFixed(0)} (${t.txns} txns)`);
    });
    
    return NextResponse.json({
      success: true,
      logs,
      totalPairs: data.pairs?.length,
      pairsWithVolume: pairsWithVolume.length,
      top5,
      samplePair: data.pairs?.[0],
    });
    
  } catch (error) {
    logs.push(`❌ Error: ${error}`);
    return NextResponse.json({ 
      success: false, 
      logs, 
      error: String(error) 
    });
  }
}
