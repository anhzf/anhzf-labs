import { createFileRoute } from '@tanstack/react-router';
import { initializeApp } from 'firebase-admin/app';
import type { Ruleset } from 'firebase-admin/security-rules';
import { getSecurityRules } from 'firebase-admin/security-rules';

initializeApp();

// private helper — the SDK only exposes the `(default)` release publicly.
// Swap for 2 raw fetches to firebaserules.googleapis.com/v1 (releases/{id} -> rulesetName -> rulesets/{id}) if it disappears.
const getRulesetForRelease = (release: string) =>
  (
    getSecurityRules() as unknown as {
      getRulesetForRelease: (r: string) => Promise<Ruleset>;
    }
  ).getRulesetForRelease(release);

export const Route = createFileRoute('/api/firebase/security-rules')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // omitted or "(default)" -> `cloud.firestore`; named db -> `cloud.firestore/{db}`
        const db = new URL(request.url).searchParams.get('db');
        return Response.json(
          await getRulesetForRelease(
            db && db !== '(default)' ? `cloud.firestore/${db}` : 'cloud.firestore',
          ),
        );
      },
    },
  },
});