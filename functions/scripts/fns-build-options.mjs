/**
 * @type {import('esbuild').BuildOptions}
 */
export default {
  entryPoints: ['./src/functions.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: './dist/functions.js',
  external: ['firebase-admin', 'firebase-functions', 'valibot', 'puppeteer'],
};
