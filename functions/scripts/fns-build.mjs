import { build } from "esbuild";
import compileOptions from "./fns-build-options.mjs";

await build({
  ...compileOptions,
  minify: true,
});