// Screener data types
export interface ScreenerRow {
  symbol: string;
  sector: string;
  industry: string;
  description: string;
  price: number;
  nextEarnings: string | null;

  // Options
  expiration: string | null;
  strike: number;
  bid: number;
  ror: number | null;
  oi: number;
  avgOi: number;
  medianOi: number;
  depth: number;
  range: number;

  // Fundamentals
  roic: number;
  piotroskiFScore: number;

  // Scores (1-5 scale)
  optionsScore: number;
  fundamentalsScore: number;
  technicalsScore: number;
  liquidityScore: number;

  // Technicals
  rsi: number;
  bbPercent: number;
  altmanZScore: number;
  smaTrend: number;
  momentum: number;
  sma50: number;
  sma100: number;
  sma200: number;
  pegRatio: number | null;
  analystUpside: number | null;

  // Sparkline data
  priceHistory: number[];
}

export interface ScreenerResponse {
  lastUpdated: string | null;
  count: number;
  data: ScreenerRow[];
}

// Monitor data types
export interface MonitorPosition {
  date: string | null;
  weeksOut: number | string;
  expiry: string | null;
  symbol: string;
  type: 'P' | 'C' | 'STOCK' | string;
  contracts: number;
  strike: number;
  currentPrice: number;
  todayChange: number;
  itmOtm: number;
  roll: string;
  comments: string;
  assignedPrice: number | null;
  qualityScore: number;
  fundamentalsScore: number;
  technicalsScore: number;
}

export interface MonitorResponse {
  lastUpdated: string | null;
  count: number;
  positions: MonitorPosition[];
}

// Metadata types
export interface MetadataResponse {
  expiry: string | null;
  ror: number;
  minOi: number;
  lastUpdated: string | null;
}

// API response types
export interface ApiError {
  error: string;
  code: number;
}

export interface SetParamsResponse {
  success: boolean;
  updated?: string[];
  message: string;
}
