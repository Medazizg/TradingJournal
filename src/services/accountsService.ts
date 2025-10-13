import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Account } from '../types/trading';

const ACCOUNTS_COLLECTION = 'accounts';

export const createAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, ACCOUNTS_COLLECTION), {
    ...account,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
};

export const getUserAccounts = async (userId: string): Promise<Account[]> => {
  const q = query(collection(db, ACCOUNTS_COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Account, 'id'>) }));
};

export const updateAccount = async (id: string, updates: Partial<Account>): Promise<void> => {
  await updateDoc(doc(db, ACCOUNTS_COLLECTION, id), { ...updates, updatedAt: new Date() });
};

export const deleteAccount = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, ACCOUNTS_COLLECTION, id));
};
