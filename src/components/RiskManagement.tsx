import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, Trash2 } from 'lucide-react';

interface RiskProfile {
  id: string;
  name: string;
  accountBalance: number;
  riskPerTrade: number;
  riskRewardRatio: number;
  dailyLossLimit: number;
  monthlyTarget: number;
  tradesPerDay: number;
  tradingSessions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function RiskManagement() {
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPerTrade, setRiskPerTrade] = useState<number>(1);
  const [riskRewardRatio, setRiskRewardRatio] = useState<number>(2);
  const [tradesPerDay, setTradesPerDay] = useState<number>(3);
  const [tradingAccount, setTradingAccount] = useState<string>('main');
  const [riskAmount, setRiskAmount] = useState<number>(0);
  const [rewardAmount, setRewardAmount] = useState<number>(0);
  const [monthlyProjection, setMonthlyProjection] = useState<number>(0);
  const [savedProfiles, setSavedProfiles] = useState<RiskProfile[]>([]);
  const [profileName, setProfileName] = useState<string>('');
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  // Calculate risk and reward amounts
  useEffect(() => {
    const risk = (accountBalance * riskPerTrade) / 100;
    const reward = risk * riskRewardRatio;
    const monthly = (reward * (tradesPerDay * 22 * 0.5)) - (risk * (tradesPerDay * 22 * 0.5));
    
    setRiskAmount(parseFloat(risk.toFixed(2)));
    setRewardAmount(parseFloat(reward.toFixed(2)));
    setMonthlyProjection(parseFloat(monthly.toFixed(2)));
  }, [accountBalance, riskPerTrade, riskRewardRatio, tradesPerDay]);

  const handleSaveProfile = () => {
    if (!profileName.trim()) return;
    
    const newProfile: RiskProfile = {
      id: Date.now().toString(),
      name: profileName,
      accountBalance,
      riskPerTrade,
      riskRewardRatio,
      dailyLossLimit: riskAmount * 3, // 3x risk per trade as daily limit
      monthlyTarget: monthlyProjection,
      tradesPerDay,
      tradingSessions: ['New York'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSavedProfiles([...savedProfiles, newProfile]);
    setProfileName('');
  };

  const loadProfile = (profile: RiskProfile) => {
    setAccountBalance(profile.accountBalance);
    setRiskPerTrade(profile.riskPerTrade);
    setRiskRewardRatio(profile.riskRewardRatio);
    setTradesPerDay(profile.tradesPerDay);
    setActiveProfile(profile.id);
  };

  const deleteProfile = (id: string) => {
    setSavedProfiles(savedProfiles.filter(profile => profile.id !== id));
    if (activeProfile === id) {
      resetForm();
    }
  };

  const resetForm = () => {
    setAccountBalance(10000);
    setRiskPerTrade(1);
    setRiskRewardRatio(2);
    setTradesPerDay(3);
    setActiveProfile(null);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Risk Management</h2>
        <div className="flex space-x-2">
          <select 
            value={tradingAccount}
            onChange={(e) => setTradingAccount(e.target.value)}
            className="px-3 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="main">Main Account</option>
            <option value="secondary">Secondary Account</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Risk Parameters */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-white">Risk Parameters</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Balance ($)
              </label>
              <input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(Number(e.target.value))}
                className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Risk Per Trade (%)
              </label>
              <input
                type="number"
                value={riskPerTrade}
                onChange={(e) => setRiskPerTrade(Number(e.target.value))}
                step="0.1"
                min="0.1"
                max="5"
                className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Recommended: 0.5% - 2% of account balance
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Risk:Reward Ratio
              </label>
              <select
                value={riskRewardRatio}
                onChange={(e) => setRiskRewardRatio(Number(e.target.value))}
                className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
              >
                <option value="1">1:1 (1R)</option>
                <option value="2">1:2 (2R)</option>
                <option value="3">1:3 (3R)</option>
                <option value="4">1:4 (4R)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Trades Per Day
              </label>
              <input
                type="number"
                value={tradesPerDay}
                onChange={(e) => setTradesPerDay(Number(e.target.value))}
                min="1"
                max="20"
                className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Risk Summary */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-white">Risk Summary</h3>
          
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-600 p-3 rounded-md shadow">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk Per Trade:</span>
                <span className="font-semibold">${riskAmount.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {riskPerTrade}% of ${accountBalance.toLocaleString()}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-600 p-3 rounded-md shadow">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reward Per Trade:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  +${rewardAmount.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {riskRewardRatio}R (1:{riskRewardRatio})
              </div>
            </div>

            <div className="bg-white dark:bg-gray-600 p-3 rounded-md shadow">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Risk (3x):</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  -${(riskAmount * 3).toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Max daily loss limit
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Monthly Projection*:</span>
                <span className={`font-bold ${monthlyProjection >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {monthlyProjection >= 0 ? '+' : ''}${Math.abs(monthlyProjection).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                *Based on {tradesPerDay} trades/day, 22 trading days, 50% win rate
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Profile Section */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-white">Save Risk Profile</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Profile name (e.g., 'Conservative', 'Aggressive')"
            className="flex-1 p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
          />
          <button
            onClick={handleSaveProfile}
            disabled={!profileName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={16} /> Save Profile
          </button>
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500 flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> Reset
          </button>
        </div>
      </div>

      {/* Saved Profiles */}
      {savedProfiles.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-white">Saved Profiles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedProfiles.map((profile) => (
              <div 
                key={profile.id}
                className={`p-3 rounded-lg border ${activeProfile === profile.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'} cursor-pointer`}
                onClick={() => loadProfile(profile)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{profile.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {profile.riskPerTrade}% risk • 1:{profile.riskRewardRatio} RR • {profile.tradesPerDay}/day
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ${profile.accountBalance.toLocaleString()} • Updated: {new Date(profile.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProfile(profile.id);
                    }}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                    title="Delete profile"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Management Tips */}
      <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded-r">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Risk Management Tips</h3>
        <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <li>• Never risk more than 1-2% of your account on a single trade</li>
          <li>• Aim for a minimum risk:reward ratio of 1:2 or better</li>
          <li>• Set a daily loss limit (e.g., 3x your risk per trade)</li>
          <li>• Take breaks after consecutive losses to avoid emotional trading</li>
          <li>• Adjust position size based on your stop loss distance</li>
        </ul>
      </div>
    </div>
  );
}
