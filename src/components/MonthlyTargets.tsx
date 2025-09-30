import React, { useState, useEffect } from 'react';
import {
  TargetIcon,
  EditIcon,
  CalendarIcon,
  DollarSignIcon,
  BarChartIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrophyIcon,
  ClockIcon
} from 'lucide-react';
import type { MonthlyTarget, Trade } from '../types/trading';
import {
  getCurrentMonthTarget,
  getUserMonthlyTargets,
  createMonthlyTarget,
  updateMonthlyTarget,
  updateMonthlyTargetProgress,
  getYearTargetsSummary
} from '../services/monthlyTargetsService';
import { getCurrentMonth, getMonthName } from '../utils/historicalUtils';

interface MonthlyTargetsProps {
  trades: Trade[];
  userId: string;
  darkMode: boolean;
}

interface TargetFormData {
  pnlTarget: string;
  tradesTarget: string;
  winRateTarget: string;
}

const MonthlyTargetsComponent: React.FC<MonthlyTargetsProps> = ({
  trades,
  userId,
  darkMode
}) => {
  const [currentTarget, setCurrentTarget] = useState<MonthlyTarget | null>(null);
  const [allTargets, setAllTargets] = useState<MonthlyTarget[]>([]);
  const [yearSummary, setYearSummary] = useState<{summary: any, targets: any[]} | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [formData, setFormData] = useState<TargetFormData>({
    pnlTarget: '',
    tradesTarget: '',
    winRateTarget: ''
  });

  // Load data
  useEffect(() => {
    loadTargetsData();
  }, [userId, selectedYear]);

  // Update progress when trades change
  useEffect(() => {
    if (currentTarget && trades.length > 0) {
      updateProgress();
    }
  }, [trades, currentTarget]);

  const loadTargetsData = async () => {
    try {
      setLoading(true);
      
      // Load current month target
      const current = await getCurrentMonthTarget(userId);
      setCurrentTarget(current);
      
      // Load all targets for the user
      const allUserTargets = await getUserMonthlyTargets(userId);
      setAllTargets(allUserTargets);
      
      // Load year summary
      const summary = await getYearTargetsSummary(userId, selectedYear);
      setYearSummary(summary);
      
    } catch (error) {
      console.error('Error loading targets data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async () => {
    if (!currentTarget) return;
    
    try {
      await updateMonthlyTargetProgress(
        userId,
        currentTarget.year,
        currentTarget.month,
        trades
      );
      
      // Reload current target to get updated progress
      const updated = await getCurrentMonthTarget(userId);
      setCurrentTarget(updated);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { year, month, monthName } = getCurrentMonth();
      
      const targetData = {
        userId,
        year,
        month,
        monthName,
        pnlTarget: parseFloat(formData.pnlTarget),
        tradesTarget: parseInt(formData.tradesTarget),
        winRateTarget: parseFloat(formData.winRateTarget),
        currentPnL: 0,
        currentTrades: 0,
        currentWinRate: 0,
        isCompleted: false,
      };

      if (showEditForm && currentTarget) {
        await updateMonthlyTarget(currentTarget.id, targetData);
      } else {
        await createMonthlyTarget(targetData);
      }

      await loadTargetsData();
      resetForm();
      
    } catch (error) {
      console.error('Error saving target:', error);
      alert('❌ Error saving target. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      pnlTarget: '',
      tradesTarget: '',
      winRateTarget: ''
    });
    setShowEditForm(false);
    setShowCreateForm(false);
  };

  const handleEdit = () => {
    if (!currentTarget) return;
    
    setFormData({
      pnlTarget: currentTarget.pnlTarget.toString(),
      tradesTarget: currentTarget.tradesTarget.toString(),
      winRateTarget: currentTarget.winRateTarget.toString()
    });
    setShowEditForm(true);
  };

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

  const getProgressColor = (current: number, target: number) => {
    const progress = target > 0 ? (current / target) * 100 : 0;
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
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
      {/* Current Month Target */}
      {currentTarget && (
        <div className={`rounded-xl shadow-lg border p-6 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold flex items-center ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <TargetIcon className="h-7 w-7 mr-3 text-green-500" />
              🎯 {currentTarget.monthName} Targets
            </h2>
            
            <div className="flex items-center space-x-3">
              {currentTarget.isCompleted ? (
                <div className="flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Completed!</span>
                </div>
              ) : (
                <div className="flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">In Progress</span>
                </div>
              )}
              
              <button
                onClick={handleEdit}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/30'
                    : 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'
                }`}
                title="Edit targets"
              >
                <EditIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* P&L Progress */}
            <div className={`p-4 rounded-lg border ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <DollarSignIcon className="h-5 w-5 mr-2 text-green-500" />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    P&L Target
                  </span>
                </div>
                {currentTarget.currentPnL >= currentTarget.pnlTarget ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    {formatCurrency(currentTarget.currentPnL)} / {formatCurrency(currentTarget.pnlTarget)}
                  </span>
                  <span className={`font-medium ${
                    currentTarget.currentPnL >= currentTarget.pnlTarget
                      ? 'text-green-500'
                      : darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {currentTarget.pnlTarget > 0 
                      ? `${((currentTarget.currentPnL / currentTarget.pnlTarget) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      getProgressColor(currentTarget.currentPnL, currentTarget.pnlTarget)
                    }`}
                    style={{ 
                      width: `${Math.min(
                        Math.max((currentTarget.currentPnL / currentTarget.pnlTarget) * 100, 0), 
                        100
                      )}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Trades Progress */}
            <div className={`p-4 rounded-lg border ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <BarChartIcon className="h-5 w-5 mr-2 text-blue-500" />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Trades Target
                  </span>
                </div>
                {currentTarget.currentTrades >= currentTarget.tradesTarget ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    {currentTarget.currentTrades} / {currentTarget.tradesTarget}
                  </span>
                  <span className={`font-medium ${
                    currentTarget.currentTrades >= currentTarget.tradesTarget
                      ? 'text-green-500'
                      : darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {currentTarget.tradesTarget > 0 
                      ? `${((currentTarget.currentTrades / currentTarget.tradesTarget) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      getProgressColor(currentTarget.currentTrades, currentTarget.tradesTarget)
                    }`}
                    style={{ 
                      width: `${Math.min(
                        (currentTarget.currentTrades / currentTarget.tradesTarget) * 100, 
                        100
                      )}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Win Rate Progress */}
            <div className={`p-4 rounded-lg border ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <TrophyIcon className="h-5 w-5 mr-2 text-yellow-500" />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Win Rate Target
                  </span>
                </div>
                {currentTarget.currentWinRate >= currentTarget.winRateTarget ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    {formatPercentage(currentTarget.currentWinRate)} / {formatPercentage(currentTarget.winRateTarget)}
                  </span>
                  <span className={`font-medium ${
                    currentTarget.currentWinRate >= currentTarget.winRateTarget
                      ? 'text-green-500'
                      : darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {currentTarget.winRateTarget > 0 
                      ? `${((currentTarget.currentWinRate / currentTarget.winRateTarget) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      getProgressColor(currentTarget.currentWinRate, currentTarget.winRateTarget)
                    }`}
                    style={{ 
                      width: `${Math.min(
                        (currentTarget.currentWinRate / currentTarget.winRateTarget) * 100, 
                        100
                      )}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Year Summary */}
      {yearSummary && (
        <div className={`rounded-xl shadow-lg border p-6 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-xl font-semibold flex items-center ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <CalendarIcon className="h-6 w-6 mr-2 text-purple-500" />
              📅 {selectedYear} Year Overview
            </h3>
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className={`px-3 py-2 rounded-lg border ${
                darkMode 
                  ? 'border-gray-600 bg-gray-700 text-white' 
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Year Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                yearSummary.summary.totalCurrentPnL >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {formatCurrency(yearSummary.summary.totalCurrentPnL)}
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total P&L
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {yearSummary.summary.completedTargets} / {yearSummary.summary.totalTargets}
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Completed
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                yearSummary.summary.completionRate >= 50 ? 'text-green-500' : 'text-red-500'
              }`}>
                {formatPercentage(yearSummary.summary.completionRate)}
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Success Rate
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                yearSummary.summary.averageCurrentWinRate >= 50 ? 'text-green-500' : 'text-red-500'
              }`}>
                {formatPercentage(yearSummary.summary.averageCurrentWinRate)}
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Avg Win Rate
              </div>
            </div>
          </div>

          {/* Monthly Targets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
              const target = yearSummary.targets.find((t: MonthlyTarget) => t.month === month);
              const monthName = getMonthName(month);
              
              return (
                <div key={month} className={`p-4 rounded-lg border transition-colors ${
                  target?.isCompleted
                    ? darkMode 
                      ? 'bg-green-900/30 border-green-700'
                      : 'bg-green-50 border-green-200'
                    : target
                      ? darkMode 
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-gray-50 border-gray-200'
                      : darkMode
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {monthName}
                    </span>
                    {target?.isCompleted && (
                      <TrophyIcon className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  
                  {target ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>P&L:</span>
                        <span className={target.currentPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {formatCurrency(target.currentPnL)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Trades:</span>
                        <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                          {target.currentTrades}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Win Rate:</span>
                        <span className={target.currentWinRate >= 50 ? 'text-green-500' : 'text-red-500'}>
                          {formatPercentage(target.currentWinRate)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className={`text-sm text-center py-2 ${
                      darkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      No target set
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit/Create Form */}
      {(showEditForm || showCreateForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl p-6 w-full max-w-md ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {showEditForm ? '✏️ Edit Monthly Targets' : '➕ Set Monthly Targets'}
              </h3>
              <button
                onClick={resetForm}
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
                  💰 Monthly P&L Target ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.pnlTarget}
                  onChange={(e) => setFormData({ ...formData, pnlTarget: e.target.value })}
                  className={`w-full p-3 border rounded-lg ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  placeholder="1000.00"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  📊 Monthly Trades Target
                </label>
                <input
                  type="number"
                  value={formData.tradesTarget}
                  onChange={(e) => setFormData({ ...formData, tradesTarget: e.target.value })}
                  className={`w-full p-3 border rounded-lg ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  placeholder="20"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  🎯 Win Rate Target (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.winRateTarget}
                  onChange={(e) => setFormData({ ...formData, winRateTarget: e.target.value })}
                  className={`w-full p-3 border rounded-lg ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-700 text-white' 
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  placeholder="60.0"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-4 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {showEditForm ? '✏️ Update Targets' : '➕ Set Targets'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
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
    </div>
  );
};

export default MonthlyTargetsComponent;
