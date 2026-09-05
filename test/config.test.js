import assert from "node:assert/strict";
import test from "node:test";

import {
  ProductTour,
  ProductTourManager,
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
  assert.equal(config.showCloseButton, true);
  assert.deepEqual(config.progress, { type: "text", position: "bottom-left" });
  assert.equal(config.steps[0].placement, "auto");
  assert.equal(config.steps[0].allowInteraction, true);
  assert.equal(config.steps[0].showCloseButton, true);
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
    id: "app",
    version: 4,
    labels: { next: "Continue" },
    progress: { type: "dots", position: "top-center" },
    pages: [
      {
        id: "dashboard",
        match: "/dashboard",
        steps: [{ type: "modal", content: "Dashboard" }]
      },
      {
        id: "project",
        match: { path: "/projects/:id", mode: "glob" },
        progress: { position: "bottom-right" },
        steps: [{ type: "modal", content: "Project" }]
      },
      {
        id: "invite",
        match: { path: "/invite", query: { source: "email" } },
        steps: [{ type: "modal", content: "Invite" }]
      }
    ]
  });
  const manager = new ProductTourManager(manifest);

  assert.equal(manifest.pages[0].config.id, "app:dashboard");
  assert.equal(manifest.pages[0].config.version, 4);
  assert.equal(manifest.pages[0].config.labels.next, "Continue");
  assert.deepEqual(manifest.pages[0].config.progress, { type: "dots", position: "top-center" });
  assert.deepEqual(manifest.pages[1].config.progress, { type: "dots", position: "bottom-right" });
  assert.equal(manager.findPage("https://example.test/dashboard")?.id, "dashboard");
  assert.equal(manager.findPage("https://example.test/projects/42")?.id, "project");
  assert.equal(manager.findPage("https://example.test/invite?source=email")?.id, "invite");
  assert.equal(manager.findPage("https://example.test/invite?source=other"), null);
  assert.deepEqual(defineTourManifest(manifest), manifest);
});

test("loadTourManifest concatenates pages from relative include files", async () => {
  const rootUrl = "https://example.test/config/product-tour.json";
  const sharedUrl = "https://example.test/config/tours/shared-pages.json";
  const projectUrl = "https://example.test/config/tours/project.json";
  const files = new Map([
    [rootUrl, {
      id: "app",
      version: 7,
      labels: { next: "Continue" },
      include: ["./tours/shared-pages.json", "./tours/project.json"]
    }],
    [sharedUrl, {
      pages: [
        { id: "home", match: "/", steps: [{ type: "modal", content: "Home" }] },
        { id: "settings", match: "/settings", steps: [{ type: "modal", content: "Settings" }] }
      ]
    }],
    [projectUrl, {
      id: "project",
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
  assert.equal(manifest.pages[2].config.id, "app:project");
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
