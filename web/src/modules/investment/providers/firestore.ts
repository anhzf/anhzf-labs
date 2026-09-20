/**
 * FirestorePriceProvider
 *
 * Reads hand-entered prices from `investment_prices/{symbol}`.
 *
 * This is the manual-entry store and the ledger's source of truth: `currentPrice`
 * is only ever written by the user (see `setPrice`). Live/cached quotes live in
 * separate fields on the same document and are written by YahooPriceProvider, so
 * a Yahoo fetch can never clobber a manual price.
 *
 * Client-safe — the Firestore web SDK works in both browser and server contexts.
 */
import type { Firestore } from 'firebase/firestore';
import type { PriceEntry, PriceProvider } from '../interfaces';

import { db } from '#/lib/firebase';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';

export class FirestorePriceProvider implements PriceProvider {
  constructor(private dbInstance: Firestore = db) { }

  async getPrice(symbol: string): Promise<number | null> {
    const docRef = doc(this.dbInstance, 'investment_prices', normalizeSymbol(symbol));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data() as PriceEntry;
    // A doc may exist with only cached fields, so this can legitimately be absent.
    return data.currentPrice ?? null;
  }

  async getPrices(symbols: string[]): Promise<Record<string, number | null>> {
    const result: Record<string, number | null> = {};
    await Promise.all(
      symbols.map(async (sym) => {
        result[normalizeSymbol(sym)] = await this.getPrice(sym);
      })
    );
    return result;
  }

  async getAllPrices(): Promise<PriceEntry[]> {
    const snap = await getDocs(collection(this.dbInstance, 'investment_prices'));
    // The doc id is the canonical symbol; the stored `symbol` field is a copy.
    return snap.docs.map((d) => ({ ...(d.data() as PriceEntry), symbol: d.id }));
  }

  async setPrice(symbol: string, price: number, updatedBy = 'system'): Promise<void> {
    const sym = normalizeSymbol(symbol);
    const ref = doc(this.dbInstance, 'investment_prices', sym);
    await setDoc(
      ref,
      {
        symbol: sym,
        currentPrice: price,
        updatedAt: serverTimestamp(),
        updatedBy,
      },
      { merge: true }
    );
  }
}

/**
 * Canonical symbol form used for document IDs. Trimming matters: `investment_prices`
 * is keyed by symbol, so ' aapl ' and 'AAPL' must not become two documents.
 */
export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}
