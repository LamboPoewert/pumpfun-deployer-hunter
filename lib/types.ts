export interface TokenData {
  rank: number;
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  marketCap: number;
  deployer: string;
  holders: number;
  createdAt: number;
  bondingRate: number;
  priceUsd?: number;
  volume24h?: number;
  priceChange24h?: number;
}

export interface DeployerStats {
  address: string;
  totalTokens: number;
  bondedTokens: number;
  bondingRate: number;
}
