'use client';

import { useState, useEffect } from 'react';
import { TokenData } from '@/lib/types';

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

export default function Home() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [volumeTokens, setVolumeTokens] = useState<VolumeToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [volumeLoading, setVolumeLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [nextUpdate, setNextUpdate] = useState<number>(0);
  const [timeUntilUpdate, setTimeUntilUpdate] = useState<number>(0);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tokens');
      const data = await response.json();
      
      if (data.success) {
        setTokens(data.tokens);
        setLastUpdated(data.lastUpdated);
        setNextUpdate(data.nextUpdate);
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVolumeTokens = async () => {
    try {
      setVolumeLoading(true);
      const response = await fetch('/api/tokens?type=volume');
      const data = await response.json();
      
      if (data.success) {
        setVolumeTokens(data.tokens);
      }
    } catch (error) {
      console.error('Failed to fetch volume tokens:', error);
    } finally {
      setVolumeLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
    fetchVolumeTokens();
    
    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchTokens();
      fetchVolumeTokens();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Update countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((nextUpdate - now) / 1000));
      setTimeUntilUpdate(remaining);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [nextUpdate]);

  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume.toFixed(0)}`;
  };

  const formatPrice = (price: number) => {
    if (price >= 1) {
      return `$${price.toFixed(4)}`;
    } else if (price >= 0.0001) {
      return `$${price.toFixed(6)}`;
    } else {
      return `$${price.toExponential(2)}`;
    }
  };

  return (
    <main className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12 float">
          <h1 className="font-orbitron text-6xl sm:text-7xl md:text-8xl font-black mb-4 glow-text tracking-wider">
            PUMPFUN
          </h1>
          <h2 className="font-orbitron text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mb-2">
            DEPLOYER HUNTER
          </h2>
          <p className="font-rajdhani text-xl text-cyan-400 tracking-wide">
            POWERED BY CLAUDE
          </p>
        </div>

        {/* Status Bar */}
        <div className="hologram rounded-lg p-4 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-400 pulse-glow"></div>
            <span className="font-rajdhani text-lg">
              SYSTEM ACTIVE
            </span>
          </div>
          <div className="font-rajdhani text-lg">
            NEXT UPDATE: <span className="text-cyan-400 font-bold">{formatCountdown(timeUntilUpdate)}</span>
          </div>
          <div className="font-rajdhani text-sm text-gray-400">
            Last scan: {lastUpdated ? formatTimeAgo(lastUpdated) : 'Never'}
          </div>
        </div>

        {/* Good Deployers Section */}
        <div className="mb-12">
          <h3 className="font-orbitron text-3xl font-bold text-center mb-8 tracking-wider">
            <span className="text-white">GOOD</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
              DEPLOYERS
            </span>
          </h3>

          {loading && tokens.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-block">
                <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-rajdhani text-xl text-cyan-400 mt-4">
                  SCANNING BLOCKCHAIN...
                </p>
              </div>
            </div>
          ) : tokens.length === 0 ? (
            <div className="hologram rounded-lg p-12 text-center">
              <p className="font-rajdhani text-2xl text-gray-400">
                NO QUALIFIED TOKENS FOUND
              </p>
              <p className="font-rajdhani text-lg text-gray-500 mt-2">
                Waiting for tokens that meet criteria...
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {tokens.map((token) => (
                <div
                  key={token.mint}
                  className="token-card rounded-lg p-6 relative overflow-hidden"
                >
                  {/* Rank Badge */}
                  <div className="absolute top-4 left-4 rank-badge rounded-full w-14 h-14 flex items-center justify-center">
                    <span className="font-orbitron text-2xl font-black">
                      {token.rank}
                    </span>
                  </div>

                  {/* Token Content */}
                  <div className="ml-20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                      <div>
                        <h4 className="font-orbitron text-2xl font-bold text-cyan-400 mb-1">
                          {token.symbol}
                        </h4>
                        <p className="font-rajdhani text-lg text-gray-300">
                          {token.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-orbitron text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
                          {token.bondingRate.toFixed(1)}%
                        </div>
                        <div className="font-rajdhani text-sm text-gray-400">
                          BONDING RATE
                        </div>
                      </div>
                    </div>

                    {/* Token Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="hologram rounded p-3">
                        <div className="font-rajdhani text-xs text-gray-400 mb-1">
                          MARKET CAP
                        </div>
                        <div className="font-orbitron text-lg font-bold text-purple-400">
                          ${(token.marketCap / 1000).toFixed(1)}K
                        </div>
                      </div>
                      <div className="hologram rounded p-3">
                        <div className="font-rajdhani text-xs text-gray-400 mb-1">
                          HOLDERS
                        </div>
                        <div className="font-orbitron text-lg font-bold text-pink-400">
                          {token.holders}
                        </div>
                      </div>
                      <div className="hologram rounded p-3 col-span-2 sm:col-span-1">
                        <div className="font-rajdhani text-xs text-gray-400 mb-1">
                          CREATED
                        </div>
                        <div className="font-orbitron text-lg font-bold text-cyan-400">
                          {formatTimeAgo(token.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Deployer Info */}
                    <div className="mt-4 pt-4 border-t border-cyan-900">
                      <div className="font-rajdhani text-xs text-gray-400 mb-1">
                        DEPLOYER
                      </div>
                      <div className="font-mono text-sm text-gray-300 break-all">
                        {token.deployer}
                      </div>
                    </div>
                  </div>

                  {/* Animated border effect */}
                  <div className="absolute inset-0 rounded-lg pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* High Volume Section */}
        <div className="mb-12">
          <h3 className="font-orbitron text-3xl font-bold text-center mb-8 tracking-wider">
            <span className="text-white">TOP 5</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              HIGHEST VOLUME
            </span>
            <div className="font-rajdhani text-sm text-gray-400 mt-2 tracking-normal font-normal">
              LAST 60 MINUTES
            </div>
          </h3>

          {volumeLoading && volumeTokens.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-rajdhani text-lg text-yellow-400 mt-3">
                  LOADING VOLUME DATA...
                </p>
              </div>
            </div>
          ) : volumeTokens.length === 0 ? (
            <div className="hologram rounded-lg p-8 text-center">
              <p className="font-rajdhani text-xl text-gray-400">
                NO VOLUME DATA AVAILABLE
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {volumeTokens.map((token) => (
                <div
                  key={token.pairAddress}
                  className="hologram rounded-lg p-5 relative overflow-hidden group hover:border-yellow-400 transition-all duration-300"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                        <span className="font-orbitron text-xl font-black text-gray-900">
                          {token.rank}
                        </span>
                      </div>
                    </div>

                    {/* Token Info */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-orbitron text-xl font-bold text-yellow-400 truncate">
                          {token.symbol}
                        </h4>
                        <span className="font-rajdhani text-sm text-gray-400 truncate">
                          {token.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div>
                          <span className="font-rajdhani text-xs text-gray-500">PRICE</span>
                          <div className="font-mono text-sm text-gray-300">
                            {formatPrice(token.priceUsd)}
                          </div>
                        </div>
                        <div>
                          <span className="font-rajdhani text-xs text-gray-500">1H CHANGE</span>
                          <div className={`font-orbitron text-sm font-bold ${
                            token.priceChange1h >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {token.priceChange1h >= 0 ? '+' : ''}{token.priceChange1h.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Volume Stats */}
                    <div className="flex-shrink-0 text-right">
                      <div className="font-rajdhani text-xs text-gray-500 mb-1">
                        1H VOLUME
                      </div>
                      <div className="font-orbitron text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                        {formatVolume(token.volume1h)}
                      </div>
                      <div className="font-rajdhani text-xs text-gray-400 mt-1">
                        {token.txns1h} txns
                      </div>
                    </div>

                    {/* 24h Volume (smaller) */}
                    <div className="hidden lg:block flex-shrink-0 text-right">
                      <div className="font-rajdhani text-xs text-gray-500 mb-1">
                        24H VOLUME
                      </div>
                      <div className="font-orbitron text-lg font-bold text-gray-400">
                        {formatVolume(token.volume24h)}
                      </div>
                    </div>
                  </div>

                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 font-rajdhani text-sm text-gray-500">
          <p>AUTO-REFRESHING EVERY 5 MINUTES</p>
          <p className="mt-2">
            CRITERIA: 15+ HOLDERS • 6K+ MARKET CAP • 50%+ BONDING RATE • CREATED &lt;60 MIN
          </p>
        </div>
      </div>
    </main>
  );
}
