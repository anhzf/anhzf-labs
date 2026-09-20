import { Button } from '#/components/ui/button';
import { useAuth } from '#/hooks/useAuth';
import { computeFIFO, computePortfolioSummary, computePositions } from '#/modules/investment/utils';
import {
  useHeldSymbols,
  useInvestmentTransactionsQuery,
  useLivePrices,
} from '#/queries/investment';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';

function InvestmentDashboardPage() {
  const { user } = useAuth();

  const { data: transactions = [], isLoading: txLoading } = useInvestmentTransactionsQuery(user?.uid);

  // Display prices: cached live quote preferred, manual price as fallback. The
  // hook also refreshes anything stale via /api/stocks.
  const heldSymbols = useHeldSymbols(transactions);
  const { priceMap, entries: prices } = useLivePrices(heldSymbols);

  // How many holdings are showing a live quote vs. a hand-entered price.
  const liveCount = useMemo(
    () => prices.filter((p) => p.cachedPrice != null).length,
    [prices],
  );

  const summary = useMemo(() => {
    if (transactions.length === 0) return null;
    const fifoResult = computeFIFO(transactions);
    const positions = computePositions(fifoResult.lots, priceMap);
    return computePortfolioSummary(positions, fifoResult.realizedPLBySymbol);
  }, [transactions, priceMap]);

  if (!user) {
    return <div className="p-6">Please log in to view your portfolio.</div>;
  }

  if (txLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Investment Dashboard</h1>
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No transactions yet. Start tracking your investments today.</p>
          <Link to="/investment/transactions">
            <Button>Add Your First Transaction</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Investment Dashboard</h1>
        <Link to="/investment/transactions">
          <Button variant="outline">View Transactions</Button>
        </Link>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {liveCount > 0
          ? `${liveCount} of ${heldSymbols.length} holdings priced from live market data (delayed); the rest use manually entered prices.`
          : 'All holdings use manually entered prices. Live quotes could not be loaded.'}
      </p>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="border rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Invested</h3>
            <p className="text-2xl font-bold">${summary.totalInvested.toFixed(2)}</p>
          </div>

          <div className="border rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Current Value</h3>
            <p className="text-2xl font-bold">${summary.totalValue.toFixed(2)}</p>
          </div>

          <div className="border rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Realized P/L</h3>
            <p className={`text-2xl font-bold ${summary.realizedPL > 0
              ? 'text-green-600'
              : summary.realizedPL < 0
                ? 'text-red-600'
                : ''
              }`}>
              {summary.realizedPL > 0 ? '+' : ''}${summary.realizedPL.toFixed(2)}
            </p>
          </div>

          <div className="border rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Unrealized P/L</h3>
            <p className={`text-2xl font-bold ${summary.unrealizedPL > 0
              ? 'text-green-600'
              : summary.unrealizedPL < 0
                ? 'text-red-600'
                : ''
              }`}>
              {summary.unrealizedPL > 0 ? '+' : ''}${summary.unrealizedPL.toFixed(2)}
            </p>
          </div>

          <div className="border rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Net Return</h3>
            <p className={`text-2xl font-bold ${summary.netReturnPct > 0
              ? 'text-green-600'
              : summary.netReturnPct < 0
                ? 'text-red-600'
                : ''
              }`}>
              {summary.netReturnPct > 0 ? '+' : ''}{summary.netReturnPct.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      <div className="text-sm text-gray-600">
        <p>View detailed positions and update prices on the <Link to="/investment/transactions" className="text-blue-600 hover:underline">Transactions page</Link>.</p>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/investment/')({ component: InvestmentDashboardPage });
