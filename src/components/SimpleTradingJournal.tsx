import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  MoonIcon,
  SunIcon,
  CalendarIcon,
  TargetIcon,
  BarChartIcon,
  DollarSign,
  PieChartIcon,
  TrendingUpIcon as TrendUp,
  TrendingDownIcon as TrendDown,
  ActivityIcon,
  StarIcon
} from 'lucide-react';
import HistoricalAnalyticsComponent from './HistoricalAnalytics';
import MonthlyTargetsComponent from './MonthlyTargets';
import PositionSizeCalculator from './PositionSizeCalculator';
import EnhancedTradesSection from './EnhancedTradesSection';
import RiskManagement from './RiskManagement';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  createTrade, 
  getUserTrades, 
  updateTrade, 
  deleteTrade, 
  getPortfolioSummary 
} from '../services/tradingService';
import type { Trade, Account } from '../types/trading';
import { createAccount, getUserAccounts } from '../services/accountsService';

interface FormData {
  date: string;
  symbol: string;
  type: 'Buy' | 'Sell';
  plAmount: string;
  entry: string;
  exit: string;
  fees: string;
  notes: string;
}

interface PortfolioSummary {
  totalTrades: number;
  totalNetPL: number;
  totalFees: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  bestTrade: number;
  worstTrade: number;
  averageNetPL: number;
}

interface DailyTarget {
  dailyPnLTarget: number;
  dailyTradesTarget: number;
  currentDayPnL: number;
  currentDayTrades: number;
  streak: number;
}

export default function SimpleTradingJournal() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  // Accounts
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | 'all'>('all');
  const [newAccountName, setNewAccountName] = useState<string>('');
  const [newAccountCapital, setNewAccountCapital] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'day' | 'week' | 'month'>('day');
  const [activeTab, setActiveTab] = useState<'journal' | 'analytics' | 'targets' | 'calculator' | 'risk'>('journal');
  const [dailyTarget, setDailyTarget] = useState<DailyTarget>({
    dailyPnLTarget: 100,
    dailyTradesTarget: 5,
    currentDayPnL: 0,
    currentDayTrades: 0,
    streak: 0
  });
  // Alert flags to avoid repeating alerts
  const [lossAlertShownDate, setLossAlertShownDate] = useState<string | null>(null);
  const [accountAlertShown, setAccountAlertShown] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    type: 'Buy',
    plAmount: '',
    entry: '',
    exit: '',
    fees: '',
    notes: ''
  });

  // Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        loadTrades(user.uid);
        loadPortfolioSummary(user.uid);
        loadAccounts(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load trades
  const loadTrades = async (userId: string) => {
    try {
      const userTrades = await getUserTrades(userId);
      setTrades(userTrades);
      calculateDailyStats(userTrades);
    } catch (error) {
      console.error('Error loading trades:', error);
    }
  };

  // Derived helpers for account filtering
  const tradesByActiveAccount = activeAccountId === 'all' ? trades : trades.filter(t => t.accountId === activeAccountId);

  const computeSummary = (list: Trade[]) => {
    const totalTrades = list.length;
    const totalNetPL = list.reduce((s, t) => s + t.netPL, 0);
    const totalFees = list.reduce((s, t) => s + t.fees, 0);
    const winningTrades = list.filter(t => t.netPL > 0).length;
    const losingTrades = list.filter(t => t.netPL < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const bestTrade = list.length > 0 ? Math.max(...list.map(t => t.netPL)) : 0;
    const worstTrade = list.length > 0 ? Math.min(...list.map(t => t.netPL)) : 0;
    const averageNetPL = totalTrades > 0 ? totalNetPL / totalTrades : 0;
    return { totalTrades, totalNetPL, totalFees, winningTrades, losingTrades, winRate, bestTrade, worstTrade, averageNetPL } as PortfolioSummary;
  };

  const displayedSummary: PortfolioSummary | null = trades.length
    ? computeSummary(tradesByActiveAccount)
    : (portfolioSummary ? portfolioSummary : null);

  // Load portfolio summary
  const loadPortfolioSummary = async (userId: string) => {
    try {
      const summary = await getPortfolioSummary(userId);
      setPortfolioSummary(summary);
      calculateDailyStats(trades);
    } catch (error) {
      console.error('Error loading portfolio summary:', error);
    }
  };

  // Load accounts
  const loadAccounts = async (userId: string) => {
    try {
      const list = await getUserAccounts(userId);
      setAccounts(list);
      if (list.length && activeAccountId === 'all') {
        // keep 'all' by default
      }
    } catch (e) {
      console.error('Error loading accounts', e);
    }
  };

  const handleCreateCustomAccount = async () => {
    if (!currentUser) return;
    const capital = parseFloat(newAccountCapital);
    if (!isFinite(capital) || capital <= 0) {
      alert('Please enter a valid positive capital amount');
      return;
    }
    const name = newAccountName.trim() || `Account ${capital.toLocaleString()}`;
    const id = await createAccount({ userId: currentUser.uid, name, startingBalance: capital, color: '#0ea5e9' });
    await loadAccounts(currentUser.uid);
    setActiveAccountId(id);
    setNewAccountName('');
    setNewAccountCapital('');
  };

  // Calculate daily statistics
  const calculateDailyStats = (allTrades: Trade[]) => {
    const byAccount = activeAccountId === 'all' ? allTrades : allTrades.filter(t => t.accountId === activeAccountId);
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = byAccount.filter(trade => trade.date === today);
    const currentDayPnL = todayTrades.reduce((sum, trade) => sum + trade.netPL, 0);
    const currentDayTrades = todayTrades.length;
    
    // Calculate streak (simplified version)
    let streak = 0;
    const sortedTrades = [...byAccount].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const trade of sortedTrades) {
      if (trade.netPL > 0) streak++;
      else break;
    }
    
    setDailyTarget(prev => ({
      ...prev,
      currentDayPnL,
      currentDayTrades,
      streak
    }));
  };

  // Risk alerts: daily loss and overall account drawdown
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (dailyTarget.currentDayPnL <= -300 && lossAlertShownDate !== today) {
      alert('⚠️ Daily loss limit reached (-$300). Consider stopping for the day and reviewing your plan.');
      setLossAlertShownDate(today);
    }
  }, [dailyTarget.currentDayPnL, lossAlertShownDate]);

  useEffect(() => {
    if (portfolioSummary && portfolioSummary.totalNetPL <= -500 && !accountAlertShown) {
      alert('🚨 Account drawdown limit reached (-$500). Reduce risk and take a break.');
      setAccountAlertShown(true);
    }
  }, [portfolioSummary, accountAlertShown]);

  // Get filtered trades based on timeframe (and active account)
  const getFilteredTrades = () => {
    const base = tradesByActiveAccount;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (selectedTimeframe) {
      case 'day': {
        return base.filter(trade => {
          const tradeDate = new Date(trade.date);
          return tradeDate >= today;
        });
      }
      case 'week': {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return base.filter(trade => {
          const tradeDate = new Date(trade.date);
          return tradeDate >= weekAgo;
        });
      }
      case 'month': {
        const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        return base.filter(trade => {
          const tradeDate = new Date(trade.date);
          return tradeDate >= monthAgo;
        });
      }
      default:
        return base;
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('Please log in to save trades');
      return;
    }

    try {
      const plAmount = parseFloat(formData.plAmount);
      const entry = parseFloat(formData.entry);
      const exit = parseFloat(formData.exit);
      const fees = parseFloat(formData.fees) || 0;
      const netPL = plAmount - fees;

      const tradeData: Omit<Trade, 'id'> = {
        userId: currentUser.uid,
        accountId: activeAccountId === 'all' ? undefined : activeAccountId,
        date: formData.date,
        symbol: formData.symbol.toUpperCase(),
        type: formData.type,
        plAmount,
        entry,
        exit,
        fees,
        netPL,
        notes: formData.notes
      };

      if (editingTrade) {
        await updateTrade(editingTrade.id, tradeData);
        setEditingTrade(null);
        alert('✅ Trade updated successfully!');
      } else {
        await createTrade(tradeData);
        alert('✅ Trade added successfully!');
      }

      // Reload data
      await loadTrades(currentUser.uid);
      await loadPortfolioSummary(currentUser.uid);

      // Reset form
      resetForm();
      setShowAddForm(false);

    } catch (error) {
      console.error('Error saving trade:', error);
      alert('❌ Error saving trade. Please try again.');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      symbol: '',
      type: 'Buy',
      plAmount: '',
      entry: '',
      exit: '',
      fees: '',
      notes: ''
    });
  };

  // Handle edit
  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setFormData({
      date: trade.date,
      symbol: trade.symbol,
      type: trade.type,
      plAmount: trade.plAmount.toString(),
      entry: trade.entry.toString(),
      exit: trade.exit.toString(),
      fees: trade.fees.toString(),
      notes: trade.notes || ''
    });
    setShowAddForm(true);
  };

  // Handle delete
  const handleDelete = async (tradeId: string) => {
    if (!confirm('Are you sure you want to delete this trade?')) return;

    try {
      await deleteTrade(tradeId);
      if (currentUser) {
        await loadTrades(currentUser.uid);
        await loadPortfolioSummary(currentUser.uid);
      }
      alert('✅ Trade deleted successfully!');
    } catch (error) {
      console.error('Error deleting trade:', error);
      alert('❌ Error deleting trade. Please try again.');
    }
  };

  // Cancel edit
  const handleCancel = () => {
    setEditingTrade(null);
    resetForm();
    setShowAddForm(false);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h2>
          <p className="text-gray-600">You need to be logged in to access your trading journal.</p>
        </div>
      </div>
    );
  }

  // Overall P&L mood for background and header emoji (per active account)
  const overallPnL = (displayedSummary?.totalNetPL) ?? 0;
  const rootBgClass = darkMode
    ? (overallPnL >= 0 ? 'bg-gray-900 dark:bg-green-950' : 'bg-gray-900 dark:bg-red-950')
    : (overallPnL >= 0 ? 'bg-green-50' : 'bg-red-50');

  return (
    <div className={`min-h-screen transition-colors duration-300 ${rootBgClass} p-4`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`rounded-xl shadow-lg border transition-colors duration-300 ${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } p-6 mb-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className={`text-3xl font-bold transition-colors ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {overallPnL >= 0 ? '😃' : '😞'} 📈 Trading Journal
              </h1>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                dailyTarget.streak > 0 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                🔥 {dailyTarget.streak} win streak
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                title="Toggle dark mode"
              >
                {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              </button>
              
              {/* Add Trade Button */}
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Trade</span>
              </button>

              {/* Account Selector */}
              <div className="flex items-center gap-2">
                <select
                  value={activeAccountId}
                  onChange={(e) => setActiveAccountId(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  title="Select account"
                >
                  <option value="all">All Accounts</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.startingBalance.toLocaleString()})</option>
                  ))}
                </select>

                {/* Custom account creator */}
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="Account name"
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  title="Account name"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={newAccountCapital}
                  onChange={(e) => setNewAccountCapital(e.target.value)}
                  placeholder="Capital ($)"
                  className={`w-32 px-3 py-2 rounded-lg border text-sm ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  title="Starting capital"
                />
                <button
                  onClick={handleCreateCustomAccount}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title="Create account"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={`rounded-xl shadow-lg border transition-colors duration-300 ${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } p-6 mb-6`}>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'journal', label: '📊 Trading Journal', icon: BarChartIcon },
              { id: 'analytics', label: '📈 Analytics', icon: ActivityIcon },
              { id: 'targets', label: '🎯 Targets', icon: TargetIcon },
              { id: 'calculator', label: '🧮 Calculator', icon: DollarSign },
              { id: 'risk', label: '🛡️ Risk', icon: ActivityIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'journal' | 'analytics' | 'targets' | 'calculator' | 'risk')}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'journal' && (
          <>
            {/* Daily Targets & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Daily Target Card */}
          <div className={`rounded-xl shadow-lg border transition-colors duration-300 ${
            darkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          } p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold flex items-center ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                <TargetIcon className="h-5 w-5 mr-2 text-green-500" />
                Daily Target
              </h3>
              <CalendarIcon className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {/* P&L Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>P&L Target</span>
                  <span className={`text-sm font-medium ${
                    dailyTarget.currentDayPnL >= dailyTarget.dailyPnLTarget
                      ? 'text-green-500'
                      : darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {formatCurrency(dailyTarget.currentDayPnL)} / {formatCurrency(dailyTarget.dailyPnLTarget)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      dailyTarget.currentDayPnL >= dailyTarget.dailyPnLTarget
                        ? 'bg-green-500'
                        : dailyTarget.currentDayPnL > 0
                        ? 'bg-blue-500'
                        : 'bg-red-500'
                    }`}
                    style={{ 
                      width: `${Math.min(
                        (Math.abs(dailyTarget.currentDayPnL) / dailyTarget.dailyPnLTarget) * 100, 
                        100
                      )}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              {/* Trades Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>Trades Target</span>
                  <span className={`text-sm font-medium ${
                    dailyTarget.currentDayTrades >= dailyTarget.dailyTradesTarget
                      ? 'text-green-500'
                      : darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {dailyTarget.currentDayTrades} / {dailyTarget.dailyTradesTarget}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      dailyTarget.currentDayTrades >= dailyTarget.dailyTradesTarget
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ 
                      width: `${Math.min(
                        (dailyTarget.currentDayTrades / dailyTarget.dailyTradesTarget) * 100, 
                        100
                      )}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Performance Stats */}
          <div className={`lg:col-span-2 rounded-xl shadow-lg border transition-colors duration-300 ${
            darkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          } p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold flex items-center ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                <ActivityIcon className="h-5 w-5 mr-2 text-blue-500" />
                Performance Overview
              </h3>
              
              {/* Timeframe Selector */}
              <div className={`flex rounded-lg border ${
                darkMode ? 'border-gray-600' : 'border-gray-300'
              }`}>
                {['day', 'week', 'month'].map((timeframe) => (
                  <button
                    key={timeframe}
                    onClick={() => setSelectedTimeframe(timeframe as 'day' | 'week' | 'month')}
                    className={`px-3 py-1 text-sm font-medium transition-colors ${
                      selectedTimeframe === timeframe
                        ? darkMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-600 text-white'
                        : darkMode
                          ? 'text-gray-400 hover:text-gray-200'
                          : 'text-gray-600 hover:text-gray-900'
                    } ${timeframe === 'day' ? 'rounded-l-lg' : timeframe === 'month' ? 'rounded-r-lg' : ''}`}
                  >
                    {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {getFilteredTrades().length}
                </div>
                <div className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Trades</div>
              </div>
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  getFilteredTrades().reduce((sum, trade) => sum + trade.netPL, 0) >= 0 
                    ? 'text-green-500' 
                    : 'text-red-500'
                }`}>
                  {formatCurrency(getFilteredTrades().reduce((sum, trade) => sum + trade.netPL, 0))}
                </div>
                <div className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Net P&L</div>
              </div>
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {getFilteredTrades().length > 0 
                    ? ((getFilteredTrades().filter(t => t.netPL > 0).length / getFilteredTrades().length) * 100).toFixed(1)
                    : '0.0'
                  }%
                </div>
                <div className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Win Rate</div>
              </div>
              
              <div className="text-center">
                <div className={`text-2xl font-bold flex items-center justify-center ${
                  dailyTarget.streak > 0 ? 'text-green-500' : 'text-gray-400'
                }`}>
                  <StarIcon className="h-6 w-6 mr-1" />
                  {dailyTarget.streak}
                </div>
                <div className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Streak</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Portfolio Summary */}
        {displayedSummary && (
          <div className={`rounded-xl shadow-lg border transition-colors duration-300 ${
            darkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          } p-6 mb-6`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold flex items-center ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                <PieChartIcon className="h-6 w-6 mr-2 text-purple-500" />
                Portfolio Analytics
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm ${
                portfolioSummary.totalNetPL >= 0
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {portfolioSummary.totalNetPL >= 0 ? '📈 Profitable' : '📉 Losing'}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30">
                <div className="flex justify-center mb-2">
                  <BarChartIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {displayedSummary.totalTrades}
                </div>
                <div className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Total Trades</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30">
                <div className="flex justify-center mb-2">
                  <DollarSign className={`h-8 w-8 ${
                    displayedSummary.totalNetPL >= 0 ? 'text-green-500' : 'text-red-500'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  displayedSummary.totalNetPL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(displayedSummary.totalNetPL)}
                </div>
                <div className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Net P&L</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30">
                <div className="flex justify-center mb-2">
                  <TrendUp className="h-8 w-8 text-purple-500" />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {displayedSummary.winRate.toFixed(1)}%
                </div>
                <div className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Win Rate</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30">
                <div className="flex justify-center mb-2">
                  <TrendDown className="h-8 w-8 text-orange-500" />
                </div>
                <div className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {formatCurrency(displayedSummary.totalFees)}
                </div>
                <div className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Total Fees</div>
              </div>
            </div>
            
            {/* Advanced Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-lg font-semibold text-green-500`}>
                    {formatCurrency(displayedSummary.bestTrade)}
                  </div>
                  <div className={`text-xs ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Best Trade</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-lg font-semibold text-red-500`}>
                    {formatCurrency(displayedSummary.worstTrade)}
                  </div>
                  <div className={`text-xs ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Worst Trade</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-lg font-semibold ${
                    displayedSummary.averageNetPL >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {formatCurrency(displayedSummary.averageNetPL)}
                  </div>
                  <div className={`text-xs ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Avg. P&L</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-lg font-semibold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {displayedSummary.winningTrades}/{displayedSummary.losingTrades}
                  </div>
                  <div className={`text-xs ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>W/L Ratio</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Trade Form */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className={`rounded-xl shadow-2xl p-6 w-full max-w-md max-h-screen overflow-y-auto transform transition-all duration-300 scale-100 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {editingTrade ? '✏️ Edit Trade' : '➕ Add New Trade'}
                </h3>
                <button
                  onClick={handleCancel}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                  }`}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    📅 Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={`w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-white focus:border-blue-400'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    📈 Symbol
                  </label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    className={`w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-400'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }`}
                    placeholder="e.g., XAUUSD"
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    🔄 Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'Buy' | 'Sell' })}
                    className={`w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-white focus:border-blue-400'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500'
                    }`}
                    required
                  >
                    <option value="Buy">Buy</option>
                    <option value="Sell">Sell</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      🟢 Entry Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.entry}
                      onChange={(e) => setFormData({ ...formData, entry: e.target.value })}
                      className={`w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                        darkMode 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      🔴 Exit Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.exit}
                      onChange={(e) => setFormData({ ...formData, exit: e.target.value })}
                      className={`w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                        darkMode 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      💰 P&L Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.plAmount}
                      onChange={(e) => setFormData({ ...formData, plAmount: e.target.value })}
                      className={`w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                        darkMode 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      💸 Fees
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.fees}
                      onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                      className={`w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                        darkMode 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    📝 Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className={`w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 resize-none ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-400'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }`}
                    rows={3}
                    placeholder="Optional comments about this trade..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {editingTrade ? '✏️ Update Trade' : '➕ Add Trade'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
                        : 'bg-gray-500 hover:bg-gray-600 text-white'
                    }`}
                  >
                    ❌ Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enhanced Trades Section with Pagination and Charts */}
        <EnhancedTradesSection 
          trades={trades}
          darkMode={darkMode}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAdd={() => setShowAddForm(true)}
          formatCurrency={formatCurrency}
        />
          </>
        )}

        {/* Historical Analytics Tab */}
        {activeTab === 'analytics' && (
          <HistoricalAnalyticsComponent 
            trades={trades} 
            userId={currentUser?.uid || ''} 
            darkMode={darkMode} 
          />
        )}

        {/* Monthly Targets Tab */}
        {activeTab === 'targets' && (
          <MonthlyTargetsComponent 
            trades={trades} 
            userId={currentUser?.uid || ''} 
            darkMode={darkMode} 
          />
        )}

        {/* Position Size Calculator Tab */}
        {activeTab === 'calculator' && (
          <PositionSizeCalculator darkMode={darkMode} />
        )}
        {activeTab === 'risk' && (
          <RiskManagement />
        )}
      </div>
    </div>
  );
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
`;
document.head.appendChild(style);
