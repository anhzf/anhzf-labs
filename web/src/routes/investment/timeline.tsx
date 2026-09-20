import { LineChart } from '#/components/investment/LineChart';
import { Skeleton } from '#/components/ui/skeleton';
import { useAuth } from '#/hooks/useAuth';
import {
  computeFIFO,
  computePortfolioSummary,
  computePositions,
  toDateString,
} from '#/modules/investment/utils';
import {
  useInvestmentPricesQuery,
  useInvestmentSnapshotsQuery,
  useInvestmentTransactionsQuery,
  useSaveSnapshotMutation,
} from '#/queries/investment';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useRef } from 'react';

function InvestmentTimelinePage() {
  const { user } = useAuth();
  const saveSnapshotMutation = useSaveSnapshotMutation(user?.uid);
  const { mutate: saveSnapshot } = saveSnapshotMutation;
  const lastSavedRef = useRef<string>('');

  const { data: transactions = [], isLoading: txLoading } = useInvestmentTransactionsQuery(user?.uid);
  const { data: prices = [] } = useInvestmentPricesQuery();
  const { data: snapshots = [], isLoading: snapshotsLoading } = useInvestmentSnapshotsQuery(user?.uid);

  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    prices.forEach((p) => {
      // Ledger path: manual prices ONLY. Cached quotes are advisory and would
      // make historical snapshots drift with intraday noise (see PriceEntry).
      // A doc with no manual price is skipped rather than defaulted to 0.
      if (p.currentPrice != null) map[p.symbol] = p.currentPrice;
    });
    return map;
  }, [prices]);

  // Upsert snapshot on mount / data change
  useEffect(() => {
    if (!user || txLoading || transactions.length === 0) return;

    const fifoResult = computeFIFO(transactions);
    const positions = computePositions(fifoResult.lots, priceMap);
    const summary = computePortfolioSummary(positions, fifoResult.realizedPLBySymbol);
    const today = toDateString(new Date());

    const snapshotFingerprint = `${today}_${summary.totalInvested}_${summary.totalValue}_${summary.realizedPL}_${summary.unrealizedPL}`;
    if (lastSavedRef.current === snapshotFingerprint) return;

    lastSavedRef.current = snapshotFingerprint;
    saveSnapshot({
      userId: user.uid,
      date: today,
      totalInvested: summary.totalInvested,
      totalValue: summary.totalValue,
      realizedPL: summary.realizedPL,
      unrealizedPL: summary.unrealizedPL,
      cash: 0,
    });
  }, [user, transactions, priceMap, txLoading, saveSnapshot]);

  const chartData = useMemo(() => {
    return snapshots.map((s) => ({
      date: s.date,
      value: s.totalValue,
    }));
  }, [snapshots]);

  const portfolioGrowth = useMemo(() => {
    if (snapshots.length < 2) return null;
    const first = snapshots[0].totalValue;
    const latest = snapshots[snapshots.length - 1].totalValue;
    return ((latest - first) / first) * 100;
  }, [snapshots]);

  if (!user) {
    return <div className="p-6">Please log in to view your portfolio timeline.</div>;
  }

  if (txLoading || snapshotsLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-9 w-64 mb-6" />
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-[448px] w-full rounded-lg" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Portfolio Timeline</h1>
        <div className="text-center py-12 text-gray-500">
          No transactions yet. Add transactions to start tracking your portfolio over time.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Portfolio Timeline</h1>

      {saveSnapshotMutation.isPending && (
        <div className="mb-4 text-sm text-gray-600">Updating today's snapshot...</div>
      )}

      {portfolioGrowth !== null && (
        <div className="mb-6">
          <div className="text-sm text-gray-600 mb-1">Portfolio Growth</div>
          <div
            className={`text-2xl font-bold ${portfolioGrowth > 0
              ? 'text-green-600'
              : portfolioGrowth < 0
                ? 'text-red-600'
                : ''
              }`}
          >
            {portfolioGrowth > 0 ? '+' : ''}
            {portfolioGrowth.toFixed(2)}%
          </div>
        </div>
      )}

      {chartData.length < 2 ? (
        <div className="border rounded-lg p-12 text-center text-gray-500">
          Visit this page on different days to build your equity curve.
        </div>
      ) : (
        <div className="border rounded-lg p-6">
          <LineChart data={chartData} width={800} height={400} color="#10b981" />
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/investment/timeline')({
  component: InvestmentTimelinePage,
});
