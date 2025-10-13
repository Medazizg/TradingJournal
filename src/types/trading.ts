// Trading Journal Types

export interface Stock {
  symbol: string;
  name: string;
  sector?: string;
  marketCap?: number;
  price?: number;
  lastUpdated?: Date;
}

// Trading Account
export interface Account {
  id: string;
  userId: string;
  name: string; // e.g., "Challenge 5k", "Funded 100k"
  startingBalance: number; // e.g., 5000, 100000
  color?: string; // UI tag color
  createdAt: Date;
  updatedAt: Date;
}

export interface Trade {
  id: string;
  userId: string;
  // 🧾 Account - trading account identifier
  accountId?: string;
  
  // 📅 Date - Trading date (string format: "2025-09-29")
  date: string;
  
  // 📈 Symbol - Trading symbol (e.g., "XAUUSD")
  symbol: string;
  
  // 🔄 Type - Trade type ("Buy" / "Sell")
  type: 'Buy' | 'Sell';
  
  // 💰 P&L Amount - Profit/Loss amount
  plAmount: number;
  
  // 🟢 Entry - Entry price
  entry: number;
  
  // 🔴 Exit - Exit price
  exit: number;
  
  // 💸 Fees - Trading fees
  fees: number;
  
  // 🎯 Net P&L - P&L minus fees
  netPL: number;
  
  // 📝 Notes - Optional comments
  notes?: string;
}

export interface FileAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  downloadUrl?: string;
  uploadedAt: Date;
  description?: string;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  totalValue: number;
  totalPnl: number;
  totalPnlPercentage: number;
  holdings: Holding[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Holding {
  stockSymbol: string;
  stockName: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  pnl: number;
  pnlPercentage: number;
  lastUpdated: Date;
}

export interface TradingReport {
  id: string;
  userId: string;
  title: string;
  description?: string;
  reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  startDate: Date;
  endDate: Date;
  
  // Report data
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercentage: number;
  averagePnlPerTrade: number;
  bestTrade: number;
  worstTrade: number;
  
  // File attachments
  attachments?: FileAttachment[];
  
  // Metadata
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockAnalysis {
  id: string;
  userId: string;
  stockSymbol: string;
  stockName: string;
  analysisType: 'FUNDAMENTAL' | 'TECHNICAL' | 'SENTIMENT';
  
  // Analysis data
  rating: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  targetPrice?: number;
  confidence: number; // 0-100
  notes: string;
  
  // Technical indicators
  technicalIndicators?: {
    rsi?: number;
    macd?: number;
    sma50?: number;
    sma200?: number;
    volume?: number;
  };
  
  // Fundamental data
  fundamentals?: {
    pe?: number;
    pb?: number;
    roe?: number;
    debt?: number;
    revenue?: number;
    eps?: number;
  };
  
  // File attachments (charts, reports, etc.)
  attachments?: FileAttachment[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  userId: string;
  currency: string;
  timezone: string;
  defaultCommission: number;
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  notifications: {
    emailReports: boolean;
    priceAlerts: boolean;
    tradeReminders: boolean;
  };
  updatedAt: Date;
}

// Monthly Trading Targets
export interface MonthlyTarget {
  id: string;
  userId: string;
  year: number;
  month: number; // 1-12
  monthName: string; // e.g., "January 2025"
  
  // Financial targets
  pnlTarget: number;
  tradesTarget: number;
  winRateTarget: number;
  
  // Current progress (calculated from trades)
  currentPnL: number;
  currentTrades: number;
  currentWinRate: number;
  
  // Status tracking
  isCompleted: boolean;
  completedAt?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Historical Analytics Data
export interface HistoricalAnalytics {
  userId: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly';
  
  // Date range
  startDate: string;
  endDate: string;
  
  // Aggregated data
  totalTrades: number;
  totalPnL: number;
  totalFees: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averagePnL: number;
  bestTrade: number;
  worstTrade: number;
  
  // Trading consistency
  tradingDays: number;
  averageTradesPerDay: number;
  maxDrawdown: number;
  profitableDays: number;
  
  // Symbol analysis
  topSymbols: Array<{
    symbol: string;
    trades: number;
    pnl: number;
    winRate: number;
  }>;
  
  // Monthly breakdown (for yearly view)
  monthlyBreakdown?: Array<{
    month: number;
    monthName: string;
    trades: number;
    pnl: number;
    winRate: number;
  }>;
}

// Date Range Filter
export interface DateRange {
  startDate: string;
  endDate: string;
  preset?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';
}

// Storage path utilities
export const STORAGE_PATHS = {
  TRADES: (userId: string, tradeId: string) => `users/${userId}/trades/${tradeId}`,
  STOCKS: (userId: string, stockSymbol: string) => `users/${userId}/stocks/${stockSymbol}`,
  REPORTS: (userId: string, reportId: string) => `users/${userId}/reports/${reportId}`,
  BACKUPS: (userId: string, backupId: string) => `users/${userId}/backups/${backupId}`,
  PROFILE: (userId: string) => `users/${userId}/profile`,
  PUBLIC_REPORTS: (reportId: string) => `public/reports/${reportId}`,
} as const;

// File type validation
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: [
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
} as const;

export const FILE_SIZE_LIMITS = {
  PROFILE_IMAGE: 2 * 1024 * 1024, // 2MB
  TRADE_IMAGE: 5 * 1024 * 1024,   // 5MB
  DOCUMENT: 10 * 1024 * 1024,     // 10MB
  REPORT: 20 * 1024 * 1024,       // 20MB
  BACKUP: 50 * 1024 * 1024,       // 50MB
} as const;
