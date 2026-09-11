import assert from "node:assert/strict";
import test from "node:test";

import {
  ProductTour,
  ProductTourManager,
  createProductTourService,
  defineTourConfig,
  defineTourManifest,
  loadTourConfig,
  loadTourManifest
} from "../src/index.js";

const minimalConfig = {
  id: "welcome",
  steps: [{ target: "#create", title: "Create" }]
};

test("defineTourConfig applies safe defaults", () => {
  const config = defineTourConfig(minimalConfig);

  assert.equal(config.autoStart, true);
  assert.equal(config.showOnce, true);
  assert.equal(config.allowHtml, false);
  assert.equal(config.scrollBehavior, "smooth");
  assert.equal(config.showCloseButton, true);
  assert.equal(config.allowInteraction, true);
  assert.deepEqual(config.progress, { type: "text", position: "bottom-left" });
  assert.equal(config.steps[0].placement, "auto");
  assert.equal(config.steps[0].allowInteraction, true);
  assert.equal(config.steps[0].showCloseButton, true);
});

test("target interaction can be configured for the tour and overridden per step", () => {
  const config = defineTourConfig({
    allowInteraction: false,
    steps: [
      { target: "#blocked", title: "Blocked" },
      { target: "#interactive", title: "Interactive", allowInteraction: true }
    ]
  });

  assert.equal(config.steps[0].allowInteraction, false);
  assert.equal(config.steps[1].allowInteraction, true);
  assert.throws(
    () => defineTourConfig({ allowInteraction: "yes", steps: [{ content: "Invalid" }] }),
    /allowInteraction.*boolean/
  );
  assert.throws(
    () => defineTourConfig({ steps: [{ content: "Invalid", allowInteraction: "yes" }] }),
    /allowInteraction.*boolean/
  );

  const manifest = defineTourManifest({
    allowInteraction: false,
    pages: [{ id: "home", version: 1, match: "/", steps: [{ target: "#blocked", title: "Blocked" }] }]
  });
  assert.equal(manifest.pages[0].config.allowInteraction, false);
  assert.equal(manifest.pages[0].config.steps[0].allowInteraction, false);
});

test("scroll behavior supports smooth and immediate target scrolling", () => {
  assert.equal(defineTourConfig({ ...minimalConfig, scrollBehavior: "auto" }).scrollBehavior, "auto");
  assert.throws(
    () => defineTourConfig({ ...minimalConfig, scrollBehavior: "slow" }),
    /scrollBehavior.*auto.*smooth/
  );
});

test("close button visibility can be configured for the tour and overridden per step", () => {
  const config = defineTourConfig({
    showCloseButton: false,
    steps: [
      { type: "modal", content: "Hidden close button" },
      { type: "modal", content: "Visible close button", showCloseButton: true }
    ]
  });

  assert.equal(config.steps[0].showCloseButton, false);
  assert.equal(config.steps[1].showCloseButton, true);
  assert.throws(
    () => defineTourConfig({ showCloseButton: "yes", steps: [{ content: "Invalid" }] }),
    /showCloseButton.*boolean/
  );
});

test("progress indicators support hidden, text, dots, bar, and per-step positions", () => {
  const config = defineTourConfig({
    progress: { type: "dots", position: "top-center" },
    steps: [
      { type: "modal", content: "Uses dots" },
      { type: "modal", content: "Uses a bar", progress: { type: "bar", position: "bottom-right" } },
      { type: "modal", content: "Hidden", progress: { type: "none" } }
    ]
  });

  assert.deepEqual(config.steps[0].progress, { type: "dots", position: "top-center" });
  assert.deepEqual(config.steps[1].progress, { type: "bar", position: "bottom-right" });
  assert.deepEqual(config.steps[2].progress, { type: "none", position: "top-center" });
  assert.deepEqual(defineTourConfig(config), config);
  assert.throws(
    () => defineTourConfig({ progress: { type: "circle" }, steps: [{ content: "Invalid" }] }),
    /progress.type/
  );
  assert.throws(
    () => defineTourConfig({ progress: { position: "middle" }, steps: [{ content: "Invalid" }] }),
    /progress.position/
  );
});

test("a targetless step defaults to centered placement", () => {
  const config = defineTourConfig({ steps: [{ content: "Welcome" }] });
  assert.equal(config.steps[0].target, null);
  assert.equal(config.steps[0].type, "modal");
  assert.equal(config.steps[0].placement, "center");
});

test("question steps normalize fields, actions, and conditional branches", () => {
  const config = defineTourConfig({
    steps: [
      {
        id: "profile",
        type: "question",
        fields: [
          { name: "name", type: "text", required: true },
          { name: "role", type: "radio", options: ["developer", "manager"] },
          { name: "topics", type: "checkbox", options: ["reports", "automation"] }
        ],
        next: [
          { when: { field: "role", equals: "developer" }, stepId: "developer" },
          { stepId: "manager" }
        ]
      },
      { id: "developer", type: "modal", content: "Developer path" },
      { id: "manager", type: "modal", content: "Manager path" }
    ]
  });

  assert.equal(config.steps[0].fields[0].defaultValue, "");
  assert.deepEqual(config.steps[0].fields[2].defaultValue, []);
  assert.equal(config.steps[0].next[0].when.operator, "equals");
  assert.equal(config.steps[0].next[0].stepId, "developer");
  assert.deepEqual(defineTourConfig(config), config);
});

test("answers are exposed and drive conditional navigation", () => {
  const config = {
    steps: [
      {
        id: "profile",
        type: "question",
        fields: [{ name: "role", type: "radio", options: ["developer", "manager"] }],
        next: [
          { when: { field: "role", equals: "developer" }, stepId: "developer" },
          { stepId: "manager" }
        ]
      },
      { id: "developer", type: "modal", content: "Developer" },
      { id: "manager", type: "modal", content: "Manager" }
    ]
  };
  const tour = new ProductTour(config);
  tour.setAnswer("profile", "role", "developer");

  assert.equal(tour.getAnswer("profile", "role"), "developer");
  assert.equal(tour._resolveNextStep(tour.config.steps[0]), "developer");
  assert.deepEqual(tour.getAnswers(), { profile: { role: "developer" } });
});

test("step transitions animate the popover from its previous position and size", async () => {
  let keyframes;
  let timing;
  const animation = { cancel() {}, finished: Promise.resolve() };
  const tour = new ProductTour(
    { steps: [{ type: "modal", content: "Welcome" }] },
    { window: { matchMedia: () => ({ matches: false }) } }
  );
  const popover = {
    classList: { toggle() {}, remove() {} },
    getBoundingClientRect: () => ({ left: 400, top: 300, width: 360, height: 180 }),
    animate(frames, options) {
      keyframes = frames;
      timing = options;
      return animation;
    }
  };

  tour._animatePopover(popover, { left: 100, top: 80, width: 480, height: 300 });
  assert.match(keyframes[0].transform, /translate\(-300px, -220px\)/);
  assert.equal(keyframes[1].transform, "translate(0, 0) scale(1)");
  assert.equal(timing.duration, 220);
  await animation.finished;
});

test("partially clipped targets are centered while the popover stays hidden", async () => {
  const changes = [];
  const popover = {
    classList: {
      add(name) { changes.push(`hide:${name}`); }
    }
  };
  const tour = new ProductTour(
    { scrollBehavior: "auto", steps: [{ target: "#create", title: "Create" }] },
    {
      window: {
        innerWidth: 1000,
        innerHeight: 700,
        matchMedia: () => ({ matches: false }),
        requestAnimationFrame(callback) { callback(); }
      }
    }
  );
  tour.root = { dataset: {}, querySelector: () => popover };
  const target = {
    getBoundingClientRect: () => ({ top: -10, left: 100, right: 300, bottom: 90 }),
    scrollIntoView(options) { changes.push({ scroll: options }); }
  };

  await tour._settleTarget(target, tour.runId);

  assert.deepEqual(changes, [
    "hide:pt-popover--hidden",
    { scroll: { behavior: "auto", block: "center", inline: "center" } }
  ]);
  assert.equal(tour.root.dataset.scrolling, "true");
});

test("fully visible targets do not trigger scrolling or hide the popover", async () => {
  let hidden = false;
  let scrolled = false;
  const tour = new ProductTour(
    { steps: [{ target: "#create", title: "Create" }] },
    { window: { innerWidth: 1000, innerHeight: 700 } }
  );
  tour.root = { querySelector: () => ({ classList: { add() { hidden = true; } } }) };
  const target = {
    getBoundingClientRect: () => ({ top: 10, left: 20, right: 300, bottom: 200 }),
    scrollIntoView() { scrolled = true; }
  };

  await tour._settleTarget(target, tour.runId);

  assert.equal(hidden, false);
  assert.equal(scrolled, false);
});

test("targets covered by fixed UI are scrolled even when their rectangle fits the viewport", async () => {
  let scrolled = false;
  const fixedHeader = { contains: () => false };
  const target = {
    contains: () => false,
    parentElement: null,
    getBoundingClientRect: () => ({
      top: 10, left: 20, right: 300, bottom: 200, width: 280, height: 190
    }),
    scrollIntoView() { scrolled = true; }
  };
  const tour = new ProductTour(
    { scrollBehavior: "auto", steps: [{ target: "#create", title: "Create" }] },
    {
      document: { elementsFromPoint: () => [fixedHeader] },
      window: {
        innerWidth: 1000,
        innerHeight: 700,
        matchMedia: () => ({ matches: false }),
        requestAnimationFrame(callback) { callback(); }
      }
    }
  );
  tour.root = {
    dataset: {},
    contains: () => false,
    querySelector: () => ({ classList: { add() {} } })
  };

  await tour._settleTarget(target, tour.runId);

  assert.equal(scrolled, true);
});

test("page scroll lock is released while moving a clipped target and restored afterwards", async () => {
  const changes = [];
  const tour = new ProductTour(
    { scrollBehavior: "auto", steps: [{ target: "#create", title: "Create" }] },
    {
      window: {
        innerWidth: 1000,
        innerHeight: 700,
        matchMedia: () => ({ matches: false }),
        requestAnimationFrame(callback) { callback(); }
      }
    }
  );
  tour.state = "active";
  tour.scrollLocked = true;
  tour.root = {
    dataset: {},
    querySelector: () => ({ classList: { add() {} } })
  };
  tour._unlockPageScroll = () => {
    changes.push("unlock");
    tour.scrollLocked = false;
  };
  tour._lockPageScroll = () => {
    changes.push("lock");
    tour.scrollLocked = true;
  };
  const target = {
    getBoundingClientRect: () => ({ top: -20, left: 100, right: 300, bottom: 80 }),
    scrollIntoView() { changes.push("scroll"); }
  };

  await tour._settleTarget(target, tour.runId);

  assert.deepEqual(changes, ["unlock", "scroll", "lock"]);
  assert.equal(tour.scrollLocked, true);
});

test("background scrolling is blocked while popover scrolling stays available", () => {
  const popoverContent = {};
  const popover = { contains: (target) => target === popoverContent };
  const tour = new ProductTour({ steps: [{ type: "modal", content: "Welcome" }] });
  tour.state = "active";
  tour.root = { querySelector: () => popover };
  let prevented = 0;

  tour._onScrollAttempt({ target: {}, preventDefault() { prevented += 1; } });
  tour._onScrollAttempt({ target: popoverContent, preventDefault() { prevented += 1; } });

  assert.equal(prevented, 1);
});

test("invalid configurations return useful errors", () => {
  assert.throws(() => defineTourConfig({ steps: [] }), /non-empty array/);
  assert.throws(
    () => defineTourConfig({ steps: [{ title: "Bad", placement: "diagonal" }] }),
    /placement is invalid/
  );
  assert.throws(
    () => defineTourConfig({ steps: [{ id: "form", type: "question", fields: [] }] }),
    /must not be empty/
  );
  assert.throws(
    () => defineTourConfig({ steps: [{ id: "one", content: "One", next: "missing" }] }),
    /unknown step/
  );
});

test("loadTourConfig supports a URL via an injected fetch implementation", async () => {
  const requested = [];
  const config = await loadTourConfig("/tour.json", {
    fetch: async (url) => {
      requested.push(url);
      return { ok: true, json: async () => minimalConfig };
    }
  });

  assert.deepEqual(requested, ["/tour.json"]);
  assert.equal(config.id, "welcome");
});

test("completion is namespaced by tour id and version", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  const tour = new ProductTour({ ...minimalConfig, version: 3 }, { storage });

  assert.equal(tour.completionKey, "product-tour:welcome:v3");
  assert.equal(tour.isCompleted(), false);
  tour.complete();
  assert.equal(tour.isCompleted(), true);
  tour.reset();
  assert.equal(tour.isCompleted(), false);
});

test("multi-page manifests inherit defaults and match exact, glob, and query routes", () => {
  const manifest = defineTourManifest({
    labels: { next: "Continue" },
    progress: { type: "dots", position: "top-center" },
    pages: [
      {
        id: "dashboard",
        version: 4,
        match: "/dashboard",
        steps: [{ type: "modal", content: "Dashboard" }]
      },
      {
        id: "project",
        version: 5,
        match: { path: "/projects/:id", mode: "glob" },
        progress: { position: "bottom-right" },
        steps: [{ type: "modal", content: "Project" }]
      },
      {
        id: "invite",
        version: 1,
        match: { path: "/invite", query: { source: "email" } },
        steps: [{ type: "modal", content: "Invite" }]
      }
    ]
  });
  const manager = new ProductTourManager(manifest);

  assert.equal(manifest.pages[0].config.id, "dashboard");
  assert.equal(manifest.pages[0].config.version, 4);
  assert.equal(manifest.pages[0].config.storageKey, "product-tour");
  assert.equal(manager.getTour("dashboard").completionKey, "product-tour:dashboard:v4");
  assert.equal(manager.getTour("project").completionKey, "product-tour:project:v5");
  assert.equal(manifest.pages[0].config.labels.next, "Continue");
  assert.deepEqual(manifest.pages[0].config.progress, { type: "dots", position: "top-center" });
  assert.deepEqual(manifest.pages[1].config.progress, { type: "dots", position: "bottom-right" });
  assert.equal(manager.findPage("https://example.test/dashboard")?.id, "dashboard");
  assert.equal(manager.findPage("https://example.test/projects/42")?.id, "project");
  assert.equal(manager.findPage("https://example.test/invite?source=email")?.id, "invite");
  assert.equal(manager.findPage("https://example.test/invite?source=other"), null);
  assert.deepEqual(defineTourManifest(manifest), manifest);
});

test("multi-page tracking requires page versions and rejects manifest identity", () => {
  const page = { id: "home", version: 1, match: "/", steps: [{ type: "modal", content: "Home" }] };

  assert.throws(() => defineTourManifest({ id: "app", pages: [page] }), /must not define "id"/);
  assert.throws(() => defineTourManifest({ version: 2, pages: [page] }), /must not define "version"/);
  assert.throws(
    () => defineTourManifest({ pages: [{ ...page, version: undefined }] }),
    /pages\[0\]\.version/
  );
});

test("loadTourManifest concatenates pages from relative include files", async () => {
  const rootUrl = "https://example.test/config/product-tour.json";
  const sharedUrl = "https://example.test/config/tours/shared-pages.json";
  const projectUrl = "https://example.test/config/tours/project.json";
  const files = new Map([
    [rootUrl, {
      labels: { next: "Continue" },
      include: ["./tours/shared-pages.json", "./tours/project.json"]
    }],
    [sharedUrl, {
      pages: [
        { id: "home", version: 2, match: "/", steps: [{ type: "modal", content: "Home" }] },
        { id: "settings", version: 3, match: "/settings", steps: [{ type: "modal", content: "Settings" }] }
      ]
    }],
    [projectUrl, {
      id: "project",
      version: 7,
      match: { path: "/projects/:id", mode: "glob" },
      theme: { accentColor: "#0891b2" },
      steps: [{ type: "modal", content: "Project" }]
    }]
  ]);
  const requested = [];
  const manifest = await loadTourManifest(rootUrl, {
    fetch: async (url) => {
      const key = String(url);
      requested.push(key);
      return { ok: files.has(key), status: files.has(key) ? 200 : 404, json: async () => files.get(key) };
    }
  });

  assert.deepEqual(requested, [rootUrl, sharedUrl, projectUrl]);
  assert.deepEqual(manifest.pages.map((page) => page.id), ["home", "settings", "project"]);
  assert.equal(manifest.pages[2].config.id, "project");
  assert.equal(manifest.pages[2].config.version, 7);
  assert.equal(manifest.pages[2].config.labels.next, "Continue");
  assert.equal(manifest.pages[2].config.theme.accentColor, "#0891b2");
});

test("loadTourManifest rejects circular includes", async () => {
  const files = new Map([
    ["https://example.test/root.json", { include: ["./nested.json"] }],
    ["https://example.test/nested.json", { include: ["./root.json"] }]
  ]);

  await assert.rejects(
    loadTourManifest("https://example.test/root.json", {
      fetch: async (url) => ({ ok: true, status: 200, json: async () => files.get(String(url)) })
    }),
    /Circular manifest include/
  );
});

test("framework-neutral service localizes manifests and owns language subscriptions", async () => {
  let languageListener;
  let unsubscribed = false;
  const service = createProductTourService({
    source: {
      autoStart: false,
      pages: [
        {
          id: "home",
          version: 1,
          match: "/",
          steps: [{ type: "modal", title: "i18n:tour.title" }]
        }
      ]
    },
    autoStart: false,
    reloadOnLanguageChange: true,
    translate: async (key) => ({ "tour.title": "Welcome" })[key],
    onLanguageChange(listener) {
      languageListener = listener;
      return { unsubscribe() { unsubscribed = true; } };
    }
  });

  const manager = await service.initialize();

  assert.equal(typeof languageListener, "function");
  assert.equal(manager.getTour("home").config.steps[0].title, "Welcome");
  service.destroy();
  assert.equal(unsubscribed, true);
});

test("framework-neutral service does not subscribe to language changes by default", async () => {
  let subscribed = false;
  const service = createProductTourService({
    source: {
      autoStart: false,
      pages: [{ id: "home", version: 1, match: "/", steps: [{ type: "modal", content: "Welcome" }] }]
    },
    autoStart: false,
    onLanguageChange() {
      subscribed = true;
    }
  });

  await service.initialize();
  assert.equal(subscribed, false);
  service.destroy();
});
