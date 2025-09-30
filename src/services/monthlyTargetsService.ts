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
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import type { MonthlyTarget, Trade } from '../types/trading';
import { getCurrentMonth, calculateTradeStats, filterTradesByDateRange } from '../utils/historicalUtils';

// Collection reference
const MONTHLY_TARGETS_COLLECTION = 'monthlyTargets';

// Helper function to convert Firestore document to MonthlyTarget object
const firestoreToMonthlyTarget = (doc: DocumentSnapshot): MonthlyTarget | null => {
  if (!doc.exists()) return null;
  
  const data = doc.data();
  if (!data) return null;
  
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    completedAt: data.completedAt?.toDate() || undefined,
  } as MonthlyTarget;
};

// 📊 CREATE MONTHLY TARGET
export const createMonthlyTarget = async (target: Omit<MonthlyTarget, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date();
    const targetData = {
      ...target,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(collection(db, MONTHLY_TARGETS_COLLECTION), targetData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating monthly target:', error);
    throw new Error('Failed to create monthly target');
  }
};

// 📖 GET MONTHLY TARGET BY ID
export const getMonthlyTargetById = async (targetId: string): Promise<MonthlyTarget | null> => {
  try {
    const docRef = doc(db, MONTHLY_TARGETS_COLLECTION, targetId);
    const docSnap = await getDoc(docRef);
    return firestoreToMonthlyTarget(docSnap);
  } catch (error) {
    console.error('Error getting monthly target:', error);
    throw new Error('Failed to get monthly target');
  }
};

// 📋 GET ALL MONTHLY TARGETS FOR USER
export const getUserMonthlyTargets = async (userId: string): Promise<MonthlyTarget[]> => {
  try {
    const targetsQuery = query(
      collection(db, MONTHLY_TARGETS_COLLECTION),
      where('userId', '==', userId),
      orderBy('year', 'desc'),
      orderBy('month', 'desc')
    );
    
    const querySnapshot = await getDocs(targetsQuery);
    const targets: MonthlyTarget[] = [];
    
    querySnapshot.forEach((doc) => {
      const target = firestoreToMonthlyTarget(doc);
      if (target) targets.push(target);
    });
    
    return targets;
  } catch (error) {
    console.error('Error getting user monthly targets:', error);
    throw new Error('Failed to get user monthly targets');
  }
};

// 🎯 GET MONTHLY TARGET FOR SPECIFIC MONTH
export const getMonthlyTarget = async (userId: string, year: number, month: number): Promise<MonthlyTarget | null> => {
  try {
    const targetsQuery = query(
      collection(db, MONTHLY_TARGETS_COLLECTION),
      where('userId', '==', userId),
      where('year', '==', year),
      where('month', '==', month)
    );
    
    const querySnapshot = await getDocs(targetsQuery);
    
    if (querySnapshot.empty) return null;
    
    const doc = querySnapshot.docs[0];
    return firestoreToMonthlyTarget(doc);
  } catch (error) {
    console.error('Error getting monthly target:', error);
    throw new Error('Failed to get monthly target');
  }
};

// ✏️ UPDATE MONTHLY TARGET
export const updateMonthlyTarget = async (targetId: string, updates: Partial<MonthlyTarget>): Promise<void> => {
  try {
    const docRef = doc(db, MONTHLY_TARGETS_COLLECTION, targetId);
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating monthly target:', error);
    throw new Error('Failed to update monthly target');
  }
};

// 🗑️ DELETE MONTHLY TARGET
export const deleteMonthlyTarget = async (targetId: string): Promise<void> => {
  try {
    const docRef = doc(db, MONTHLY_TARGETS_COLLECTION, targetId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting monthly target:', error);
    throw new Error('Failed to delete monthly target');
  }
};

// 🎯 GET OR CREATE CURRENT MONTH TARGET
export const getCurrentMonthTarget = async (userId: string): Promise<MonthlyTarget> => {
  const { year, month, monthName } = getCurrentMonth();
  
  let target = await getMonthlyTarget(userId, year, month);
  
  if (!target) {
    // Create default target for current month
    const targetId = await createMonthlyTarget({
      userId,
      year,
      month,
      monthName,
      pnlTarget: 1000, // Default $1000 target
      tradesTarget: 20, // Default 20 trades target
      winRateTarget: 60, // Default 60% win rate target
      currentPnL: 0,
      currentTrades: 0,
      currentWinRate: 0,
      isCompleted: false,
    });
    
    target = await getMonthlyTargetById(targetId);
  }
  
  return target!;
};

// 🔄 UPDATE MONTHLY TARGET PROGRESS
export const updateMonthlyTargetProgress = async (
  userId: string,
  year: number,
  month: number,
  trades: Trade[]
): Promise<void> => {
  try {
    const target = await getMonthlyTarget(userId, year, month);
    if (!target) return;
    
    // Filter trades for the specific month
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const monthTrades = filterTradesByDateRange(trades, { startDate, endDate });
    const stats = calculateTradeStats(monthTrades);
    
    // Check if target is completed
    const isCompleted = 
      stats.totalPnL >= target.pnlTarget &&
      stats.totalTrades >= target.tradesTarget &&
      stats.winRate >= target.winRateTarget;
    
    const updates: Partial<MonthlyTarget> = {
      currentPnL: stats.totalPnL,
      currentTrades: stats.totalTrades,
      currentWinRate: stats.winRate,
      isCompleted,
    };
    
    // Set completion date if just completed
    if (isCompleted && !target.isCompleted) {
      updates.completedAt = new Date();
    }
    
    await updateMonthlyTarget(target.id, updates);
  } catch (error) {
    console.error('Error updating monthly target progress:', error);
    throw new Error('Failed to update monthly target progress');
  }
};

// 📊 GET YEAR TARGETS SUMMARY
export const getYearTargetsSummary = async (userId: string, year: number) => {
  try {
    const targetsQuery = query(
      collection(db, MONTHLY_TARGETS_COLLECTION),
      where('userId', '==', userId),
      where('year', '==', year),
      orderBy('month', 'asc')
    );
    
    const querySnapshot = await getDocs(targetsQuery);
    const targets: MonthlyTarget[] = [];
    
    querySnapshot.forEach((doc) => {
      const target = firestoreToMonthlyTarget(doc);
      if (target) targets.push(target);
    });
    
    // Calculate summary statistics
    const totalTargetPnL = targets.reduce((sum, t) => sum + t.pnlTarget, 0);
    const totalCurrentPnL = targets.reduce((sum, t) => sum + t.currentPnL, 0);
    const totalTargetTrades = targets.reduce((sum, t) => sum + t.tradesTarget, 0);
    const totalCurrentTrades = targets.reduce((sum, t) => sum + t.currentTrades, 0);
    const completedTargets = targets.filter(t => t.isCompleted).length;
    const averageWinRateTarget = targets.length > 0 
      ? targets.reduce((sum, t) => sum + t.winRateTarget, 0) / targets.length 
      : 0;
    const averageCurrentWinRate = targets.length > 0 
      ? targets.reduce((sum, t) => sum + t.currentWinRate, 0) / targets.length 
      : 0;
    
    return {
      year,
      targets,
      summary: {
        totalTargetPnL,
        totalCurrentPnL,
        totalTargetTrades,
        totalCurrentTrades,
        completedTargets,
        totalTargets: targets.length,
        completionRate: targets.length > 0 ? (completedTargets / targets.length) * 100 : 0,
        averageWinRateTarget,
        averageCurrentWinRate,
        pnlProgress: totalTargetPnL > 0 ? (totalCurrentPnL / totalTargetPnL) * 100 : 0,
        tradesProgress: totalTargetTrades > 0 ? (totalCurrentTrades / totalTargetTrades) * 100 : 0,
      }
    };
  } catch (error) {
    console.error('Error getting year targets summary:', error);
    throw new Error('Failed to get year targets summary');
  }
};
