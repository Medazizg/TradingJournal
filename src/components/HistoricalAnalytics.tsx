import React, { useState, useEffect } from 'react';
import {
  CalendarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  BarChartIcon,
  PieChartIcon,
  ActivityIcon,
  TargetIcon,
  ClockIcon,
  TrophyIcon
} from 'lucide-react';
import type { Trade, HistoricalAnalytics, DateRange } from '../types/trading';
import { generateHistoricalAnalytics, getPresetDateRange } from '../utils/historicalUtils';

interface HistoricalAnalyticsProps {
  trades: Trade[];
  userId: string;
  darkMode: boolean;
}

const HistoricalAnalyticsComponent: React.FC<HistoricalAnalyticsProps> = ({
  trades,
  userId,
  darkMode
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [selectedPreset, setSelectedPreset] = useState<string>('month');
  const [customDateRange, setCustomDateRange] = useState<DateRange>(getPresetDateRange('month'));
  const [analytics, setAnalytics] = useState<HistoricalAnalytics | null>(null);
  const [showCustomDates, setShowCustomDates] = useState(false);

  // Update analytics when parameters change
  useEffect(() => {
    const dateRange = showCustomDates ? customDateRange : getPresetDateRange(selectedPreset);
    const analyticsData = generateHistoricalAnalytics(userId, trades, selectedTimeframe, dateRange);
    setAnalytics(analyticsData);
  }, [trades, userId, selectedTimeframe, selectedPreset, customDateRange, showCustomDates]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    setShowCustomDates(preset === 'custom');
    if (preset !== 'custom') {
      setCustomDateRange(getPresetDateRange(preset));
    }
  };

  if (!analytics) {
    return (
      <div className={`rounded-xl shadow-lg border p-6 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className={`rounded-xl shadow-lg border p-6 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <h2 className={`text-2xl font-bold flex items-center mb-4 lg:mb-0 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <BarChartIcon className="h-7 w-7 mr-3 text-blue-500" />
            📊 Historical Analytics
          </h2>
          
          {/* Time Period Selector */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-wrap gap-2">
              {['today', 'week', 'month', 'quarter', 'year', 'all', 'custom'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetChange(preset)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedPreset === preset
                      ? 'bg-blue-600 text-white shadow-md'
                      : darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Timeframe Selector */}
            <div className={`flex rounded-lg border ${
              darkMode ? 'border-gray-600' : 'border-gray-300'
            }`}>
              {['daily', 'weekly', 'monthly', 'yearly'].map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe as 'daily' | 'weekly' | 'monthly' | 'yearly')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    selectedTimeframe === timeframe
                      ? 'bg-blue-600 text-white'
                      : darkMode
                        ? 'text-gray-400 hover:text-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                  } ${
                    timeframe === 'daily' ? 'rounded-l-lg' : 
                    timeframe === 'yearly' ? 'rounded-r-lg' : ''
                  }`}
                >
                  {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Date Range */}
        {showCustomDates && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Start Date
              </label>
              <input
                type="date"
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className={`w-full p-3 border rounded-lg ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                End Date
              </label>
              <input
                type="date"
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className={`w-full p-3 border rounded-lg ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>
          </div>
        )}

        {/* Date Range Info */}
        <div className={`flex items-center text-sm ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <CalendarIcon className="h-4 w-4 mr-2" />
          <span>
            {new Date(analytics.startDate).toLocaleDateString()} - {new Date(analytics.endDate).toLocaleDateString()}
          </span>
          <span className="ml-4">
            ({analytics.totalTrades} trades analyzed)
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total P&L */}
        <div className={`rounded-xl shadow-lg border p-6 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total P&L
              </p>
              <p className={`text-2xl font-bold ${
                analytics.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {formatCurrency(analytics.totalPnL)}
              </p>
            </div>
            {analytics.totalPnL >= 0 ? (
              <TrendingUpIcon className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDownIcon className="h-8 w-8 text-red-500" />
            )}
          </div>
        </div>

        {/* Win Rate */}
        <div className={`rounded-xl shadow-lg border p-6 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Win Rate
              </p>
              <p className={`text-2xl font-bold ${
                analytics.winRate >= 50 ? 'text-green-500' : 'text-red-500'
              }`}>
                {formatPercentage(analytics.winRate)}
              </p>
            </div>
            <TargetIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        {/* Best Trade */}
        <div className={`rounded-xl shadow-lg border p-6 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Best Trade
              </p>
              <p className="text-2xl font-bold text-green-500">
                {formatCurrency(analytics.bestTrade)}
              </p>
            </div>
            <TrophyIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        {/* Trading Days */}
        <div className={`rounded-xl shadow-lg border p-6 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Trading Days
              </p>
              <p className={`text-2xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {analytics.tradingDays}
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <div className={`rounded-xl shadow-lg border p-6 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <ActivityIcon className="h-5 w-5 mr-2 text-blue-500" />
            Performance Metrics
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Average P&L</span>
              <span className={`font-semibold ${
                analytics.averagePnL >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {formatCurrency(analytics.averagePnL)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Worst Trade</span>
              <span className="font-semibold text-red-500">
                {formatCurrency(analytics.worstTrade)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Max Drawdown</span>
              <span className="font-semibold text-red-500">
                {formatCurrency(analytics.maxDrawdown)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Profitable Days</span>
              <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {analytics.profitableDays} / {analytics.tradingDays}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Avg Trades/Day</span>
              <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {analytics.averageTradesPerDay.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Top Symbols */}
        <div className={`rounded-xl shadow-lg border p-6 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <PieChartIcon className="h-5 w-5 mr-2 text-purple-500" />
            Top Performing Symbols
          </h3>
          
          <div className="space-y-3">
            {analytics.topSymbols.slice(0, 5).map((symbol, index) => (
              <div key={symbol.symbol} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-orange-500 text-white' :
                    darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {symbol.symbol}
                    </span>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {symbol.trades} trades • {formatPercentage(symbol.winRate)} win rate
                    </div>
                  </div>
                </div>
                <span className={`font-semibold ${
                  symbol.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {formatCurrency(symbol.pnl)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Breakdown (for yearly view) */}
      {analytics.monthlyBreakdown && (
        <div className={`rounded-xl shadow-lg border p-6 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <BarChartIcon className="h-5 w-5 mr-2 text-green-500" />
            Monthly Breakdown
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {analytics.monthlyBreakdown.map((month) => (
              <div key={month.month} className={`p-4 rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {month.monthName}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Trades:</span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>{month.trades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>P&L:</span>
                    <span className={month.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {formatCurrency(month.pnl)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Win Rate:</span>
                    <span className={month.winRate >= 50 ? 'text-green-500' : 'text-red-500'}>
                      {formatPercentage(month.winRate)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricalAnalyticsComponent;
