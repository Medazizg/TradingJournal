import type { Trade } from '../types/trading';

// 📈 Trading Utilities for Your Trading Journal

/**
 * Create a new trade entry with all required fields
 */
export const createNewTrade = (
  userId: string,
  symbol: string,
  type: Trade['type'],
  plAmount: number,
  entry: number,
  exit: number,
  fees: number,
  notes?: string
): Omit<Trade, 'id'> => {
  const netPL = plAmount - fees;
  
  return {
    userId,
    date: new Date().toISOString().split('T')[0], // String format: "2025-09-29"
    symbol: symbol.toUpperCase(),
    type,
    plAmount,
    entry,
    exit,
    fees,
    netPL,
    notes: notes || '',
  };
};

/**
 * Format currency values for display
 */
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format percentage values for display
 */
export const formatPercentage = (percentage: number): string => {
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(2)}%`;
};

/**
 * Get color class based on P&L value
 */
export const getPnLColor = (pnl: number): string => {
  if (pnl > 0) return 'text-green-600';
  if (pnl < 0) return 'text-red-600';
  return 'text-gray-600';
};

/**
 * Calculate trade metrics for a single trade
 */
export const calculateTradeMetrics = (trade: Trade) => {
  const { type, quantity, entryPrice, exitPrice, fees } = trade;
  
  if (!exitPrice) {
    return {
      pnlAmount: 0,
      netPnl: -fees,
      pnlPercentage: 0,
      isOpen: true,
      totalInvestment: entryPrice * quantity,
    };
  }
  
  let pnlAmount = 0;
  
  if (type === 'BUY' || type === 'LONG') {
    pnlAmount = (exitPrice - entryPrice) * quantity;
  } else if (type === 'SELL' || type === 'SHORT') {
    pnlAmount = (entryPrice - exitPrice) * quantity;
  }
  
  const netPnl = pnlAmount - fees;
  const totalInvestment = entryPrice * quantity;
  const pnlPercentage = totalInvestment > 0 ? (netPnl / totalInvestment) * 100 : 0;
  
  return {
    pnlAmount,
    netPnl,
    pnlPercentage,
    isOpen: false,
    totalInvestment,
  };
};

/**
 * Validate trade data before submission
 */
export const validateTradeData = (trade: Partial<Trade>): string[] => {
  const errors: string[] = [];
  
  if (!trade.symbol || trade.symbol.trim() === '') {
    errors.push('Stock symbol is required');
  }
  
  if (!trade.type) {
    errors.push('Trade type is required');
  }
  
  if (!trade.quantity || trade.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  if (!trade.entryPrice || trade.entryPrice <= 0) {
    errors.push('Entry price must be greater than 0');
  }
  
  if (trade.fees === undefined || trade.fees < 0) {
    errors.push('Fees must be 0 or greater');
  }
  
  if (!trade.date) {
    errors.push('Trade date is required');
  }
  
  return errors;
};

/**
 * Filter trades by various criteria
 */
export const filterTrades = (
  trades: Trade[],
  filters: {
    symbol?: string;
    type?: Trade['type'];
    status?: Trade['status'];
    startDate?: Date;
    endDate?: Date;
  }
): Trade[] => {
  return trades.filter((trade) => {
    if (filters.symbol && trade.symbol !== filters.symbol.toUpperCase()) {
      return false;
    }
    
    if (filters.type && trade.type !== filters.type) {
      return false;
    }
    
    if (filters.status && trade.status !== filters.status) {
      return false;
    }
    
    if (filters.startDate && trade.date < filters.startDate) {
      return false;
    }
    
    if (filters.endDate && trade.date > filters.endDate) {
      return false;
    }
    
    return true;
  });
};

/**
 * Sort trades by various criteria
 */
export const sortTrades = (
  trades: Trade[],
  sortBy: 'date' | 'symbol' | 'pnl' | 'type',
  order: 'asc' | 'desc' = 'desc'
): Trade[] => {
  const sortedTrades = [...trades];
  
  sortedTrades.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = a.date.getTime() - b.date.getTime();
        break;
      case 'symbol':
        comparison = a.symbol.localeCompare(b.symbol);
        break;
      case 'pnl':
        comparison = (a.netPnl || 0) - (b.netPnl || 0);
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  return sortedTrades;
};

/**
 * Group trades by symbol for portfolio analysis
 */
export const groupTradesBySymbol = (trades: Trade[]): Record<string, Trade[]> => {
  return trades.reduce((groups, trade) => {
    const symbol = trade.symbol;
    if (!groups[symbol]) {
      groups[symbol] = [];
    }
    groups[symbol].push(trade);
    return groups;
  }, {} as Record<string, Trade[]>);
};

/**
 * Calculate portfolio performance metrics
 */
export const calculatePortfolioMetrics = (trades: Trade[]) => {
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const openTrades = trades.filter(t => t.status === 'OPEN');
  
  const totalPnl = trades.reduce((sum, trade) => sum + (trade.netPnl || 0), 0);
  const totalFees = trades.reduce((sum, trade) => sum + trade.fees, 0);
  const totalInvestment = trades.reduce((sum, trade) => sum + (trade.entryPrice * trade.quantity), 0);
  
  const winningTrades = closedTrades.filter(t => (t.netPnl || 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.netPnl || 0) < 0);
  
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  const averagePnl = trades.length > 0 ? totalPnl / trades.length : 0;
  const bestTrade = Math.max(...trades.map(t => t.netPnl || 0), 0);
  const worstTrade = Math.min(...trades.map(t => t.netPnl || 0), 0);
  
  return {
    totalTrades: trades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    totalPnl,
    totalFees,
    totalInvestment,
    averagePnl,
    bestTrade,
    worstTrade,
    returnOnInvestment: totalInvestment > 0 ? (totalPnl / totalInvestment) * 100 : 0,
  };
};

/**
 * Export trades to CSV format
 */
export const exportTradesToCSV = (trades: Trade[]): string => {
  const headers = [
    'Date',
    'Symbol',
    'Type',
    'Quantity',
    'Entry Price',
    'Exit Price',
    'Fees',
    'P&L Amount',
    'Net P&L',
    'P&L %',
    'Status',
    'Notes',
  ];
  
  const rows = trades.map(trade => [
    trade.date.toISOString().split('T')[0],
    trade.symbol,
    trade.type,
    trade.quantity.toString(),
    trade.entryPrice.toString(),
    trade.exitPrice?.toString() || '',
    trade.fees.toString(),
    trade.pnlAmount?.toString() || '',
    trade.netPnl?.toString() || '',
    trade.pnlPercentage?.toFixed(2) || '',
    trade.status,
    trade.notes || '',
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  return csvContent;
};
