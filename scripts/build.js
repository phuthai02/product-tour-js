import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = resolve(projectRoot, "dist");
const entryPoint = resolve(projectRoot, "src/index.js");
const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8"));
const banner = `/* ${packageJson.name} v${packageJson.version} | ${packageJson.license} */`;

await rm(distDirectory, { recursive: true, force: true });
await mkdir(distDirectory, { recursive: true });

const shared = {
  entryPoints: [entryPoint],
  bundle: true,
  platform: "browser",
  target: ["es2021"],
  legalComments: "none",
  banner: { js: banner }
};

await Promise.all([
  build({
    ...shared,
    format: "esm",
    outfile: resolve(distDirectory, "index.js"),
    sourcemap: true
  }),
  build({
    ...shared,
    format: "cjs",
    outfile: resolve(distDirectory, "index.cjs"),
    sourcemap: true
  }),
  build({
    ...shared,
    format: "iife",
    globalName: "ProductTourJS",
    outfile: resolve(distDirectory, "product-tour.min.js"),
    minify: true,
    sourcemap: true
  })
]);

await copyFile(resolve(projectRoot, "src/index.d.ts"), resolve(distDirectory, "index.d.ts"));

console.log(`Built ${packageJson.name} v${packageJson.version} in dist/`);
