import type { Timestamp } from 'firebase/firestore';

// Transaction types
export type TransactionType = 'BUY' | 'SELL'

export interface Transaction {
  id: string
  userId: string
  symbol: string
  type: TransactionType
  qty: number
  price: number
  fee: number
  date: Timestamp
  notes: string
  createdAt: Timestamp
}

// Thesis types
export interface Thesis {
  id: string
  userId: string
  symbol: string
  tags: string[]
  notes: string
  linkedTransactionId: string | null
  createdAt: Timestamp
}

// Price entry types
//
// One document per symbol, holding two independent kinds of data:
//
//  - MANUAL (authoritative): `currentPrice` / `updatedAt` / `updatedBy`. Written
//    only by FirestorePriceProvider.setPrice. The ledger and snapshots read this.
//  - CACHED (advisory): `cachedPrice` + friends. Written only by
//    YahooPriceProvider. Never feeds the ledger directly — see INV-003.
//
// They share a document so a symbol has exactly one record, but the write paths
// are deliberately disjoint so neither can clobber the other.
export interface PriceEntry {
  symbol: string
  /**
   * Hand-entered price. Authoritative for ledger/snapshots.
   *
   * Optional because a document may exist with only cached fields — the Yahoo
   * provider creates docs for symbols the user never priced manually. Callers
   * must treat absence as "unknown", never as 0, or P/L becomes NaN.
   */
  currentPrice?: number
  updatedAt?: Timestamp
  updatedBy?: string
  /** Last quote fetched from the market data provider. Display only. */
  cachedPrice?: number
  /** When `cachedPrice` was fetched. Drives the cache TTL. */
  fetchedAt?: Timestamp
  /** Currency of `cachedPrice`, e.g. "USD", "IDR". Never assume USD. */
  currency?: string
  /** Provider-supplied market state at fetch time: REGULAR, CLOSED, PRE, POST… */
  marketState?: string
  /** Provenance, e.g. "yahoo". Lets us evict/refresh by source later. */
  source?: string
  /** `quoteSourceName` verbatim — Yahoo reports "Delayed Quote" here. */
  priceSourceName?: string
}

// Snapshot types
export interface Snapshot {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  totalInvested: number
  totalValue: number
  realizedPL: number
  unrealizedPL: number
  cash: number
  createdAt: Timestamp
}

// FIFO engine types
export interface OpenLot {
  txId: string
  symbol: string
  qty: number
  costBasis: number
  date: Timestamp
}

export interface RealizedEvent {
  sellTxId: string
  symbol: string
  qty: number
  proceeds: number
  costBasis: number
  pl: number
  date: Timestamp
}

export interface FIFOResult {
  lots: OpenLot[]
  realizedPLBySymbol: Record<string, number>
  realizedEvents: RealizedEvent[]
}

// Position and portfolio types
export interface Position {
  symbol: string
  totalQty: number
  avgCostBasis: number
  currentPrice: number | null
  marketValue: number
  unrealizedPL: number
  unrealizedPLPct: number
}

export interface PortfolioSummary {
  totalInvested: number
  totalValue: number
  realizedPL: number
  unrealizedPL: number
  netReturnPct: number
}

// Price provider interface
export interface PriceProvider {
  getPrice: (symbol: string) => Promise<number | null>
  getPrices: (symbols: string[]) => Promise<Record<string, number | null>>
}

// Analytics types
export interface ThesisAnalytics {
  tag: string
  tradesCount: number
  wins: number
  winRate: number
  avgReturnPct: number
}

export interface Attribution {
  symbol: string
  realizedPL: number
  unrealizedPL: number
  totalPL: number
  contributionPct: number
}
