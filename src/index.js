import { ProductTour } from "./ProductTour.js";
import { ProductTourManager } from "./ProductTourManager.js";
import { defineTourConfig, defineTourManifest, loadTourConfig, loadTourManifest } from "./config.js";

/**
 * Load, create, and optionally auto-start a product tour.
 * @param {object|string|URL} source JSON-like config object or fetchable URL.
 * @param {object} options Runtime adapters and an optional autoStart override.
 */
export async function initProductTour(source = "/product-tour.json", options = {}) {
  const config = await loadTourConfig(source, {
    fetch: options.fetch,
    signal: options.signal
  });
  const tour = new ProductTour(config, options);
  const shouldAutoStart = options.autoStart ?? config.autoStart;
  if (shouldAutoStart) await tour.start();
  return tour;
}

/** Load a multi-page manifest, watch routes, and start the matching page tour. */
export async function initProductTours(source = "/product-tour.json", options = {}) {
  const manifest = await loadTourManifest(source, {
    fetch: options.fetch,
    signal: options.signal,
    baseUrl: options.baseUrl
  });
  const manager = new ProductTourManager(manifest, options);
  const shouldAutoStart = options.autoStart ?? manifest.autoStart;
  if (shouldAutoStart) await manager.start({ watchRoutes: options.watchRoutes });
  return manager;
}

export {
  ProductTour,
  ProductTourManager,
  defineTourConfig,
  defineTourManifest,
  loadTourConfig,
  loadTourManifest
};
export default initProductTour;
