import type { Timestamp } from 'firebase/firestore';
import type {
    FIFOResult,
    OpenLot,
    PortfolioSummary,
    Position,
    RealizedEvent,
    Thesis,
    Transaction,
} from './interfaces';

/**
 * Chronological sort, tiebroken by createdAt.
 *
 * Deliberately client-side: Firestore's orderBy() silently drops documents that
 * lack the ordered field, and `where(userId) + orderBy(date)` needs a composite
 * index. We fetch all of a user's transactions anyway, so sorting here is free.
 */
export function sortTransactions(
  transactions: Transaction[],
  dir: 'asc' | 'desc' = 'asc',
): Transaction[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...transactions].sort(
    (a, b) =>
      sign *
      (a.date.toMillis() - b.date.toMillis() ||
        a.createdAt.toMillis() - b.createdAt.toMillis()),
  )
}

/**
 * Computes FIFO cost basis from transaction history.
 * Returns open lots, realized P/L by symbol, and realized events.
 * 
 * NOTE: Transaction fees are recorded but not factored into cost basis for MVP.
 * To include fees in cost basis: costBasis = price + (fee / qty)
 */
export function computeFIFO(transactions: Transaction[]): FIFOResult {
  const sorted = sortTransactions(transactions, 'asc')

  // Maintain FIFO queues of open lots per symbol
  const lotQueues: Record<string, OpenLot[]> = {}
  const realizedEvents: RealizedEvent[] = []
  const realizedPLBySymbol: Record<string, number> = {}

  for (const tx of sorted) {
    const { symbol, type, qty, price, id, date } = tx

    if (!lotQueues[symbol]) {
      lotQueues[symbol] = []
    }

    if (type === 'BUY') {
      // Create new lot
      lotQueues[symbol].push({
        txId: id,
        symbol,
        qty,
        costBasis: price,
        date,
      })
    } else if (type === 'SELL') {
      // Consume lots from oldest first (FIFO)
      let remainingQty = qty
      const queue = lotQueues[symbol]

      // Check if we have enough qty available
      const availableQty = queue.reduce((sum, lot) => sum + lot.qty, 0)
      if (remainingQty > availableQty) {
        throw new Error(
          `SELL of ${remainingQty} ${symbol} exceeds available qty of ${availableQty}`
        )
      }

      while (remainingQty > 0 && queue.length > 0) {
        const lot = queue[0]
        const qtyToConsume = Math.min(remainingQty, lot.qty)

        // Generate realized event
        const proceeds = qtyToConsume * price
        const costBasis = qtyToConsume * lot.costBasis
        const pl = proceeds - costBasis

        realizedEvents.push({
          sellTxId: id,
          symbol,
          qty: qtyToConsume,
          proceeds,
          costBasis,
          pl,
          date,
        })

        // Update realized P/L by symbol
        realizedPLBySymbol[symbol] = (realizedPLBySymbol[symbol] || 0) + pl

        // Update or remove lot
        if (qtyToConsume === lot.qty) {
          queue.shift() // Fully consumed
        } else {
          lot.qty -= qtyToConsume // Partially consumed
        }

        remainingQty -= qtyToConsume
      }
    }
  }

  // Flatten all remaining lots
  const lots = Object.values(lotQueues).flat()

  return {
    lots,
    realizedPLBySymbol,
    realizedEvents,
  }
}

/**
 * Computes current positions from open lots and current prices.
 */
export function computePositions(
  lots: OpenLot[],
  prices: Record<string, number>
): Position[] {
  if (lots.length === 0) return []

  // Group lots by symbol
  const lotsBySymbol: Record<string, OpenLot[]> = {}
  for (const lot of lots) {
    if (!lotsBySymbol[lot.symbol]) {
      lotsBySymbol[lot.symbol] = []
    }
    lotsBySymbol[lot.symbol].push(lot)
  }

  // Compute position for each symbol
  const positions: Position[] = []
  for (const [symbol, symbolLots] of Object.entries(lotsBySymbol)) {
    const totalQty = symbolLots.reduce((sum, lot) => sum + lot.qty, 0)
    const totalCost = symbolLots.reduce(
      (sum, lot) => sum + lot.qty * lot.costBasis,
      0
    )
    const avgCostBasis = totalCost / totalQty
    const currentPrice = prices[symbol] ?? 0
    const marketValue = totalQty * currentPrice
    const unrealizedPL = marketValue - totalCost
    const unrealizedPLPct =
      totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0

    positions.push({
      symbol,
      totalQty,
      avgCostBasis,
      currentPrice,
      marketValue,
      unrealizedPL,
      unrealizedPLPct,
    })
  }

  return positions
}

/**
 * Computes portfolio summary from positions and realized P/L.
 */
export function computePortfolioSummary(
  positions: Position[],
  realizedPLBySymbol: Record<string, number>
): PortfolioSummary {
  const totalInvested = positions.reduce(
    (sum, pos) => sum + pos.totalQty * pos.avgCostBasis,
    0
  )
  const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0)
  const realizedPL = Object.values(realizedPLBySymbol).reduce(
    (sum, pl) => sum + pl,
    0
  )
  const unrealizedPL = positions.reduce(
    (sum, pos) => sum + pos.unrealizedPL,
    0
  )
  const netReturnPct =
    totalInvested > 0 ? ((realizedPL + unrealizedPL) / totalInvested) * 100 : 0

  return {
    totalInvested,
    totalValue,
    realizedPL,
    unrealizedPL,
    netReturnPct,
  }
}

/**
 * Converts a Firestore Timestamp or Date to YYYY-MM-DD format.
 */
export function toDateString(date: Timestamp | Date): string {
  const d = date instanceof Date ? date : date.toDate()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Filters theses to only those with open positions.
 * A thesis is "active" if its symbol has qty > 0 in the positions list.
 */
export function filterActiveTheses(
  theses: Thesis[],
  positions: Position[]
): Thesis[] {
  const openSymbols = new Set(
    positions.filter((p) => p.totalQty > 0).map((p) => p.symbol)
  )
  return theses.filter((thesis) => openSymbols.has(thesis.symbol))
}
