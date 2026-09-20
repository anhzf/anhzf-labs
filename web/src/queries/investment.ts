import { db } from '#/lib/firebase';
import type { FeePreset } from '#/modules/investment/fee-preset-service';
import {
  addFeePreset,
  deleteFeePreset,
  getFeePresets,
  updateFeePreset,
} from '#/modules/investment/fee-preset-service';
import type { Snapshot, Thesis, Transaction } from '#/modules/investment/interfaces';
import { FirestorePriceProvider, InvestmentService } from '#/modules/investment/service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Timestamp } from 'firebase/firestore';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useMemo } from 'react';

/**
 * Provenance stamped on cached quotes. Declared here rather than imported from
 * `yahoo.server.ts` — that module pulls in yahoo-finance2 and must never be
 * reachable from client code.
 */
const PROVIDER_SOURCE = 'yahoo';

const investmentService = new InvestmentService(db);
const priceProvider = new FirestorePriceProvider(db);

export const investmentKeys = {
  all: ['investment'] as const,
  transactions: (userId?: string) => [...investmentKeys.all, 'transactions', userId] as const,
  prices: () => [...investmentKeys.all, 'prices'] as const,
  theses: (userId?: string) => [...investmentKeys.all, 'theses', userId] as const,
  snapshots: (userId?: string) => [...investmentKeys.all, 'snapshots', userId] as const,
  settings: (userId?: string) => [...investmentKeys.all, 'settings', userId] as const,
  allowlist: (email?: string) => [...investmentKeys.all, 'allowlist', email] as const,
};

export function useInvestmentTransactionsQuery(userId?: string) {
  return useQuery({
    queryKey: investmentKeys.transactions(userId),
    queryFn: () => investmentService.getTransactions(userId!),
    enabled: !!userId,
  });
}

export function useInvestmentPricesQuery() {
  return useQuery({
    queryKey: investmentKeys.prices(),
    queryFn: () => priceProvider.getAllPrices(),
  });
}

/**
 * Price map for DISPLAY surfaces: prefers the live cached quote and falls back to
 * the hand-entered price. Also kicks off a refresh for anything stale or missing.
 *
 * Do NOT use this for the ledger/snapshots — those must read the manual
 * `currentPrice` only, or history would drift with intraday noise. Use
 * `useInvestmentPricesQuery` directly for that.
 */
export function useLivePrices(symbols: string[]) {
  const { data: entries = [], isLoading } = useInvestmentPricesQuery();
  const { mutate: refresh } = useRefreshQuotesMutation();

  // Depend on a joined string, not the array: the array identity changes every
  // render and would refire this effect indefinitely.
  const symbolsKey = useMemo(
    () => [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort().join(','),
    [symbols],
  );

  useEffect(() => {
    if (symbolsKey === '') return;
    refresh(symbolsKey.split(','));
  }, [symbolsKey, refresh]);

  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of entries) {
      const price = entry.cachedPrice ?? entry.currentPrice;
      // Skip rather than default to 0 — an absent price must not enter P&L math.
      if (price != null) map[entry.symbol] = price;
    }
    return map;
  }, [entries]);

  return { entries, priceMap, isLoading };
}

/** Symbols the user actually holds, in stable order. */
export function useHeldSymbols(transactions: Transaction[]) {
  return useMemo(
    () => [...new Set(transactions.map((t) => t.symbol.toUpperCase()))].sort(),
    [transactions],
  );
}

/**
 * Refreshes cached quotes via `/api/stocks`, writing them to Firestore with the
 * signed-in user's own credentials.
 *
 * The server route cannot cache for us: the `investment` database's rules
 * authorize by email, and the route has no Firestore identity. So the division
 * of labour is:
 *
 *   read cache (Firestore, as the user)  →  ask Yahoo only for what's missing
 *   →  write those back (Firestore, as the user)  →  existing query re-reads
 *
 * Only the `cachedPrice*` fields are written. The manual `currentPrice` is never
 * touched, so a refresh cannot rewrite hand-entered prices or the ledger.
 *
 * A failure is non-fatal: the UI falls back to the manual `currentPrice`.
 */
export function useRefreshQuotesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (symbols: string[]) => {
      const wanted = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
      if (wanted.length === 0) return { updated: 0, unknown: [] as string[] };

      // 1. What do we already hold, and is it still fresh?
      const existing = await priceProvider.getAllPrices();
      const fresh = new Map<string, number>();
      for (const entry of existing) {
        if (entry.cachedPrice != null && isFresh(entry.fetchedAt)) {
          fresh.set(entry.symbol.toUpperCase(), entry.cachedPrice);
        }
      }

      const stale = wanted.filter((symbol) => !fresh.has(symbol));
      if (stale.length === 0) return { updated: 0, unknown: [] as string[] };

      // 2. Ask the server for only the stale ones.
      const res = await fetch(`/api/stocks?symbols=${encodeURIComponent(stale.join(','))}`);
      if (!res.ok) throw new Error(`Quote refresh failed (${res.status})`);

      const { quotes } = (await res.json()) as {
        quotes: Record<
          string,
          {
            price: number;
            currency?: string | null;
            marketState?: string | null;
            priceSourceName?: string | null;
          }
        >;
      };

      // 3. Write them back under the user's credentials, merge-only.
      const writes = Object.entries(quotes).map(([symbol, quote]) =>
        setDoc(
          doc(db, 'investment_prices', symbol),
          {
            symbol,
            cachedPrice: quote.price,
            fetchedAt: serverTimestamp(),
            source: PROVIDER_SOURCE,
            ...(quote.currency != null ? { currency: quote.currency } : {}),
            ...(quote.marketState != null ? { marketState: quote.marketState } : {}),
            ...(quote.priceSourceName != null ? { priceSourceName: quote.priceSourceName } : {}),
          },
          { merge: true },
        ),
      );

      // A cache write failing must not discard prices we already fetched.
      const settled = await Promise.allSettled(writes);
      const failed = settled.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed.length > 0) {
        console.error(
          `[quotes] ${failed.length}/${writes.length} cache writes failed:`,
          failed[0].reason,
        );
      }

      // Symbols Yahoo could not resolve are absent from `quotes` — surface them
      // so callers can distinguish a typo from a transient upstream gap.
      return { updated: writes.length, unknown: stale.filter((s) => !(s in quotes)) };
    },
    onSuccess: (result) => {
      if (result.updated > 0) {
        queryClient.invalidateQueries({ queryKey: investmentKeys.prices() });
      }
    },
  });
}

/** Mirrors QUOTE_TTL_MS on the server; here so the client can skip fresh symbols. */
const QUOTE_TTL_MS = 15 * 60 * 1000;

function isFresh(fetchedAt: Timestamp | undefined): boolean {
  if (fetchedAt == null) return false;
  return Date.now() - fetchedAt.toMillis() < QUOTE_TTL_MS;
}

export function useInvestmentThesesQuery(userId?: string) {
  return useQuery({
    queryKey: investmentKeys.theses(userId),
    queryFn: () => investmentService.getTheses(userId!),
    enabled: !!userId,
  });
}

export function useInvestmentSnapshotsQuery(userId?: string) {
  return useQuery({
    queryKey: investmentKeys.snapshots(userId),
    queryFn: () => investmentService.getSnapshots(userId!),
    enabled: !!userId,
  });
}

export function useFeePresetsQuery(userId?: string) {
  return useQuery({
    queryKey: investmentKeys.settings(userId),
    queryFn: () => getFeePresets(userId!),
    enabled: !!userId,
  });
}

export function useAddTransactionMutation(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tx: Omit<Transaction, 'id' | 'createdAt'>) => investmentService.addTransaction(tx),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentKeys.transactions(userId) });
      queryClient.invalidateQueries({ queryKey: investmentKeys.snapshots(userId) });
    },
  });
}

export function useUpdatePriceMutation(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ symbol, price, updatedBy }: { symbol: string; price: number; updatedBy?: string }) =>
      priceProvider.setPrice(symbol, price, updatedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentKeys.prices() });
      queryClient.invalidateQueries({ queryKey: investmentKeys.snapshots(userId) });
    },
  });
}

export function useAddThesisMutation(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (thesis: Omit<Thesis, 'id' | 'createdAt'>) => investmentService.addThesis(thesis),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentKeys.theses(userId) });
    },
  });
}

export function useDeleteThesisMutation(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (thesisId: string) => investmentService.deleteThesis(thesisId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentKeys.theses(userId) });
    },
  });
}

export function useSaveSnapshotMutation(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (snapshot: Omit<Snapshot, 'id' | 'createdAt'> & { id?: string }) =>
      investmentService.saveSnapshot(snapshot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentKeys.snapshots(userId) });
    },
  });
}

export function useAddFeePresetMutation(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preset: FeePreset) => {
      if (!userId) throw new Error('User required');
      return addFeePreset(userId, preset);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentKeys.settings(userId) });
    },
  });
}

export function useUpdateFeePresetMutation(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ oldName, newPreset }: { oldName: string; newPreset: FeePreset }) => {
      if (!userId) throw new Error('User required');
      return updateFeePreset(userId, oldName, newPreset);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentKeys.settings(userId) });
    },
  });
}

export function useDeleteFeePresetMutation(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => {
      if (!userId) throw new Error('User required');
      return deleteFeePreset(userId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentKeys.settings(userId) });
    },
  });
}
