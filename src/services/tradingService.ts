import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Trade } from '../types/trading';

// Collection reference
const TRADES_COLLECTION = 'trades';

// Helper function to convert Firestore document to Trade object
const firestoreToTrade = (doc: DocumentSnapshot): Trade | null => {
  if (!doc.exists()) return null;
  
  const data = doc.data();
  if (!data) return null;
  
  return {
    id: doc.id,
    ...data,
  } as Trade;
};

// 📊 CREATE TRADE
export const createTrade = async (trade: Omit<Trade, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, TRADES_COLLECTION), trade);
    return docRef.id;
  } catch (error) {
    console.error('Error creating trade:', error);
    throw new Error('Failed to create trade');
  }
};

// 📖 GET TRADE BY ID
export const getTradeById = async (tradeId: string): Promise<Trade | null> => {
  try {
    const docRef = doc(db, TRADES_COLLECTION, tradeId);
    const docSnap = await getDoc(docRef);
    return firestoreToTrade(docSnap);
  } catch (error) {
    console.error('Error getting trade:', error);
    throw new Error('Failed to get trade');
  }
};

// 📋 GET ALL TRADES FOR USER
export const getUserTrades = async (userId: string): Promise<Trade[]> => {
  try {
    const tradesQuery = query(
      collection(db, TRADES_COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(tradesQuery);
    const trades: Trade[] = [];
    
    querySnapshot.forEach((doc) => {
      const trade = firestoreToTrade(doc);
      if (trade) trades.push(trade);
    });
    
    return trades;
  } catch (error) {
    console.error('Error getting user trades:', error);
    throw new Error('Failed to get user trades');
  }
};

// 🔍 GET TRADES BY SYMBOL
export const getTradesBySymbol = async (userId: string, symbol: string): Promise<Trade[]> => {
  try {
    const tradesQuery = query(
      collection(db, TRADES_COLLECTION),
      where('userId', '==', userId),
      where('symbol', '==', symbol.toUpperCase()),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(tradesQuery);
    const trades: Trade[] = [];
    
    querySnapshot.forEach((doc) => {
      const trade = firestoreToTrade(doc);
      if (trade) trades.push(trade);
    });
    
    return trades;
  } catch (error) {
    console.error('Error getting trades by symbol:', error);
    throw new Error('Failed to get trades by symbol');
  }
};

// ✏️ UPDATE TRADE
export const updateTrade = async (tradeId: string, updates: Partial<Trade>): Promise<void> => {
  try {
    const docRef = doc(db, TRADES_COLLECTION, tradeId);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating trade:', error);
    throw new Error('Failed to update trade');
  }
};

// 🗑️ DELETE TRADE
export const deleteTrade = async (tradeId: string): Promise<void> => {
  try {
    const docRef = doc(db, TRADES_COLLECTION, tradeId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting trade:', error);
    throw new Error('Failed to delete trade');
  }
};

// 📊 CALCULATE PORTFOLIO SUMMARY
export const getPortfolioSummary = async (userId: string) => {
  try {
    const trades = await getUserTrades(userId);
    
    const totalTrades = trades.length;
    const totalNetPL = trades.reduce((sum, trade) => sum + trade.netPL, 0);
    const totalFees = trades.reduce((sum, trade) => sum + trade.fees, 0);
    const winningTrades = trades.filter(t => t.netPL > 0).length;
    const losingTrades = trades.filter(t => t.netPL < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.netPL)) : 0;
    const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.netPL)) : 0;
    const averageNetPL = totalTrades > 0 ? totalNetPL / totalTrades : 0;
    
    return {
      totalTrades,
      totalNetPL,
      totalFees,
      winningTrades,
      losingTrades,
      winRate,
      bestTrade,
      worstTrade,
      averageNetPL,
    };
  } catch (error) {
    console.error('Error getting portfolio summary:', error);
    throw new Error('Failed to get portfolio summary');
  }
};

// 👂 REAL-TIME TRADES LISTENER
export const subscribeToUserTrades = (
  userId: string,
  callback: (trades: Trade[]) => void
) => {
  const tradesQuery = query(
    collection(db, TRADES_COLLECTION),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );
  
  return onSnapshot(tradesQuery, (querySnapshot) => {
    const trades: Trade[] = [];
    querySnapshot.forEach((doc) => {
      const trade = firestoreToTrade(doc);
      if (trade) trades.push(trade);
    });
    callback(trades);
  });
};
