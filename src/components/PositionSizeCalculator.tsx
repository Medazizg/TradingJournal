import React, { useState } from 'react';
import { CalculatorIcon, RefreshCwIcon, DollarSignIcon, TrendingUpIcon, AlertTriangleIcon } from 'lucide-react';

interface CalculatorFormData {
  accountBalance: string;
  riskPercentage: string;
  stopLossPips: string;
  pair: string;
  takeProfitPips: string;
}

interface CalculationResults {
  lotSize: number;
  riskAmount: number;
  potentialProfit: number | null;
  pipValue: number;
}

interface PositionSizeCalculatorProps {
  darkMode: boolean;
}

export default function PositionSizeCalculator({ darkMode }: PositionSizeCalculatorProps) {
  const [formData, setFormData] = useState<CalculatorFormData>({
    accountBalance: '',
    riskPercentage: '',
    stopLossPips: '',
    pair: 'XAUUSD',
    takeProfitPips: ''
  });

  const [results, setResults] = useState<CalculationResults | null>(null);

  // Currency pairs with their pip values
  const pairOptions = [
    { value: 'XAUUSD', label: 'Gold (XAUUSD)', pipValue: 0.1 },  // $0.1 per pip for 0.01 lot
    { value: 'EURUSD', label: 'EUR/USD', pipValue: 0.1 },
    { value: 'GBPUSD', label: 'GBP/USD', pipValue: 0.1 },
    { value: 'USDJPY', label: 'USD/JPY', pipValue: 0.091 },  // Approximation for JPY pairs
    { value: 'USDCHF', label: 'USD/CHF', pipValue: 0.1 },
    { value: 'AUDUSD', label: 'AUD/USD', pipValue: 0.1 },
    { value: 'USDCAD', label: 'USD/CAD', pipValue: 0.075 },  // Approximation
    { value: 'NZDUSD', label: 'NZD/USD', pipValue: 0.1 },
    { value: 'EURJPY', label: 'EUR/JPY', pipValue: 0.091 },
    { value: 'GBPJPY', label: 'GBP/JPY', pipValue: 0.091 }
  ];

  const calculatePositionSize = () => {
    const balance = parseFloat(formData.accountBalance);
    const riskPercent = parseFloat(formData.riskPercentage);
    const stopLoss = parseFloat(formData.stopLossPips);
    const selectedPair = pairOptions.find(p => p.value === formData.pair);
    const takeProfit = formData.takeProfitPips ? parseFloat(formData.takeProfitPips) : null;

    if (!balance || !riskPercent || !stopLoss || !selectedPair) {
      return;
    }

    // Calculate risk amount
    const riskAmount = (balance * riskPercent) / 100;
    
    // Get pip value for the selected pair
    const pipValue = selectedPair.pipValue;
    
    // Calculate lot size: Lot = Risk Amount / (Stop Loss * Pip Value)
    const lotSize = riskAmount / (stopLoss * pipValue);
    
    // Calculate potential profit if take profit is provided
    let potentialProfit = null;
    if (takeProfit) {
      potentialProfit = takeProfit * pipValue * lotSize;
    }

    setResults({
      lotSize: parseFloat(lotSize.toFixed(4)),
      riskAmount: parseFloat(riskAmount.toFixed(2)),
      potentialProfit: potentialProfit ? parseFloat(potentialProfit.toFixed(2)) : null,
      pipValue
    });
  };

  const resetForm = () => {
    setFormData({
      accountBalance: '',
      riskPercentage: '',
      stopLossPips: '',
      pair: 'XAUUSD',
      takeProfitPips: ''
    });
    setResults(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-xl shadow-lg border transition-colors duration-300 ${
        darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      } p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalculatorIcon className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className={`text-2xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Position Size Calculator
              </h1>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Calculate optimal lot size based on your risk management
              </p>
            </div>
          </div>
          <button
            onClick={resetForm}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
            } transform hover:scale-105`}
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className={`rounded-xl shadow-lg border transition-colors duration-300 ${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } p-6`}>
          <h2 className={`text-xl font-semibold mb-6 flex items-center ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <DollarSignIcon className="h-5 w-5 mr-2 text-green-500" />
            Trading Parameters
          </h2>

          <div className="space-y-4">
            {/* Account Balance */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                💰 Account Balance ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.accountBalance}
                onChange={(e) => setFormData({ ...formData, accountBalance: e.target.value })}
                className={`w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-400'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }`}
                placeholder="10000.00"
                required
              />
            </div>

            {/* Risk Percentage */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                ⚠️ Risk Percentage (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={formData.riskPercentage}
                onChange={(e) => setFormData({ ...formData, riskPercentage: e.target.value })}
                className={`w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-400'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }`}
                placeholder="2.0"
                required
              />
              <p className={`text-xs mt-1 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Recommended: 1-3% per trade
              </p>
            </div>

            {/* Stop Loss */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                🛑 Stop Loss (pips)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.stopLossPips}
                onChange={(e) => setFormData({ ...formData, stopLossPips: e.target.value })}
                className={`w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-400'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }`}
                placeholder="50.0"
                required
              />
            </div>

            {/* Currency Pair */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                📈 Currency Pair
              </label>
              <select
                value={formData.pair}
                onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                className={`w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 text-white focus:border-blue-400'
                    : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500'
                }`}
                required
              >
                {pairOptions.map((pair) => (
                  <option key={pair.value} value={pair.value}>
                    {pair.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Take Profit (Optional) */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                🎯 Take Profit (pips) - Optional
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.takeProfitPips}
                onChange={(e) => setFormData({ ...formData, takeProfitPips: e.target.value })}
                className={`w-full p-3 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-400'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }`}
                placeholder="100.0"
              />
            </div>

            <button
              onClick={calculatePositionSize}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center"
            >
              <CalculatorIcon className="h-5 w-5 mr-2" />
              Calculate Position Size
            </button>
          </div>
        </div>

        {/* Results */}
        <div className={`rounded-xl shadow-lg border transition-colors duration-300 ${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } p-6`}>
          <h2 className={`text-xl font-semibold mb-6 flex items-center ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <TrendingUpIcon className="h-5 w-5 mr-2 text-green-500" />
            Calculation Results
          </h2>

          {!results ? (
            <div className={`text-center py-12 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <CalculatorIcon className={`h-16 w-16 mx-auto mb-4 ${
                darkMode ? 'text-gray-600' : 'text-gray-300'
              }`} />
              <p className="text-lg mb-2">No calculations yet</p>
              <p>Fill in the trading parameters and click calculate</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Lot Size */}
              <div className={`p-4 rounded-lg border ${
                darkMode 
                  ? 'bg-blue-900/20 border-blue-700' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-semibold ${
                      darkMode ? 'text-blue-300' : 'text-blue-800'
                    }`}>
                      Lot Size
                    </h3>
                    <p className={`text-sm ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      Optimal position size
                    </p>
                  </div>
                  <div className={`text-2xl font-bold ${
                    darkMode ? 'text-blue-300' : 'text-blue-800'
                  }`}>
                    {results.lotSize} lots
                  </div>
                </div>
              </div>

              {/* Risk Amount */}
              <div className={`p-4 rounded-lg border ${
                darkMode 
                  ? 'bg-red-900/20 border-red-700' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-semibold ${
                      darkMode ? 'text-red-300' : 'text-red-800'
                    }`}>
                      Risk Amount
                    </h3>
                    <p className={`text-sm ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      Maximum loss if SL hit
                    </p>
                  </div>
                  <div className={`text-2xl font-bold ${
                    darkMode ? 'text-red-300' : 'text-red-800'
                  }`}>
                    {formatCurrency(results.riskAmount)}
                  </div>
                </div>
              </div>

              {/* Potential Profit */}
              {results.potentialProfit && (
                <div className={`p-4 rounded-lg border ${
                  darkMode 
                    ? 'bg-green-900/20 border-green-700' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-semibold ${
                        darkMode ? 'text-green-300' : 'text-green-800'
                      }`}>
                        Potential Profit
                      </h3>
                      <p className={`text-sm ${
                        darkMode ? 'text-green-400' : 'text-green-600'
                      }`}>
                        If take profit is hit
                      </p>
                    </div>
                    <div className={`text-2xl font-bold ${
                      darkMode ? 'text-green-300' : 'text-green-800'
                    }`}>
                      {formatCurrency(results.potentialProfit)}
                    </div>
                  </div>
                </div>
              )}

              {/* Risk-Reward Ratio */}
              {results.potentialProfit && (
                <div className={`p-4 rounded-lg border ${
                  darkMode 
                    ? 'bg-purple-900/20 border-purple-700' 
                    : 'bg-purple-50 border-purple-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-semibold ${
                        darkMode ? 'text-purple-300' : 'text-purple-800'
                      }`}>
                        Risk-Reward Ratio
                      </h3>
                      <p className={`text-sm ${
                        darkMode ? 'text-purple-400' : 'text-purple-600'
                      }`}>
                        Profit to risk ratio
                      </p>
                    </div>
                    <div className={`text-2xl font-bold ${
                      darkMode ? 'text-purple-300' : 'text-purple-800'
                    }`}>
                      1:{(results.potentialProfit / results.riskAmount).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* Trading Summary */}
              <div className={`p-4 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <h3 className={`font-semibold mb-3 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Trade Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Pair:
                    </span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                      {formData.pair}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Pip Value:
                    </span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                      ${results.pipValue} per pip
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Stop Loss:
                    </span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                      {formData.stopLossPips} pips
                    </span>
                  </div>
                  {formData.takeProfitPips && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        Take Profit:
                      </span>
                      <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                        {formData.takeProfitPips} pips
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Warning */}
              <div className={`p-4 rounded-lg border border-yellow-500 ${
                darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'
              }`}>
                <div className="flex items-start space-x-2">
                  <AlertTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className={`font-semibold text-yellow-600 ${
                      darkMode ? 'text-yellow-400' : 'text-yellow-700'
                    }`}>
                      Risk Warning
                    </h4>
                    <p className={`text-sm mt-1 ${
                      darkMode ? 'text-yellow-300' : 'text-yellow-600'
                    }`}>
                      These calculations are estimates. Always consider market conditions, 
                      spread, and broker specifications. Never risk more than you can afford to lose.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
