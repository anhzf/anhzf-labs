import type { Firestore } from 'firebase/firestore';
import type { PriceProvider, Snapshot, Thesis, Transaction } from './interfaces';

import { db } from '#/lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { PRICE_PROVIDER } from './providers';

export class InvestmentService {
  constructor(
    private dbInstance: Firestore = db,
    private priceProvider: PriceProvider = PRICE_PROVIDER
  ) {
  }

  getPriceProvider(): PriceProvider {
    return this.priceProvider;
  }

  async addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(this.dbInstance, 'investment_transactions'), {
      ...transaction,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    const q = query(
      collection(this.dbInstance, 'investment_transactions'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction);
  }

  async deleteThesis(thesisId: string): Promise<void> {
    await deleteDoc(doc(this.dbInstance, 'investment_theses', thesisId));
  }

  async addThesis(thesis: Omit<Thesis, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(this.dbInstance, 'investment_theses'), {
      ...thesis,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async getTheses(userId: string): Promise<Thesis[]> {
    const q = query(
      collection(this.dbInstance, 'investment_theses'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Thesis);
  }

  async getThesesBySymbol(userId: string, symbol: string): Promise<Thesis[]> {
    const theses = await this.getTheses(userId);
    return theses.filter((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
  }

  async saveSnapshot(snapshot: Omit<Snapshot, 'id' | 'createdAt'> & { id?: string }): Promise<void> {
    const docId = `${snapshot.userId}_${snapshot.date}`;
    const ref = doc(this.dbInstance, 'investment_snapshots', docId);
    const existing = await getDoc(ref);
    const data = {
      ...snapshot,
      userId: snapshot.userId,
      date: snapshot.date,
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    };
    await setDoc(ref, data, { merge: true });
  }

  async getSnapshots(userId: string): Promise<Snapshot[]> {
    const q = query(
      collection(this.dbInstance, 'investment_snapshots'),
      where('userId', '==', userId),
      orderBy('date', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Snapshot);
  }
}

// FirestorePriceProvider moved to ./providers/firestore.ts (INV-006). Import it
// from there or from ./providers.
export { FirestorePriceProvider } from './providers/firestore';

export async function addThesis(thesis: Omit<Thesis, 'id' | 'createdAt'>) {
  const service = new InvestmentService();
  return service.addThesis(thesis);
}

export async function deleteThesis(thesisId: string) {
  const service = new InvestmentService();
  return service.deleteThesis(thesisId);
}
