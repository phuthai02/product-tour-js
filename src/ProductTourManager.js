import { defineTourManifest } from "./config.js";
import { ProductTour } from "./ProductTour.js";

const navigationSymbol = Symbol.for("product-tour-js.navigation-subscriber");

function escapeRegex(character) {
  return /[\\^$.*+?()[\]{}|]/.test(character) ? `\\${character}` : character;
}

function globToRegex(pattern) {
  let source = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*") {
      source += ".*";
      continue;
    }
    if (character === ":") {
      while (index + 1 < pattern.length && /[A-Za-z0-9_]/.test(pattern[index + 1])) index += 1;
      source += "[^/]+";
      continue;
    }
    source += escapeRegex(character);
  }
  return new RegExp(`${source}$`);
}

function pageMatches(page, location) {
  const { match } = page;
  const pathnameMatches = match.mode === "prefix"
    ? location.pathname.startsWith(match.path)
    : match.mode === "glob"
      ? globToRegex(match.path).test(location.pathname)
      : location.pathname === match.path;
  if (!pathnameMatches) return false;
  if (match.hash !== null && location.hash !== match.hash) return false;
  for (const [key, value] of Object.entries(match.query)) {
    if (location.searchParams.get(key) !== value) return false;
  }
  return true;
}

function toUrl(location, base) {
  if (location instanceof URL) return location;
  if (typeof location === "string") return new URL(location, base);
  return new URL(location.href);
}

function subscribeToNavigation(window, callback) {
  let state = window[navigationSymbol];
  if (!state) {
    const listeners = new Set();
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    let queued = false;
    const notify = () => {
      if (queued) return;
      queued = true;
      const schedule = window.queueMicrotask ?? ((task) => window.setTimeout(task, 0));
      schedule(() => {
        queued = false;
        for (const listener of listeners) listener();
      });
    };
    const pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      notify();
      return result;
    };
    const replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      notify();
      return result;
    };
    window.history.pushState = pushState;
    window.history.replaceState = replaceState;
    window.addEventListener("popstate", notify);
    window.addEventListener("hashchange", notify);
    state = { listeners, notify, originalPushState, originalReplaceState, pushState, replaceState };
    Object.defineProperty(window, navigationSymbol, { configurable: true, value: state });
  }

  state.listeners.add(callback);
  return () => {
    state.listeners.delete(callback);
    if (state.listeners.size > 0) return;
    window.removeEventListener("popstate", state.notify);
    window.removeEventListener("hashchange", state.notify);
    if (window.history.pushState === state.pushState) window.history.pushState = state.originalPushState;
    if (window.history.replaceState === state.replaceState) window.history.replaceState = state.originalReplaceState;
    delete window[navigationSymbol];
  };
}

export class ProductTourManager {
  constructor(manifest, runtime = {}) {
    const isNormalizedManifest = Array.isArray(manifest?.pages)
      && manifest.pages.length > 0
      && manifest.pages.every((page) => page.config);
    this.manifest = isNormalizedManifest ? manifest : defineTourManifest(manifest);
    this.runtime = runtime;
    this.window = runtime.window ?? globalThis.window;
    this.document = runtime.document ?? globalThis.document;
    this.tours = new Map();
    this.activePageId = null;
    this.state = "ready";
    this.unsubscribeNavigation = null;
    this.refreshId = 0;
    this._onNavigation = this._onNavigation.bind(this);
  }

  get activeTour() {
    return this.activePageId ? this.tours.get(this.activePageId) ?? null : null;
  }

  findPage(location = this.window?.location) {
    if (!location) return null;
    const url = toUrl(location, this.window?.location?.href ?? "http://localhost/");
    return this.manifest.pages.find((page) => page.enabled && pageMatches(page, url)) ?? null;
  }

  getTour(pageId) {
    const page = this.manifest.pages.find((candidate) => candidate.id === pageId);
    if (!page) throw new RangeError(`[product-tour-js] Unknown page: ${pageId}.`);
    if (!this.tours.has(pageId)) {
      const onEvent = this.runtime.onEvent;
      const onComplete = this.runtime.onComplete;
      this.tours.set(pageId, new ProductTour(page.config, {
        ...this.runtime,
        onEvent: (name, detail) => onEvent?.(name, { ...detail, pageId }),
        onComplete: (answers, tour) => onComplete?.(answers, tour, pageId)
      }));
    }
    return this.tours.get(pageId);
  }

  async start(options = {}) {
    this._assertBrowser();
    if (this.state === "destroyed") throw new Error("[product-tour-js] This manager was destroyed.");
    if (!this.unsubscribeNavigation && (options.watchRoutes ?? this.manifest.watchRoutes)) {
      this.unsubscribeNavigation = subscribeToNavigation(this.window, this._onNavigation);
    }
    this.state = "active";
    return this.refresh(options);
  }

  async refresh(options = {}) {
    this._assertBrowser();
    const refreshId = ++this.refreshId;
    const page = this.findPage(options.location);
    if (!page) {
      this.activeTour?.stop("route-change");
      this.activePageId = null;
      this.runtime.onPageChange?.(null, null, this);
      return null;
    }

    if (page.id === this.activePageId && this.activeTour?.isActive) return this.activeTour;
    if (page.id !== this.activePageId) this.activeTour?.stop("route-change");
    this.activePageId = page.id;
    const tour = this.getTour(page.id);
    if (refreshId !== this.refreshId) return null;
    await tour.start({ force: options.force ?? false });
    if (refreshId !== this.refreshId) {
      tour.stop("route-change");
      return null;
    }
    this.runtime.onPageChange?.(page.id, tour, this);
    return tour;
  }

  async startPage(pageId, options = {}) {
    this._assertBrowser();
    const tour = this.getTour(pageId);
    if (pageId !== this.activePageId) this.activeTour?.stop("page-change");
    this.activePageId = pageId;
    this.state = "active";
    await tour.start({ force: options.force ?? false });
    this.runtime.onPageChange?.(pageId, tour, this);
    return tour;
  }

  reset(pageId) {
    if (pageId) {
      this.getTour(pageId).reset();
      return this;
    }
    for (const page of this.manifest.pages) this.getTour(page.id).reset();
    return this;
  }

  stop() {
    this.refreshId += 1;
    this.unsubscribeNavigation?.();
    this.unsubscribeNavigation = null;
    this.activeTour?.stop("manager-stop");
    this.activePageId = null;
    if (this.state !== "destroyed") this.state = "ready";
  }

  destroy() {
    if (this.state === "destroyed") return;
    this.stop();
    for (const tour of this.tours.values()) tour.destroy();
    this.tours.clear();
    this.state = "destroyed";
  }

  _onNavigation() {
    this.refresh().catch((error) => {
      if (this.runtime.onError) this.runtime.onError(error, this);
      else this.window.console?.error?.(error);
    });
  }

  _assertBrowser() {
    if (!this.window?.location || !this.document?.body) {
      throw new Error("[product-tour-js] ProductTourManager requires a browser DOM.");
    }
  }
}
