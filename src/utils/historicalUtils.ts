import type { Trade, HistoricalAnalytics, DateRange } from '../types/trading';

// Date utilities
export const getMonthName = (month: number): string => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[month - 1] || 'Unknown';
};

export const getCurrentMonth = (): { year: number; month: number; monthName: string } => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return {
    year,
    month,
    monthName: `${getMonthName(month)} ${year}`
  };
};

export const getMonthKey = (year: number, month: number): string => {
  return `${year}-${month.toString().padStart(2, '0')}`;
};

// Filter trades by date range
export const filterTradesByDateRange = (trades: Trade[], dateRange: DateRange): Trade[] => {
  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);
  
  return trades.filter(trade => {
    const tradeDate = new Date(trade.date);
    return tradeDate >= startDate && tradeDate <= endDate;
  });
};

// Group trades by month
export const groupTradesByMonth = (trades: Trade[]): Map<string, Trade[]> => {
  const grouped = new Map<string, Trade[]>();
  
  trades.forEach(trade => {
    const date = new Date(trade.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = getMonthKey(year, month);
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(trade);
  });
  
  return grouped;
};

// Group trades by year
export const groupTradesByYear = (trades: Trade[]): Map<number, Trade[]> => {
  const grouped = new Map<number, Trade[]>();
  
  trades.forEach(trade => {
    const year = new Date(trade.date).getFullYear();
    
    if (!grouped.has(year)) {
      grouped.set(year, []);
    }
    grouped.get(year)!.push(trade);
  });
  
  return grouped;
};

// Calculate basic trade statistics
export const calculateTradeStats = (trades: Trade[]) => {
  const totalTrades = trades.length;
  const totalPnL = trades.reduce((sum, trade) => sum + trade.netPL, 0);
  const totalFees = trades.reduce((sum, trade) => sum + trade.fees, 0);
  const winningTrades = trades.filter(t => t.netPL > 0).length;
  const losingTrades = trades.filter(t => t.netPL < 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.netPL)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.netPL)) : 0;
  const averagePnL = totalTrades > 0 ? totalPnL / totalTrades : 0;
  
  return {
    totalTrades,
    totalPnL,
    totalFees,
    winningTrades,
    losingTrades,
    winRate,
    bestTrade,
    worstTrade,
    averagePnL,
  };
};

// Calculate symbol performance
export const calculateSymbolPerformance = (trades: Trade[]) => {
  const symbolMap = new Map<string, { trades: number; pnl: number; winningTrades: number }>();
  
  trades.forEach(trade => {
    const existing = symbolMap.get(trade.symbol) || { trades: 0, pnl: 0, winningTrades: 0 };
    symbolMap.set(trade.symbol, {
      trades: existing.trades + 1,
      pnl: existing.pnl + trade.netPL,
      winningTrades: existing.winningTrades + (trade.netPL > 0 ? 1 : 0)
    });
  });
  
  return Array.from(symbolMap.entries()).map(([symbol, data]) => ({
    symbol,
    trades: data.trades,
    pnl: data.pnl,
    winRate: data.trades > 0 ? (data.winningTrades / data.trades) * 100 : 0
  })).sort((a, b) => b.pnl - a.pnl);
};

// Calculate max drawdown
export const calculateMaxDrawdown = (trades: Trade[]): number => {
  if (trades.length === 0) return 0;
  
  const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let peak = 0;
  let runningTotal = 0;
  let maxDrawdown = 0;
  
  sortedTrades.forEach(trade => {
    runningTotal += trade.netPL;
    if (runningTotal > peak) {
      peak = runningTotal;
    }
    const drawdown = peak - runningTotal;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });
  
  return maxDrawdown;
};

// Calculate trading days and consistency metrics
export const calculateTradingConsistency = (trades: Trade[]) => {
  const uniqueDates = new Set(trades.map(trade => trade.date));
  const tradingDays = uniqueDates.size;
  const averageTradesPerDay = tradingDays > 0 ? trades.length / tradingDays : 0;
  
  // Count profitable days
  const dayPnL = new Map<string, number>();
  trades.forEach(trade => {
    const date = trade.date;
    dayPnL.set(date, (dayPnL.get(date) || 0) + trade.netPL);
  });
  
  const profitableDays = Array.from(dayPnL.values()).filter(pnl => pnl > 0).length;
  
  return {
    tradingDays,
    averageTradesPerDay,
    profitableDays
  };
};

// Generate historical analytics for a given timeframe
export const generateHistoricalAnalytics = (
  userId: string,
  trades: Trade[],
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly',
  dateRange: DateRange
): HistoricalAnalytics => {
  const filteredTrades = filterTradesByDateRange(trades, dateRange);
  const basicStats = calculateTradeStats(filteredTrades);
  const symbolPerformance = calculateSymbolPerformance(filteredTrades);
  const maxDrawdown = calculateMaxDrawdown(filteredTrades);
  const consistency = calculateTradingConsistency(filteredTrades);
  
  let monthlyBreakdown: Array<{
    month: number;
    monthName: string;
    trades: number;
    pnl: number;
    winRate: number;
  }> | undefined;
  
  if (timeframe === 'yearly') {
    const monthlyGroups = groupTradesByMonth(filteredTrades);
    monthlyBreakdown = [];
    
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(dateRange.startDate);
      const year = startDate.getFullYear();
      const key = getMonthKey(year, month);
      const monthTrades = monthlyGroups.get(key) || [];
      const monthStats = calculateTradeStats(monthTrades);
      
      monthlyBreakdown.push({
        month,
        monthName: getMonthName(month),
        trades: monthStats.totalTrades,
        pnl: monthStats.totalPnL,
        winRate: monthStats.winRate
      });
    }
  }
  
  return {
    userId,
    timeframe,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    ...basicStats,
    maxDrawdown,
    ...consistency,
    topSymbols: symbolPerformance.slice(0, 10), // Top 10 symbols
    monthlyBreakdown
  };
};

// Get preset date ranges
export const getPresetDateRange = (preset: string): DateRange => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  switch (preset) {
    case 'today':
      return { startDate: today, endDate: today, preset: 'today' };
    
    case 'week': {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { 
        startDate: weekAgo.toISOString().split('T')[0], 
        endDate: today, 
        preset: 'week' 
      };
    }
    
    case 'month': {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      return { 
        startDate: monthAgo.toISOString().split('T')[0], 
        endDate: today, 
        preset: 'month' 
      };
    }
    
    case 'quarter': {
      const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      return { 
        startDate: quarterAgo.toISOString().split('T')[0], 
        endDate: today, 
        preset: 'quarter' 
      };
    }
    
    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { 
        startDate: yearStart.toISOString().split('T')[0], 
        endDate: today, 
        preset: 'year' 
      };
    }
    
    case 'all':
    default:
      return { 
        startDate: '2020-01-01', 
        endDate: today, 
        preset: 'all' 
      };
  }
};
