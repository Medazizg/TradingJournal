import React, { useState, useMemo } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  BarChartIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  EditIcon,
  Trash2Icon,
  PlusIcon,
  PieChartIcon,
  ActivityIcon
} from 'lucide-react';
import type { Trade } from '../types/trading';

interface EnhancedTradesSectionProps {
  trades: Trade[];
  darkMode: boolean;
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: string) => void;
  onAdd: () => void;
  formatCurrency: (amount: number) => string;
}

export default function EnhancedTradesSection({ 
  trades, 
  darkMode, 
  onEdit, 
  onDelete, 
  onAdd, 
  formatCurrency 
}: EnhancedTradesSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<'date' | 'symbol' | 'netPL'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sort and paginate trades
  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'netPL':
          comparison = a.netPL - b.netPL;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [trades, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedTrades.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTrades = sortedTrades.slice(startIndex, startIndex + itemsPerPage);

  // Calculate stats for charts
  const tradingStats = useMemo(() => {
    const winningTrades = trades.filter(t => t.netPL > 0).length;
    const losingTrades = trades.filter(t => t.netPL < 0).length;
    const totalPnL = trades.reduce((sum, t) => sum + t.netPL, 0);
    
    // Monthly P&L data
    const monthlyData = trades.reduce((acc, trade) => {
      const month = new Date(trade.date).toISOString().slice(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + trade.netPL;
      return acc;
    }, {} as Record<string, number>);

    // Symbol performance
    const symbolStats = trades.reduce((acc, trade) => {
      if (!acc[trade.symbol]) {
        acc[trade.symbol] = { total: 0, count: 0, wins: 0 };
      }
      acc[trade.symbol].total += trade.netPL;
      acc[trade.symbol].count += 1;
      if (trade.netPL > 0) acc[trade.symbol].wins += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number; wins: number }>);

    return {
      winningTrades,
      losingTrades,
      totalPnL,
      winRate: trades.length > 0 ? (winningTrades / trades.length) * 100 : 0,
      monthlyData: Object.entries(monthlyData).slice(-6), // Last 6 months
      topSymbols: Object.entries(symbolStats)
        .sort(([,a], [,b]) => b.total - a.total)
        .slice(0, 5)
    };
  }, [trades]);

  const handleSort = (column: 'date' | 'symbol' | 'netPL') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Trading Statistics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Win Rate Pie Chart */}
        <div className={`rounded-lg border p-4 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Win Rate
            </h3>
            <PieChartIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex items-center justify-center">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  stroke={darkMode ? '#374151' : '#e5e7eb'}
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  stroke="#10b981"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 12}`}
                  strokeDashoffset={`${2 * Math.PI * 12 * (1 - tradingStats.winRate / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {tradingStats.winRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-between text-xs mt-2">
            <span className="text-green-500">Wins: {tradingStats.winningTrades}</span>
            <span className="text-red-500">Losses: {tradingStats.losingTrades}</span>
          </div>
        </div>

        {/* Monthly P&L Chart */}
        <div className={`rounded-lg border p-4 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Monthly P&L
            </h3>
            <BarChartIcon className="h-5 w-5 text-purple-500" />
          </div>
          <div className="space-y-2">
            {tradingStats.monthlyData.map(([month, pnl]) => (
              <div key={month} className="flex items-center space-x-2">
                <span className={`text-xs w-16 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {new Date(month).toLocaleDateString('en', { month: 'short' })}
                </span>
                <div className="flex-1 flex items-center">
                  <div className={`h-2 rounded transition-all duration-500 ${
                    pnl >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`} style={{ 
                    width: `${Math.min(Math.abs(pnl) / Math.max(...tradingStats.monthlyData.map(([,p]) => Math.abs(p))), 1) * 100}%` 
                  }}></div>
                </div>
                <span className={`text-xs font-medium ${
                  pnl >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {formatCurrency(pnl)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Symbols */}
        <div className={`rounded-lg border p-4 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Top Symbols
            </h3>
            <ActivityIcon className="h-5 w-5 text-orange-500" />
          </div>
          <div className="space-y-2">
            {tradingStats.topSymbols.map(([symbol, stats]) => (
              <div key={symbol} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {symbol}
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    ({stats.count})
                  </span>
                </div>
                <span className={`text-sm font-medium ${
                  stats.total >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {formatCurrency(stats.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className={`rounded-lg border overflow-hidden ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <BarChartIcon className="h-6 w-6 text-blue-500" />
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📋 My Trades History
              </h2>
              <div className={`px-2 py-1 rounded-full text-xs ${
                darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
              }`}>
                {trades.length} total
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded border text-sm ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
              
              <button
                onClick={onAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Trade</span>
              </button>
            </div>
          </div>
        </div>

        {trades.length === 0 ? (
          <div className={`p-12 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <BarChartIcon className={`h-16 w-16 mx-auto mb-4 ${
              darkMode ? 'text-gray-600' : 'text-gray-300'
            }`} />
            <p className="text-xl mb-2 font-medium">No trades found</p>
            <p className="mb-6">Add your first trade to get started!</p>
            <button
              onClick={onAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="h-5 w-5 inline mr-2" />
              Add Your First Trade
            </button>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <tr>
                    <th 
                      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-opacity-80 ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}
                      onClick={() => handleSort('date')}
                    >
                      📅 Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-opacity-80 ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}
                      onClick={() => handleSort('symbol')}
                    >
                      📈 Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      🔄 Type
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      💰 P&L
                    </th>
                    <th 
                      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-opacity-80 ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}
                      onClick={() => handleSort('netPL')}
                    >
                      🎯 Net P&L {sortBy === 'netPL' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {paginatedTrades.map((trade) => (
                    <tr 
                      key={trade.id}
                      className={`transition-colors hover:bg-opacity-50 ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className={`px-4 py-3 whitespace-nowrap text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-900'
                      }`}>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {new Date(trade.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            trade.netPL >= 0 ? 'bg-green-400' : 'bg-red-400'
                          }`}></span>
                          {trade.symbol}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trade.type === 'Buy' 
                            ? darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                            : darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.type === 'Buy' ? '🟢' : '🔴'} {trade.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold ${
                        trade.plAmount >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        <div className="flex items-center">
                          {trade.plAmount >= 0 
                            ? <TrendingUpIcon className="h-4 w-4 mr-1" />
                            : <TrendingDownIcon className="h-4 w-4 mr-1" />
                          }
                          {formatCurrency(trade.plAmount)}
                        </div>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold ${
                        trade.netPL >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        <div className={`flex items-center px-2 py-1 rounded ${
                          trade.netPL >= 0 
                            ? darkMode ? 'bg-green-900/30' : 'bg-green-50'
                            : darkMode ? 'bg-red-900/30' : 'bg-red-50'
                        }`}>
                          {trade.netPL >= 0 ? '📈' : '📉'}
                          <span className="ml-1">{formatCurrency(trade.netPL)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => onEdit(trade)}
                            className={`p-2 rounded transition-colors ${
                              darkMode 
                                ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/30'
                                : 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'
                            }`}
                          >
                            <EditIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(trade.id)}
                            className={`p-2 rounded transition-colors ${
                              darkMode 
                                ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30'
                                : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                            }`}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`px-4 py-3 border-t flex items-center justify-between ${
                darkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, trades.length)} of {trades.length} trades
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded ${
                      currentPage === 1
                        ? darkMode ? 'text-gray-600' : 'text-gray-400'
                        : darkMode 
                          ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    } transition-colors`}
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  
                  <div className="flex space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : darkMode
                              ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded ${
                      currentPage === totalPages
                        ? darkMode ? 'text-gray-600' : 'text-gray-400'
                        : darkMode 
                          ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    } transition-colors`}
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
