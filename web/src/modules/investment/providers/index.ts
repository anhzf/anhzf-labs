/**
 * Price provider entrypoint.
 *
 * All price reads in the app funnel through `PRICE_PROVIDER`. Swapping market
 * data sources is a one-line change here; nothing in the ledger, analytics, or
 * UI needs to know which implementation is active.
 *
 * ## Adding a provider
 *   1. Implement the `PriceProvider` interface from `../interfaces` in a new
 *      file in this directory.
 *   2. Re-export it below.
 *   3. Point `PRICE_PROVIDER` at it.
 *
 * ## Current implementations
 *   - `FirestorePriceProvider` (./firestore) — manual entry, browser-safe, and
 *     authoritative for the ledger. Reads/writes `investment_prices/{symbol}.currentPrice`.
 *   - `YahooPriceProvider` (./yahoo.server) — live quotes via yahoo-finance2,
 *     SERVER-ONLY and stateless. Reachable only through `/api/stocks`; the client
 *     caches what it returns (see `useLivePrices` in `#/queries/investment`).
 *
 * ## Why Yahoo is NOT re-exported here
 *   This module is imported by client code (via `../service`), so re-exporting
 *   the Yahoo provider would drag `yahoo-finance2` into the browser bundle and
 *   trip over its Node polyfills. Server code imports it directly:
 *
 *     import { YahooPriceProvider } from '#/modules/investment/providers/yahoo.server'
 *
 * ## Swapping to another vendor
 *   Implement a provider against `PriceProvider`, then:
 *     export const PRICE_PROVIDER = new YourProvider(...)
 *   No environment-variable toggle is needed; a code change is the intent here
 *   (see INV-006 technical notes).
 */
import { db } from '#/lib/firebase';
import { FirestorePriceProvider } from './firestore';

export { FirestorePriceProvider } from './firestore';

/** Manual-entry provider. Safe in browser and server contexts. */
export const PRICE_PROVIDER = new FirestorePriceProvider(db);
