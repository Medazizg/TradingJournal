import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Trade {
  id?: string;
  userId: string;
  date: string;
  symbol: string;
  type: 'Long' | 'Short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  fees: number;
  profitLoss: number;
  notes: string;
  createdAt: Timestamp;
}

export interface AccountPhase {
  id?: string;
  userId: string;
  phase: 'Step 1' | 'Step 2' | 'Funded';
  startingBalance: number;
  currentBalance: number;
  profitTarget: number;
  maxDrawdown: number;
  dailyLossLimit: number;
  tradingDays: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DailyStats {
  id?: string;
  userId: string;
  date: string;
  dailyPL: number;
  tradingStatus: 'allowed' | 'target_reached' | 'stopped' | 'banned';
  consecutiveLosses: number;
  tradesCount: number;
  createdAt: Timestamp;
}

const TRADES_COLLECTION = 'trades';
const ACCOUNT_PHASES_COLLECTION = 'accountPhases';
const DAILY_STATS_COLLECTION = 'dailyStats';

// Trades Services
export const addTrade = async (userId: string, trade: Omit<Trade, 'id' | 'userId' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, TRADES_COLLECTION), {
      ...trade,
      userId,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding trade:', error);
    throw error;
  }
};

export const getUserTrades = async (userId: string) => {
  try {
    const q = query(
      collection(db, TRADES_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Trade[];
  } catch (error) {
    console.error('Error fetching trades:', error);
    throw error;
  }
};

export const subscribeToUserTrades = (userId: string, callback: (trades: Trade[]) => void) => {
  const q = query(
    collection(db, TRADES_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const trades = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Trade[];
    callback(trades);
  });
};

// Account Phase Services
export const saveAccountPhase = async (userId: string, accountPhase: Omit<AccountPhase, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, ACCOUNT_PHASES_COLLECTION), {
      ...accountPhase,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving account phase:', error);
    throw error;
  }
};

export const updateAccountPhase = async (phaseId: string, updates: Partial<AccountPhase>) => {
  try {
    const docRef = doc(db, ACCOUNT_PHASES_COLLECTION, phaseId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating account phase:', error);
    throw error;
  }
};

export const getUserAccountPhase = async (userId: string) => {
  try {
    const q = query(
      collection(db, ACCOUNT_PHASES_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as AccountPhase;
    }
    return null;
  } catch (error) {
    console.error('Error fetching account phase:', error);
    throw error;
  }
};

// Daily Stats Services
export const saveDailyStats = async (userId: string, stats: Omit<DailyStats, 'id' | 'userId' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, DAILY_STATS_COLLECTION), {
      ...stats,
      userId,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving daily stats:', error);
    throw error;
  }
};

export const getDailyStats = async (userId: string, date: string) => {
  try {
    const q = query(
      collection(db, DAILY_STATS_COLLECTION),
      where('userId', '==', userId),
      where('date', '==', date)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as DailyStats;
    }
    return null;
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    throw error;
  }
};
