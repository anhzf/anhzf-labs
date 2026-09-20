/**
 * GET /api/stocks
 *
 * Server-side gateway to Yahoo Finance. Stateless by design — it fetches and
 * returns; it does not touch Firestore.
 *
 * ## Why this route does not cache
 *   The app's Firestore database is a NAMED database (`investment`), and its
 *   security rules authorize by signed-in email. This route has no Firestore
 *   identity, so any read or write it attempted was rejected with
 *   `permission-denied`. Rather than hand the server a privileged credential, the
 *   *client* owns the cache — it is already authenticated. See
 *   `useLivePrices` in `#/queries/investment`.
 *
 * ## Why a route at all
 *   1. Yahoo sends no CORS headers, so the browser cannot call it directly.
 *   2. `yahoo-finance2` imports Node built-ins and cannot be client-bundled.
 *
 * Query params:
 *   symbols  comma-separated tickers (required, max 50)
 *
 * Responses:
 *   200 { quotes: { AAPL: { price, currency, marketState, priceSourceName } } }
 *       Symbols Yahoo could not resolve are ABSENT from `quotes` — not null and
 *       not zero. Callers must treat absence as "unknown", or P&L becomes NaN.
 *   400 { error }  missing/oversized symbol list
 *   502 { error }  Yahoo unreachable — distinct from an unknown ticker, so the
 *                  client can keep serving its existing cache.
 */
import { createFileRoute } from '@tanstack/react-router';

/** Yahoo's own practical ceiling for one quote() call. */
const MAX_SYMBOLS = 50;

export const Route = createFileRoute('/api/stocks/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = url.searchParams.get('symbols');

        const symbols = [
          ...new Set(
            (raw ?? '')
              .split(',')
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean),
          ),
        ];

        if (symbols.length === 0) {
          return Response.json({ error: 'No valid symbols provided' }, { status: 400 });
        }
        // Guard against being used as an open, unbounded proxy.
        if (symbols.length > MAX_SYMBOLS) {
          return Response.json(
            { error: `Too many symbols (max ${MAX_SYMBOLS})`, requested: symbols.length },
            { status: 400 },
          );
        }

        // Imported lazily so yahoo-finance2 (and its Node polyfills) load only
        // when this route is actually invoked, not at module init.
        const { YahooPriceProvider } = await import('#/modules/investment/providers/yahoo.server');

        try {
          const quotes = await new YahooPriceProvider().getQuotes(symbols);
          return Response.json({ quotes, fetchedAt: new Date().toISOString() });
        } catch (error) {
          console.error('[api/stocks] Yahoo fetch failed:', error);
          return Response.json(
            { error: error instanceof Error ? error.message : 'Upstream fetch failed' },
            { status: 502 },
          );
        }
      },
    },
  },
});
