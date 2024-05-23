import { context } from 'esbuild';
import compileOptions from './fns-build-options.mjs';

const ctx = await context(compileOptions);

await ctx.watch();
console.log('Watching for changes...');
