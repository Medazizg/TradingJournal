import React, { useState, useEffect } from 'react';
import { PlusIcon, CalendarIcon, TrendingUpIcon, TrendingDownIcon, EditIcon, Trash2Icon, SunIcon, MoonIcon, MenuIcon, BarChart3Icon, CheckCircleIcon, Target } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

interface Trade {
  id: string;
  date: string;
  symbol: string;
  type: 'Long' | 'Short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  fees: number;
  profitLoss: number;
  notes: string;
}

interface Statistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  avgProfitPerTrade: number;
  avgLossPerTrade: number;
}

interface AccountPhase {
  phase: 'Step 1' | 'Step 2' | 'Funded';
  startingBalance: number;
  currentBalance: number;
  profitTarget: number;
  maxDrawdown: number;
  tradingDays: number;
  maxTradingDays: number;
  minTradingDays: number;
  name?: string;
  step?: number;
  customProfitTarget?: number;
}

// Removed DayTrading interface as it's no longer used
// interface DayTrading {
//   date: string;
//   trades: Trade[];
//   dailyPL: number;
//   tradingStatus: 'allowed' | 'target_reached' | 'stopped' | 'banned';
//   consecutiveLosses: number;
// }

export default function TradingJournal() {
  // Try to get theme context, fallback to light mode if not available
  let isDarkMode = false;
  let toggleDarkMode = () => {};
  
  try {
    const themeContext = useTheme();
    isDarkMode = themeContext.isDarkMode;
    toggleDarkMode = themeContext.toggleDarkMode;
  } catch {
    console.warn('ThemeContext not available, using light mode');
  }
  
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'journal' | 'analytics'>('journal');
  const [accountPhase, setAccountPhase] = useState<AccountPhase>({
    phase: 'Step 1',
    startingBalance: 5000, 
    currentBalance: 4790,
    profitTarget: 500,
    maxDrawdown: 300,
    tradingDays: 0,
    maxTradingDays: 10,
    minTradingDays: 3,
    customProfitTarget: 800
  });
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [targetFormData, setTargetFormData] = useState({
    customProfitTarget: accountPhase.customProfitTarget || 800
  });
  
  // Date filtering states
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [showCustomRange, setShowCustomRange] = useState(false);
  
  // Sync targetFormData when accountPhase changes
  React.useEffect(() => {
    setTargetFormData({
      customProfitTarget: accountPhase.customProfitTarget || 800
    });
  }, [accountPhase.customProfitTarget]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    type: 'Long' as 'Long' | 'Short',
    entryPrice: '',
    exitPrice: '',
    quantity: '',
    fees: '',
    notes: ''
  });

  // Daily Trading Rules (currently not enforced)
  // const DAILY_TARGET = 50; // $50 daily target
  // const DAILY_STOP_LOSS = 25; // $25 daily stop loss

  // Firebase Effects
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        loadUserData(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load user data from Firebase (with fallback to localStorage)
  const loadUserData = async (userId: string) => {
    try {
      // Try to load from localStorage first (offline support)
      const savedTrades = localStorage.getItem(`trades_${userId}`);
      const savedAccountPhase = localStorage.getItem(`accountPhase_${userId}`);
      
      if (savedTrades) {
        setTrades(JSON.parse(savedTrades));
      }
      
      if (savedAccountPhase) {
        setAccountPhase(JSON.parse(savedAccountPhase));
      }
      
      // Try Firebase (optional - won't break if it fails)
      try {
        const tradesQuery = query(
          collection(db, 'trades'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        
        const tradesSnapshot = await getDocs(tradesQuery);
        const userTrades = tradesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Trade[];
        
        if (userTrades.length > 0) {
          setTrades(userTrades);
          // Save to localStorage as backup
          localStorage.setItem(`trades_${userId}`, JSON.stringify(userTrades));
        }
      } catch (firebaseError) {
        console.log('Firebase not available, using local storage only');
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
      // App still works with empty data
    }
  };

  // Save account phase to Firebase (currently using localStorage only)
  // const saveAccountPhase = async (userId: string) => {
  //   try {
  //     const docRef = await addDoc(collection(db, 'accountPhases'), {
  //       ...accountPhase,
  //       userId,
  //       createdAt: Timestamp.now(),
  //       updatedAt: Timestamp.now()
  //     });
  //     console.log('Account phase saved with ID:', docRef.id);
  //   } catch (error) {
  //     console.error('Error saving account phase:', error);
  //   }
  // };

  // Save trade to localStorage (with Firebase backup)
  const saveTrade = async (trade: Omit<Trade, 'id'>) => {
    if (!currentUser) return;
    
    try {
      // Always save to localStorage first (reliable)
      const newTrade = {
        ...trade,
        id: Date.now().toString()
      };
      
      const updatedTrades = [newTrade, ...trades];
      setTrades(updatedTrades);
      localStorage.setItem(`trades_${currentUser.uid}`, JSON.stringify(updatedTrades));
      
      // Also save account phase to localStorage
      localStorage.setItem(`accountPhase_${currentUser.uid}`, JSON.stringify(accountPhase));
      
      // Try Firebase as backup (optional)
      try {
        await addDoc(collection(db, 'trades'), {
          ...trade,
          userId: currentUser.uid,
          createdAt: Timestamp.now()
        });
      } catch (firebaseError) {
        console.log('Firebase backup failed, but data saved locally');
      }
    } catch (error) {
      console.error('Error saving trade:', error);
    }
  };

  const calculateProfitLoss = (entry: number, exit: number, amount: number, fees: number) => {
    // Amount directly represents the P&L (win/lose amount)
    // Positive amount = win, Negative amount = lose
    return amount - fees;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('Please log in to save trades');
      return;
    }
    
    // Always allow trading - no checks needed
    
    const entryPrice = parseFloat(formData.entryPrice);
    const exitPrice = parseFloat(formData.exitPrice);
    const quantity = parseFloat(formData.quantity);
    const fees = parseFloat(formData.fees) || 0;
    
    const profitLoss = calculateProfitLoss(entryPrice, exitPrice, quantity, fees);
    
    const tradeData = {
      date: formData.date,
      symbol: formData.symbol.toUpperCase(),
      type: formData.type,
      entryPrice,
      exitPrice,
      quantity,
      fees,
      profitLoss,
      notes: formData.notes
    };

    // Save trade (localStorage + Firebase backup)
    try {
      await saveTrade(tradeData);
      
      // Update account balance and phase
      const newBalance = accountPhase.currentBalance + profitLoss;
      const today = new Date().toISOString().split('T')[0];
      const todayTrades = trades.filter(t => t.date === today);
      
      const updatedAccountPhase = {
        ...accountPhase,
        currentBalance: newBalance,
        tradingDays: accountPhase.tradingDays + (todayTrades.length === 0 ? 1 : 0) // First trade of the day
      };
      
      setAccountPhase(updatedAccountPhase);
      
      // Save updated account phase to localStorage
      localStorage.setItem(`accountPhase_${currentUser.uid}`, JSON.stringify(updatedAccountPhase));
      
      // Show success message
      alert(`✅ Trade saved! P&L: $${profitLoss.toFixed(2)}`);
      
    } catch (error) {
      console.error('Error saving trade:', error);
      alert('❌ Error saving trade. Please try again.');
    }

    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      symbol: '',
      type: 'Long',
      entryPrice: '',
      exitPrice: '',
      quantity: '',
      fees: '',
      notes: ''
    });
    setShowAddForm(false);
  };

  // Delete trade with confirmation
  const handleDeleteTrade = (tradeId: string) => {
    if (confirm('⚠️ Êtes-vous sûr de vouloir supprimer ce trade?')) {
      const updatedTrades = trades.filter(trade => trade.id !== tradeId);
      setTrades(updatedTrades);
      
      if (currentUser) {
        localStorage.setItem(`trades_${currentUser.uid}`, JSON.stringify(updatedTrades));
      }
      
      alert('✅ Trade supprimé avec succès!');
    }
  };

  // Edit trade
  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setFormData({
      date: trade.date,
      symbol: trade.symbol,
      type: trade.type,
      entryPrice: trade.entryPrice.toString(),
      exitPrice: trade.exitPrice.toString(),
      quantity: trade.quantity.toString(),
      fees: trade.fees.toString(),
      notes: trade.notes
    });
    setShowAddForm(true);
  };

  // Update existing trade
  const handleUpdateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !editingTrade) return;
    
    const entryPrice = parseFloat(formData.entryPrice);
    const exitPrice = parseFloat(formData.exitPrice);
    const quantity = parseFloat(formData.quantity);
    const fees = parseFloat(formData.fees) || 0;
    
    const profitLoss = calculateProfitLoss(entryPrice, exitPrice, quantity, fees);
    
    const updatedTrade: Trade = {
      ...editingTrade,
      date: formData.date,
      symbol: formData.symbol.toUpperCase(),
      type: formData.type,
      entryPrice,
      exitPrice,
      quantity,
      fees,
      profitLoss,
      notes: formData.notes
    };

    const updatedTrades = trades.map(trade => 
      trade.id === editingTrade.id ? updatedTrade : trade
    );
    
    setTrades(updatedTrades);
    localStorage.setItem(`trades_${currentUser.uid}`, JSON.stringify(updatedTrades));
    
    // Reset form and editing state
    setEditingTrade(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      symbol: '',
      type: 'Long',
      entryPrice: '',
      exitPrice: '',
      quantity: '',
      fees: '',
      notes: ''
    });
    setShowAddForm(false);
    
    alert('✅ Trade modifié avec succès!');
  };

  const calculateStatistics = (): Statistics => {
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.profitLoss > 0).length;
    const losingTrades = trades.filter(t => t.profitLoss < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    const totalProfit = trades.filter(t => t.profitLoss > 0).reduce((sum, t) => sum + t.profitLoss, 0);
    const totalLoss = trades.filter(t => t.profitLoss < 0).reduce((sum, t) => sum + t.profitLoss, 0);
    const netProfit = totalProfit + totalLoss;
    
    const avgProfitPerTrade = winningTrades > 0 ? totalProfit / winningTrades : 0;
    const avgLossPerTrade = losingTrades > 0 ? totalLoss / losingTrades : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalProfit,
      totalLoss,
      netProfit,
      avgProfitPerTrade,
      avgLossPerTrade
    };
  };

  // Date filtering functions
  const getFilteredTrades = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    switch (dateFilter) {
      case 'today':
        return trades.filter(trade => trade.date === today);
      
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
        const weekStartStr = weekStart.toISOString().split('T')[0];
        return trades.filter(trade => trade.date >= weekStartStr);
      }
      
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthStartStr = monthStart.toISOString().split('T')[0];
        return trades.filter(trade => trade.date >= monthStartStr);
      }
      
      case 'all':
      default:
        if (customDateRange.start && customDateRange.end) {
          return trades.filter(trade => 
            trade.date >= customDateRange.start && trade.date <= customDateRange.end
          );
        }
        return trades;
    }
  };
  
  const filteredTrades = getFilteredTrades();
  
  // Calculate statistics for filtered trades
  const calculateFilteredStatistics = () => {
    if (filteredTrades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalProfit: 0,
        totalLoss: 0,
        netProfit: 0,
        avgProfitPerTrade: 0,
        avgLossPerTrade: 0
      };
    }
    
    const winningTrades = filteredTrades.filter(t => t.profitLoss > 0);
    const losingTrades = filteredTrades.filter(t => t.profitLoss < 0);
    const winRate = (winningTrades.length / filteredTrades.length) * 100;
    const totalProfit = winningTrades.reduce((sum, t) => sum + t.profitLoss, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss, 0));
    const netProfit = filteredTrades.reduce((sum, t) => sum + t.profitLoss, 0);
    const avgProfitPerTrade = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const avgLossPerTrade = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
    
    return {
      totalTrades: filteredTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalProfit,
      totalLoss,
      netProfit,
      avgProfitPerTrade,
      avgLossPerTrade
    };
  };
  
  // Get date range display text
  const getDateRangeText = () => {
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        return `Today (${now.toLocaleDateString()})`;
      
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `This Week (${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()})`;
      }
      
      case 'month':
        return `This Month (${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
      
      case 'all':
      default:
        if (customDateRange.start && customDateRange.end) {
          return `Custom Range (${new Date(customDateRange.start).toLocaleDateString()} - ${new Date(customDateRange.end).toLocaleDateString()})`;
        }
        return 'All Time';
    }
  };

  const stats = calculateStatistics();
  const filteredStats = calculateFilteredStatistics();
  // const todayStats = getTodayStats();
  // const tradingCheck = canTradeToday();

  // Always show floating Add Trade button
  React.useEffect(() => {
    const buttonContainer = document.getElementById('smart-add-button');
    if (buttonContainer) {
      buttonContainer.innerHTML = `
        <button
          onclick="document.querySelector('[data-add-trade]').click()"
          class="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white px-6 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center space-x-3 group"
          title="Add Trade - Any Date, Any Time"
        >
          <svg class="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="font-semibold text-lg">Add Trade</span>
          <div class="absolute -top-2 -right-2 bg-[#F59E0B] text-white text-xs px-2 py-1 rounded-full">
            24/7
          </div>
        </button>
      `;
    }
  }, []);

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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    } p-2 sm:p-4`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } rounded-lg shadow-sm border p-3 sm:p-6 mb-4 sm:mb-6`}>
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="sm:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
              <BarChart3Icon className={`h-6 sm:h-8 w-6 sm:w-8 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <h1 className={`text-lg sm:text-2xl lg:text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                <span className="hidden sm:inline">Trading Journal - </span>
                <span className="sm:hidden">Journal - </span>
                {accountPhase.phase}
              </h1>
            </div>
            
            {/* Header controls */}
            <div className="flex items-center space-x-2">
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {isDarkMode ? (
                  <SunIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <MoonIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
              
              {/* Navigation Tabs */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setCurrentView('journal')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'journal'
                      ? 'bg-white dark:bg-gray-600 text-[#2563EB] dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-[#2563EB] dark:hover:text-blue-400'
                  }`}
                >
                  📝 Journal
                </button>
                <button
                  onClick={() => setCurrentView('analytics')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'analytics'
                      ? 'bg-white dark:bg-gray-600 text-[#2563EB] dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-[#2563EB] dark:hover:text-blue-400'
                  }`}
                >
                  📊 Analytics
                </button>
              </div>

              {/* Add Trade Button - Only show in journal view */}
              {currentView === 'journal' && (
                <button
                  data-add-trade
                  onClick={() => setShowAddForm(true)}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3 sm:px-4 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 transition-colors text-sm sm:text-base"
                >
                  <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Add Trade</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {currentView === 'journal' ? (
          <>
            {/* Enhanced Target Display */}
            <div className={`${
              isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
            } rounded-xl shadow-lg border p-8 mb-6 relative overflow-hidden`}>
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F59E0B]/10 to-[#2563EB]/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#2563EB]/10 to-[#F59E0B]/10 rounded-full translate-y-12 -translate-x-12"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="bg-gradient-to-r from-[#F59E0B] to-[#2563EB] p-3 rounded-xl mr-4">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className={`text-3xl font-bold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Trading Target
                      </h2>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Your profit goal for this account
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTargetForm(true)}
                    className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    <EditIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">Edit Target</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Target Amount */}
                  <div className="bg-gradient-to-r from-[#F59E0B]/10 to-[#2563EB]/10 dark:from-amber-900/20 dark:to-blue-900/20 rounded-xl p-6 text-center">
                    <p className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    } mb-3`}>
                      🎯 Goal Amount
                    </p>
                    <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#F59E0B] to-[#2563EB] bg-clip-text text-transparent mb-2">
                      ${(accountPhase.customProfitTarget || 800).toLocaleString()}
                    </p>
                  </div>
                  
                  {/* Current Progress */}
                  <div className="bg-gradient-to-r from-[#2563EB]/10 to-[#F59E0B]/10 dark:from-blue-900/20 dark:to-amber-900/20 rounded-xl p-6 text-center">
                    <p className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    } mb-3`}>
                      💰 Current Progress
                    </p>
                    <p className={`text-4xl md:text-5xl font-bold mb-2 ${
                      stats.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      ${stats.netProfit.toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Progress to Target
                    </span>
                    <span className={`text-sm font-bold ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {((stats.netProfit / (accountPhase.customProfitTarget || 800)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className={`w-full h-4 ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                  } rounded-full overflow-hidden shadow-inner`}>
                    <div 
                      className="h-full bg-gradient-to-r from-[#F59E0B] to-[#2563EB] rounded-full transition-all duration-1000 ease-out shadow-sm"
                      style={{ 
                        width: `${Math.min(100, Math.max(0, (stats.netProfit / (accountPhase.customProfitTarget || 800)) * 100))}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>$0</span>
                    <span className="font-medium">
                      ${Math.max(0, (accountPhase.customProfitTarget || 800) - stats.netProfit).toFixed(2)} remaining
                    </span>
                    <span>${(accountPhase.customProfitTarget || 800).toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Achievement Status */}
                {stats.netProfit >= (accountPhase.customProfitTarget || 800) && (
                  <div className="mt-6 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircleIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mr-2" />
                      <span className="text-2xl">🎉</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      Target Achieved!
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      Congratulations on reaching your profit goal!
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Target Edit Form */}
            {showTargetForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className={`${
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                } rounded-xl shadow-2xl border p-6 w-full max-w-md`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Set Profit Target
                    </h3>
                    <button
                      onClick={() => setShowTargetForm(false)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const updatedAccountPhase = {
                      ...accountPhase,
                      customProfitTarget: targetFormData.customProfitTarget
                    };
                    setAccountPhase(updatedAccountPhase);
                    if (currentUser) {
                      localStorage.setItem(`accountPhase_${currentUser.uid}`, JSON.stringify(updatedAccountPhase));
                    }
                    setShowTargetForm(false);
                  }}>
                    <div className="mb-6">
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Target Profit Amount ($)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={targetFormData.customProfitTarget}
                        onChange={(e) => setTargetFormData({
                          customProfitTarget: parseInt(e.target.value) || 0
                        })}
                        className={`w-full p-3 rounded-lg border transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                        placeholder="Enter your profit target"
                        required
                      />
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Set your desired profit goal for this trading account
                      </p>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white py-3 px-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                      >
                        Save Target
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTargetForm(false)}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Analytics View */
          <div className="space-y-6">
            {/* Analytics Header */}
            <div className={`${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            } rounded-lg shadow-sm border p-6`}>
              <div className="flex items-center justify-center mb-4">
                <BarChart3Icon className="h-8 w-8 text-[#2563EB] mr-3" />
                <h2 className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Trading Analytics
                </h2>
              </div>
              <p className={`text-center ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Analyze your trading performance by day and month
              </p>
            </div>

            {/* Daily Performance Table */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl shadow-lg border border-purple-200 dark:border-purple-800 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-700 dark:to-pink-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  📅 Daily Performance Overview
                </h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-purple-200 dark:border-purple-800">
                        <th className="text-left py-3 px-4 font-semibold text-purple-700 dark:text-purple-300">Date</th>
                        <th className="text-center py-3 px-4 font-semibold text-purple-700 dark:text-purple-300">Trades</th>
                        <th className="text-center py-3 px-4 font-semibold text-purple-700 dark:text-purple-300">P&L</th>
                        <th className="text-center py-3 px-4 font-semibold text-purple-700 dark:text-purple-300">Win Rate</th>
                        <th className="text-center py-3 px-4 font-semibold text-purple-700 dark:text-purple-300">W/L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const dailyStats = trades.reduce((acc, trade) => {
                          const date = trade.date;
                          if (!acc[date]) {
                            acc[date] = { trades: 0, profit: 0, wins: 0, losses: 0 };
                          }
                          acc[date].trades += 1;
                          acc[date].profit += trade.profitLoss;
                          if (trade.profitLoss > 0) acc[date].wins += 1;
                          else if (trade.profitLoss < 0) acc[date].losses += 1;
                          return acc;
                        }, {} as Record<string, { trades: number; profit: number; wins: number; losses: number }>);

                        return Object.entries(dailyStats)
                          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                          .map(([date, data], index) => (
                            <tr key={date} className={`border-b border-purple-100 dark:border-purple-900 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors ${
                              index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-purple-25 dark:bg-gray-850'
                            }`}>
                              <td className="py-4 px-4 font-medium text-gray-900 dark:text-gray-100">
                                {new Date(date).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-medium">
                                  {data.trades}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className={`font-bold text-lg ${
                                  data.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                  ${data.profit.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0}%
                                  </span>
                                  <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                                    <div 
                                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all"
                                      style={{ 
                                        width: `${data.trades > 0 ? (data.wins / data.trades) * 100 : 0}%` 
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex justify-center space-x-2">
                                  <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded text-sm font-medium">
                                    {data.wins}W
                                  </span>
                                  <span className="bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 px-2 py-1 rounded text-sm font-medium">
                                    {data.losses}L
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Yearly Performance */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 dark:from-indigo-900/20 dark:to-cyan-900/20 rounded-xl shadow-lg border border-indigo-200 dark:border-indigo-800 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-700 dark:to-cyan-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  📊 Yearly Performance Summary
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {(() => {
                    const yearlyStats = trades.reduce((acc, trade) => {
                      const year = new Date(trade.date).getFullYear().toString();
                      if (!acc[year]) {
                        acc[year] = { trades: 0, profit: 0, wins: 0, losses: 0 };
                      }
                      acc[year].trades += 1;
                      acc[year].profit += trade.profitLoss;
                      if (trade.profitLoss > 0) acc[year].wins += 1;
                      else if (trade.profitLoss < 0) acc[year].losses += 1;
                      return acc;
                    }, {} as Record<string, { trades: number; profit: number; wins: number; losses: number }>);

                    return Object.entries(yearlyStats)
                      .sort(([a], [b]) => parseInt(b) - parseInt(a))
                      .map(([year, data]) => (
                        <div key={year} className="bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-indigo-900/30 rounded-xl p-6 shadow-md border border-indigo-100 dark:border-indigo-800 hover:shadow-lg transition-all duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                              {year}
                            </h4>
                            <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg">
                              <span className="text-2xl">📈</span>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Trades</span>
                              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{data.trades}</span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Net P&L</span>
                              <span className={`text-xl font-bold ${
                                data.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                ${data.profit.toFixed(2)}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Win Rate</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                  {data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0}%
                                </span>
                                <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full"
                                    style={{ width: `${data.trades > 0 ? (data.wins / data.trades) * 100 : 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="pt-2 border-t border-indigo-100 dark:border-indigo-800">
                              <div className="flex justify-center space-x-4">
                                <div className="text-center">
                                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{data.wins}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Wins</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{data.losses}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Losses</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-gray-600 dark:text-gray-400">{data.trades - data.wins - data.losses}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Break Even</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Show statistics and trades table only in journal view */}
        {currentView === 'journal' && (
          <>
            {/* Enhanced Statistics Panel */}
            <div className={`${
              isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
            } rounded-xl shadow-lg border p-6 mb-6`}>
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] p-3 rounded-xl mr-4">
                  <BarChart3Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Trading Statistics
                  </h2>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Your trading performance overview
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Total Trades */}
                <div className={`${
                  isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-white/70 border-gray-200'
                } rounded-xl p-4 border backdrop-blur-sm hover:shadow-md transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      } mb-1`}>
                        📊 Total Trades
                      </p>
                      <p className={`text-2xl font-bold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {stats.totalTrades}
                      </p>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                      <BarChart3Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>

                {/* Win Rate */}
                <div className={`${
                  isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-white/70 border-gray-200'
                } rounded-xl p-4 border backdrop-blur-sm hover:shadow-md transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      } mb-1`}>
                        🎯 Win Rate
                      </p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {stats.winRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                      <TrendingUpIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* Net Profit */}
                <div className={`${
                  isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-white/70 border-gray-200'
                } rounded-xl p-4 border backdrop-blur-sm hover:shadow-md transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      } mb-1`}>
                        💰 Net P&L
                      </p>
                      <p className={`text-2xl font-bold ${
                        stats.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        ${stats.netProfit.toFixed(2)}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${
                      stats.netProfit >= 0 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                        : 'bg-rose-100 dark:bg-rose-900/30'
                    }`}>
                      {stats.netProfit >= 0 ? 
                        <TrendingUpIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : 
                        <TrendingDownIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      }
                    </div>
                  </div>
                </div>

                {/* Winning Trades */}
                <div className={`${
                  isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-white/70 border-gray-200'
                } rounded-xl p-4 border backdrop-blur-sm hover:shadow-md transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      } mb-1`}>
                        ✅ Winners
                      </p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {stats.winningTrades}
                      </p>
                    </div>
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                      <TrendingUpIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* Losing Trades */}
                <div className={`${
                  isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-white/70 border-gray-200'
                } rounded-xl p-4 border backdrop-blur-sm hover:shadow-md transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      } mb-1`}>
                        ❌ Losers
                      </p>
                      <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                        {stats.losingTrades}
                      </p>
                    </div>
                    <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-lg">
                      <TrendingDownIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Add Trade Form */}
            {showAddForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className={`${
                  isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
                } rounded-xl shadow-2xl border p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] p-3 rounded-xl mr-4">
                        <PlusIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className={`text-2xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {editingTrade ? '✏️ Edit Trade' : '➕ Add New Trade'}
                        </h2>
                        <p className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {editingTrade ? 'Update your trade details' : 'Record your trading activity'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingTrade(null);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <form onSubmit={editingTrade ? handleUpdateTrade : handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Date */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          📅 Date
                        </label>
                        <input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({...formData, date: e.target.value})}
                          className={`w-full p-3 rounded-lg border transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                          } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                          required
                        />
                      </div>

                      {/* Symbol */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          📈 Symbol
                        </label>
                        <input
                          type="text"
                          value={formData.symbol}
                          onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                          placeholder="e.g., AAPL, TSLA"
                          className={`w-full p-3 rounded-lg border transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder-gray-500'
                          } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                          required
                        />
                      </div>

                      {/* Type */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          🔄 Position Type
                        </label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({...formData, type: e.target.value as 'Long' | 'Short'})}
                          className={`w-full p-3 rounded-lg border transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                          } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                        >
                          <option value="Long">📈 Long (Buy)</option>
                          <option value="Short">📉 Short (Sell)</option>
                        </select>
                      </div>

                      {/* P&L Amount */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          💰 P&L Amount ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.quantity}
                          onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                          placeholder="50 or -25"
                          className={`w-full p-3 rounded-lg border transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder-gray-500'
                          } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                          required
                        />
                        <p className={`text-xs mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          ✅ Positive = Win, ❌ Negative = Loss
                        </p>
                      </div>

                      {/* Entry Price */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          🟢 Entry Price
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.entryPrice}
                          onChange={(e) => setFormData({...formData, entryPrice: e.target.value})}
                          placeholder="150.00"
                          className={`w-full p-3 rounded-lg border transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder-gray-500'
                          } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                          required
                        />
                      </div>

                      {/* Exit Price */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          🔴 Exit Price
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.exitPrice}
                          onChange={(e) => setFormData({...formData, exitPrice: e.target.value})}
                          placeholder="155.00"
                          className={`w-full p-3 rounded-lg border transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder-gray-500'
                          } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                          required
                        />
                      </div>

                      {/* Fees */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          💸 Fees
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.fees}
                          onChange={(e) => setFormData({...formData, fees: e.target.value})}
                          placeholder="5.00"
                          className={`w-full p-3 rounded-lg border transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder-gray-500'
                          } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          📝 Notes
                        </label>
                        <input
                          type="text"
                          value={formData.notes}
                          onChange={(e) => setFormData({...formData, notes: e.target.value})}
                          placeholder="Optional notes..."
                          className={`w-full p-3 rounded-lg border transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder-gray-500'
                          } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
                      >
                        <span>{editingTrade ? '💾 Update Trade' : '➕ Add Trade'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingTrade(null);
                        }}
                        className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Date Filter Controls */}
            <div className={`${
              isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
            } rounded-xl shadow-lg border p-6 mb-6`}>
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4">
                <div className="flex items-center mb-4 lg:mb-0">
                  <div className="bg-gradient-to-r from-[#F59E0B] to-[#2563EB] p-3 rounded-xl mr-4">
                    <CalendarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      📅 Date Filter
                    </h2>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {getDateRangeText()}
                    </p>
                  </div>
                </div>
                
                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: '🌍 All Time', icon: '🌍' },
                    { key: 'today', label: '🌅 Today', icon: '🌅' },
                    { key: 'week', label: '📅 This Week', icon: '📅' },
                    { key: 'month', label: '📆 This Month', icon: '📆' }
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => {
                        setDateFilter(filter.key as 'all' | 'today' | 'week' | 'month');
                        setShowCustomRange(false);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        dateFilter === filter.key
                          ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-lg scale-105'
                          : isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  
                  {/* Custom Range Toggle */}
                  <button
                    onClick={() => {
                      setShowCustomRange(!showCustomRange);
                      if (showCustomRange) {
                        setDateFilter('all');
                        setCustomDateRange({ start: '', end: '' });
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      showCustomRange
                        ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white shadow-lg'
                        : isDarkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    📈 Custom Range
                  </button>
                </div>
              </div>
              
              {/* Custom Date Range Picker */}
              {showCustomRange && (
                <div className={`mt-4 p-4 rounded-lg border ${
                  isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'
                }`}>
                  <h3 className={`text-lg font-semibold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Select Custom Date Range
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        🟢 Start Date
                      </label>
                      <input
                        type="date"
                        value={customDateRange.start}
                        onChange={(e) => {
                          const newRange = { ...customDateRange, start: e.target.value };
                          setCustomDateRange(newRange);
                          if (newRange.start && newRange.end) {
                            setDateFilter('all'); // Trigger custom range filtering
                          }
                        }}
                        className={`w-full p-3 rounded-lg border transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        🔴 End Date
                      </label>
                      <input
                        type="date"
                        value={customDateRange.end}
                        onChange={(e) => {
                          const newRange = { ...customDateRange, end: e.target.value };
                          setCustomDateRange(newRange);
                          if (newRange.start && newRange.end) {
                            setDateFilter('all'); // Trigger custom range filtering
                          }
                        }}
                        className={`w-full p-3 rounded-lg border transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Filtered Statistics Panel */}
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6`}>
              {/* Total Trades */}
              <div className={`${
                isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
              } rounded-xl shadow-lg border p-4 text-center`}>
                <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] p-2 rounded-lg mb-3 inline-block">
                  <span className="text-white text-xl">📊</span>
                </div>
                <h3 className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {filteredStats.totalTrades}
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Total Trades
                </p>
              </div>
              
              {/* Win Rate */}
              <div className={`${
                isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
              } rounded-xl shadow-lg border p-4 text-center`}>
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-2 rounded-lg mb-3 inline-block">
                  <span className="text-white text-xl">🎯</span>
                </div>
                <h3 className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {filteredStats.winRate.toFixed(1)}%
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Win Rate
                </p>
              </div>
              
              {/* Net Profit */}
              <div className={`${
                isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
              } rounded-xl shadow-lg border p-4 text-center`}>
                <div className={`bg-gradient-to-r p-2 rounded-lg mb-3 inline-block ${
                  filteredStats.netProfit >= 0 
                    ? 'from-emerald-500 to-emerald-600' 
                    : 'from-rose-500 to-rose-600'
                }`}>
                  <span className="text-white text-xl">💰</span>
                </div>
                <h3 className={`text-2xl font-bold ${
                  filteredStats.netProfit >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  ${filteredStats.netProfit.toFixed(2)}
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Net Profit
                </p>
              </div>
              
              {/* Winning Trades */}
              <div className={`${
                isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
              } rounded-xl shadow-lg border p-4 text-center`}>
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-2 rounded-lg mb-3 inline-block">
                  <span className="text-white text-xl">✅</span>
                </div>
                <h3 className={`text-2xl font-bold text-emerald-600 dark:text-emerald-400`}>
                  {filteredStats.winningTrades}
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Winning Trades
                </p>
              </div>
            </div>

            {/* Enhanced Trades Table */}
            <div className={`${
              isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
            } rounded-xl shadow-lg border p-6 mb-6`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] p-3 rounded-xl mr-4">
                    <CalendarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Trading History
                    </h2>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {getDateRangeText()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-[#F59E0B] to-[#2563EB] rounded-full"></div>
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {filteredTrades.length} Trades
                  </span>
                </div>
              </div>
              
              {filteredTrades.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="bg-gradient-to-r from-[#F59E0B]/10 to-[#2563EB]/10 dark:from-amber-900/20 dark:to-blue-900/20 rounded-xl p-8">
                    <CalendarIcon className={`h-16 w-16 mx-auto mb-4 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                    <h3 className={`text-xl font-semibold mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      No Trades Yet
                    </h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Start by adding your first trade using the "Add Trade" button above
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b-2 ${
                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                      }`}>
                        <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          📅 Date
                        </th>
                        <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          📈 Symbol
                        </th>
                        <th className={`px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          🔄 Type
                        </th>
                        <th className={`px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          💰 P&L Amount
                        </th>
                        <th className={`px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          🟢 Entry
                        </th>
                        <th className={`px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          🔴 Exit
                        </th>
                        <th className={`px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          💸 Fees
                        </th>
                        <th className={`px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          🎯 Net P&L
                        </th>
                        <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          📝 Notes
                        </th>
                        <th className={`px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          ⚙️ Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredTrades.map((trade, index) => (
                        <tr key={trade.id} className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                          index % 2 === 0 
                            ? isDarkMode ? 'bg-gray-800/30' : 'bg-white' 
                            : isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50/50'
                        }`}>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                            isDarkMode ? 'text-gray-200' : 'text-gray-900'
                          }`}>
                            {new Date(trade.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: '2-digit'
                            })}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm font-bold ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {trade.symbol}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                              trade.type === 'Long' 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                            }`}>
                              {trade.type === 'Long' ? '📈' : '📉'} {trade.type}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className={`text-sm font-bold ${
                              trade.quantity >= 0 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              ${trade.quantity.toFixed(2)}
                            </span>
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-center text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            ${trade.entryPrice.toFixed(2)}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-center text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            ${trade.exitPrice.toFixed(2)}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-center text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            ${trade.fees.toFixed(2)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center">
                              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                trade.profitLoss >= 0 
                                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' 
                                  : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'
                              }`}>
                                {trade.profitLoss >= 0 ? '✅' : '❌'} ${trade.profitLoss.toFixed(2)}
                              </span>
                            </div>
                          </td>
                          <td className={`px-4 py-4 text-sm max-w-xs truncate ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`} title={trade.notes || 'No notes'}>
                            {trade.notes || '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => handleEditTrade(trade)}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-2 rounded-lg transition-all duration-300 transform hover:scale-110 shadow-md"
                                title="Edit Trade"
                              >
                                <EditIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTrade(trade.id)}
                                className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white p-2 rounded-lg transition-all duration-300 transform hover:scale-110 shadow-md"
                                title="Delete Trade"
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
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
