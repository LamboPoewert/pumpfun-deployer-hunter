export interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  marketCap: number;
  deployer: string;
  holders: number;
  bondingRate: number;
  createdAt: number;
  rank: number;
}

export interface DeployerStats {
  address: string;
  totalTokens: number;
  bondedTokens: number;
  bondingRate: number;
}
