import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const esm = await import("product-tour-js");
assert.equal(typeof esm.initProductTour, "function", "ESM bundle must expose initProductTour");
assert.equal(typeof esm.initProductTours, "function", "ESM bundle must expose initProductTours");
assert.equal(typeof esm.ProductTour, "function", "ESM bundle must expose ProductTour");
assert.equal(typeof esm.ProductTourManager, "function", "ESM bundle must expose ProductTourManager");
assert.equal(typeof esm.ProductTourService, "function", "ESM bundle must expose ProductTourService");
assert.equal(typeof esm.createProductTourService, "function", "ESM bundle must expose createProductTourService");

const commonJs = require("product-tour-js");
assert.equal(typeof commonJs.initProductTour, "function", "CommonJS bundle must expose initProductTour");
assert.equal(typeof commonJs.initProductTours, "function", "CommonJS bundle must expose initProductTours");
assert.equal(typeof commonJs.ProductTour, "function", "CommonJS bundle must expose ProductTour");
assert.equal(typeof commonJs.ProductTourManager, "function", "CommonJS bundle must expose ProductTourManager");
assert.equal(typeof commonJs.ProductTourService, "function", "CommonJS bundle must expose ProductTourService");
assert.equal(typeof commonJs.createProductTourService, "function", "CommonJS bundle must expose createProductTourService");

const browserCode = await readFile(resolve(projectRoot, "dist/product-tour.min.js"), "utf8");
const browserContext = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  URL
});
vm.runInContext(browserCode, browserContext, { filename: "product-tour.min.js" });
assert.equal(
  typeof browserContext.ProductTourJS?.initProductTour,
  "function",
  "IIFE bundle must expose ProductTourJS.initProductTour"
);
assert.equal(
  typeof browserContext.ProductTourJS?.initProductTours,
  "function",
  "IIFE bundle must expose ProductTourJS.initProductTours"
);
assert.equal(
  typeof browserContext.ProductTourJS?.ProductTourManager,
  "function",
  "IIFE bundle must expose ProductTourJS.ProductTourManager"
);
assert.equal(
  typeof browserContext.ProductTourJS?.ProductTourService,
  "function",
  "IIFE bundle must expose ProductTourJS.ProductTourService"
);
assert.equal(
  typeof browserContext.ProductTourJS?.createProductTourService,
  "function",
  "IIFE bundle must expose ProductTourJS.createProductTourService"
);

console.log("Verified ESM, CommonJS, and browser bundles.");
