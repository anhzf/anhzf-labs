/**
 * YahooPriceProvider
 *
 * A live market-data SOURCE backed by `yahoo-finance2`. It is deliberately
 * stateless: no Firestore, no caching, no auth.
 *
 * ## Why this does not persist anything
 *   The `investment` Firestore database's rules gate access on
 *   `request.auth.token.email == '...'`. The server route that calls this
 *   provider has no Firestore identity of its own, so every read and write it
 *   would attempt is rejected with `permission-denied`.
 *
 *   Rather than give the server a privileged identity, caching lives on the
 *   client, which is already authenticated. See `useRefreshQuotesMutation` in
 *   `#/queries/investment`: it reads fresh cache from Firestore, asks this
 *   provider only for the symbols still missing, then writes them back under the
 *   user's own credentials. That keeps `investment_prices` the single store and
 *   avoids handing the server blanket database access.
 *
 * ## SERVER-ONLY
 *   Two independent reasons:
 *   1. Yahoo sends no CORS headers, so the browser cannot call it directly.
 *   2. `yahoo-finance2` imports Node built-ins and is never bundled to the client.
 *   The client reaches this through `/api/stocks`.
 *
 * ## Yahoo caveats handled here
 *   - Batch `quote()` SILENTLY OMITS symbols it cannot resolve (no null, no throw),
 *     so unresolvable symbols come back as explicit `null`.
 *   - Returned keys are uppercased even when requested lowercase, so we normalise.
 *   - `regularMarketPrice` is delayed (Yahoo reports `quoteSourceName: "Delayed Quote"`).
 */
import type { PriceProvider } from '../interfaces';

import YahooFinance from 'yahoo-finance2';

/** How long a cached quote stays usable before it is refetched. */
export const QUOTE_TTL_MS = 15 * 60 * 1000;

export const PROVIDER_SOURCE = 'yahoo';

/**
 * One shared client. Constructing per-request would discard the in-memory cookie
 * jar and force a fresh crumb handshake on every call, which is both slower and
 * a bigger hit against Yahoo's undocumented per-IP rate limit.
 */
const yf = new YahooFinance({
  suppressNotices: ['yahooSurvey', 'ripHistorical'],
});

/**
 * Canonical symbol form. Trimming matters: symbols are used as Firestore doc ids,
 * so ' aapl ' and 'AAPL' must not become two documents.
 */
export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/** A quote as fetched, before the client turns it into a PriceEntry patch. */
export interface Quote {
  symbol: string;
  price: number;
  currency: string | null;
  marketState: string | null;
  /** Yahoo's own `quoteSourceName` — reports "Delayed Quote" for delayed feeds. */
  priceSourceName: string | null;
}

export interface DailyBar {
  date: string;
  close: number;
  adjclose: number | null;
  volume: number | null;
}

/**
 * Stateless Yahoo source.
 *
 * Implements `PriceProvider` (which is read-only by design) and adds `getQuotes`
 * for the richer per-symbol metadata the cache wants to store.
 */
export class YahooPriceProvider implements PriceProvider {
  /** Read-only single-symbol lookup. */
  async getPrice(symbol: string): Promise<number | null> {
    const prices = await this.getPrices([symbol]);
    return prices[normalizeSymbol(symbol)] ?? null;
  }

  /**
   * Batch lookup. Every requested symbol is present in the result; ones Yahoo
   * cannot resolve come back as `null`.
   */
  async getPrices(symbols: string[]): Promise<Record<string, number | null>> {
    const result: Record<string, number | null> = {};
    for (const symbol of this.normalizeAll(symbols)) result[symbol] = null;

    const quotes = await this.getQuotes(symbols);
    for (const [symbol, quote] of Object.entries(quotes)) result[symbol] = quote.price;
    return result;
  }

  /**
   * Batch lookup returning full quote metadata, keyed by normalised symbol.
   *
   * Symbols Yahoo cannot resolve are simply absent from the result — that is
   * deliberate, so callers can distinguish "no data" from "data says zero".
   *
   * Throws if Yahoo itself is unreachable, so callers can tell an outage apart
   * from an unknown ticker.
   */
  async getQuotes(symbols: string[]): Promise<Record<string, Quote>> {
    const normalized = this.normalizeAll(symbols);
    if (normalized.length === 0) return {};

    const quotes = await yf.quote(normalized, { return: 'object' });

    const result: Record<string, Quote> = {};
    for (const symbol of normalized) {
      // Keys come back uppercased; we asked with uppercase, but stay defensive.
      const raw = quotes[symbol] ?? quotes[symbol.toUpperCase()];
      const price = raw?.regularMarketPrice;
      if (typeof price !== 'number' || !Number.isFinite(price)) continue;

      result[symbol] = {
        symbol,
        price,
        currency: raw?.currency ?? null,
        marketState: raw?.marketState ?? null,
        priceSourceName: raw?.quoteSourceName ?? null,
      };
    }
    return result;
  }

  /**
   * Daily closes for a symbol, used for the ledger's close-of-day snapshots.
   *
   * Returns trading dates derived in the EXCHANGE's timezone, not UTC. Slicing a
   * UTC timestamp would file US-evening or Jakarta-morning data under the wrong
   * calendar day and quietly corrupt the timeline.
   */
  async getDailyCloses(symbol: string, days = 30): Promise<{
    symbol: string;
    currency: string | null;
    timeZone: string;
    bars: DailyBar[];
  }> {
    const period1 = new Date(Date.now() - days * 864e5);
    const chart = await yf.chart(normalizeSymbol(symbol), { period1, interval: '1d' });
    const timeZone = chart.meta.exchangeTimezoneName ?? 'UTC';

    return {
      symbol: chart.meta.symbol,
      currency: chart.meta.currency ?? null,
      timeZone,
      // Bars with a null close occur on halted/no-trade days; dropping them keeps
      // the series dense rather than emitting holes downstream charting must handle.
      bars: chart.quotes
        .filter((q) => q.close != null)
        .map((q) => ({
          date: toTradingDate(q.date, timeZone),
          close: q.close as number,
          adjclose: q.adjclose ?? null,
          volume: q.volume ?? null,
        })),
    };
  }

  private normalizeAll(symbols: string[]): string[] {
    return [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];
  }
}

/** Format an instant as YYYY-MM-DD in the given IANA timezone. */
function toTradingDate(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
