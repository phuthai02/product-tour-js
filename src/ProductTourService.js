import { loadTourManifest } from "./config.js";
import { ProductTourManager } from "./ProductTourManager.js";

function addCacheBust(source) {
  if (typeof source !== "string" && !(source instanceof URL)) return source;
  const value = String(source);
  const [url, hash = ""] = value.split("#", 2);
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}${hash ? `#${hash}` : ""}`;
}

async function localizeValue(value, translate, prefix) {
  if (typeof value === "string" && value.startsWith(prefix)) {
    return translate(value.slice(prefix.length));
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => localizeValue(item, translate, prefix)));
  }
  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, item]) => [key, await localizeValue(item, translate, prefix)])
    );
    return Object.fromEntries(entries);
  }
  return value;
}

function unsubscribe(subscription) {
  if (typeof subscription === "function") subscription();
  else subscription?.unsubscribe?.();
}

/**
 * Framework-neutral lifecycle wrapper for loading, translating, reloading,
 * and starting page tours.
 */
export class ProductTourService {
  constructor(options = {}) {
    this.options = {
      source: "/product-tour.json",
      autoStart: true,
      cacheBust: true,
      translationPrefix: "i18n:",
      reloadOnLanguageChange: true,
      ...options
    };
    this.managerPromise = null;
    this.languageSubscription = null;
    this.languageSubscribed = false;
  }

  initialize() {
    if (this.options.reloadOnLanguageChange && !this.languageSubscribed && this.options.onLanguageChange) {
      this.languageSubscribed = true;
      this.languageSubscription = this.options.onLanguageChange(() => {
        void this.reload({ autoStart: false }).catch((error) => this.options.onError?.(error));
      });
    }
    return this.getManager();
  }

  getManager() {
    this.managerPromise ??= this._createManager(this.options.source, this.options.autoStart).catch((error) => {
      this.managerPromise = null;
      throw error;
    });
    return this.managerPromise;
  }

  async startPage(pageId, options = {}) {
    const shouldReload = options.reload ?? true;
    const manager = shouldReload
      ? await this.reload({ autoStart: false })
      : await this.getManager();
    return manager.startPage(pageId, { force: options.force ?? true });
  }

  async reload(options = {}) {
    const currentManager = await this.managerPromise?.catch(() => null);
    currentManager?.destroy();

    const source = (options.cacheBust ?? this.options.cacheBust)
      ? addCacheBust(this.options.source)
      : this.options.source;
    this.managerPromise = this._createManager(source, options.autoStart ?? false).catch((error) => {
      this.managerPromise = null;
      throw error;
    });
    return this.managerPromise;
  }

  destroy() {
    unsubscribe(this.languageSubscription);
    this.languageSubscription = null;
    this.languageSubscribed = false;
    const managerPromise = this.managerPromise;
    this.managerPromise = null;
    void managerPromise?.then((manager) => manager.destroy()).catch(() => {});
  }

  async _createManager(source, autoStart) {
    const runtime = this.options.runtime ?? {};
    const manifest = await loadTourManifest(source, {
      fetch: runtime.fetch,
      signal: runtime.signal,
      baseUrl: runtime.baseUrl
    });
    const localizedManifest = this.options.translate
      ? await localizeValue(manifest, this.options.translate, this.options.translationPrefix)
      : manifest;
    const manager = new ProductTourManager(localizedManifest, runtime);
    if (autoStart) await manager.start({ watchRoutes: runtime.watchRoutes });
    return manager;
  }
}

export function createProductTourService(options) {
  return new ProductTourService(options);
}
