const PLACEMENTS = new Set(["auto", "top", "right", "bottom", "left", "center"]);
const STORAGE_TYPES = new Set(["local", "session", "none"]);
const MISSING_TARGET_BEHAVIORS = new Set(["skip", "abort"]);
const SCROLL_BEHAVIORS = new Set(["auto", "smooth"]);
const STEP_TYPES = new Set(["tooltip", "modal", "question"]);
const FIELD_TYPES = new Set(["text", "radio", "checkbox"]);
const ACTION_TYPES = new Set(["next", "back", "finish", "dismiss", "goTo", "emit"]);
const ACTION_VARIANTS = new Set(["primary", "secondary", "link"]);
const MATCH_MODES = new Set(["exact", "prefix", "glob"]);
const PROGRESS_TYPES = new Set(["none", "text", "dots", "bar"]);
const PROGRESS_POSITIONS = new Set([
  "top-left", "top-center", "top-right",
  "bottom-left", "bottom-center", "bottom-right"
]);
const TOUR_OPTION_KEYS = [
  "version", "autoStart", "showOnce", "markOnDismiss", "storage", "storageKey",
  "startDelay", "targetTimeout", "scrollBehavior", "onMissingTarget", "closeOnEscape",
  "closeOnOverlayClick", "showCloseButton", "allowHtml", "labels", "theme", "progress"
];

export const DEFAULT_CONFIG = Object.freeze({
  id: "default",
  version: 1,
  autoStart: true,
  showOnce: true,
  markOnDismiss: true,
  storage: "local",
  storageKey: "product-tour",
  startDelay: 0,
  targetTimeout: 3000,
  scrollBehavior: "smooth",
  onMissingTarget: "skip",
  closeOnEscape: true,
  closeOnOverlayClick: false,
  showCloseButton: true,
  allowHtml: false,
  progress: Object.freeze({
    type: "text",
    position: "bottom-left"
  }),
  labels: Object.freeze({
    next: "Next",
    previous: "Back",
    finish: "Finish",
    skip: "Skip",
    close: "Close",
    progress: "Step {current} of {total}",
    required: "Please answer the required fields."
  }),
  theme: Object.freeze({
    accentColor: "#2563eb",
    overlayColor: "rgba(15, 23, 42, 0.68)",
    borderRadius: "12px",
    zIndex: 2147483000
  })
});

function assert(condition, message) {
  if (!condition) throw new TypeError(`[product-tour-js] ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNonNegative(value, fallback, field) {
  if (value === undefined) return fallback;
  assert(Number.isFinite(value) && value >= 0, `"${field}" must be a non-negative number.`);
  return value;
}

function normalizeProgress(progress, fallback = DEFAULT_CONFIG.progress, path = "progress") {
  if (progress === undefined || progress === null) return { ...fallback };
  assert(isPlainObject(progress), `"${path}" must be an object.`);
  const type = progress.type ?? fallback.type;
  const position = progress.position ?? fallback.position;
  assert(PROGRESS_TYPES.has(type), `"${path}.type" must be "none", "text", "dots", or "bar".`);
  assert(PROGRESS_POSITIONS.has(position), `"${path}.position" is invalid.`);
  return { type, position };
}

function normalizeOption(option, fieldPath, index) {
  if (["string", "number", "boolean"].includes(typeof option)) {
    return { label: String(option), value: option, disabled: false };
  }
  assert(isPlainObject(option), `${fieldPath}.options[${index}] must be a primitive or object.`);
  assert(Object.hasOwn(option, "value"), `${fieldPath}.options[${index}] needs a "value".`);
  assert(
    ["string", "number", "boolean"].includes(typeof option.value),
    `${fieldPath}.options[${index}].value must be a string, number, or boolean.`
  );
  return {
    label: option.label === undefined ? String(option.value) : String(option.label),
    value: option.value,
    disabled: option.disabled ?? false
  };
}

function normalizeField(field, stepIndex, fieldIndex) {
  const path = `steps[${stepIndex}].fields[${fieldIndex}]`;
  assert(isPlainObject(field), `${path} must be an object.`);
  assert(typeof field.name === "string" && field.name.trim(), `${path}.name must be a non-empty string.`);
  const type = field.type ?? "text";
  assert(FIELD_TYPES.has(type), `${path}.type must be "text", "radio", or "checkbox".`);
  const options = (field.options ?? []).map((option, index) => normalizeOption(option, path, index));
  if (type === "radio") assert(options.length > 0, `${path}.options must not be empty for a radio field.`);

  const fallbackValue = type === "checkbox" ? (options.length ? [] : false) : type === "radio" ? null : "";
  return {
    name: field.name.trim(),
    type,
    label: field.label ?? field.name.trim(),
    description: field.description ?? "",
    placeholder: field.placeholder ?? "",
    required: field.required ?? false,
    options,
    defaultValue: field.defaultValue ?? fallbackValue,
    validationMessage: field.validationMessage ?? ""
  };
}

function normalizeAction(action, stepIndex, actionIndex) {
  const path = `steps[${stepIndex}].actions[${actionIndex}]`;
  assert(isPlainObject(action), `${path} must be an object.`);
  const actionType = action.action ?? "next";
  assert(ACTION_TYPES.has(actionType), `${path}.action is invalid.`);
  const variant = action.variant ?? (actionType === "next" || actionType === "finish" ? "primary" : "secondary");
  assert(ACTION_VARIANTS.has(variant), `${path}.variant is invalid.`);
  if (actionType === "goTo") {
    assert(typeof action.targetStep === "string" && action.targetStep, `${path}.targetStep is required for goTo.`);
  }
  if (actionType === "emit") {
    assert(typeof action.event === "string" && action.event, `${path}.event is required for emit.`);
  }
  return {
    id: action.id ?? `action-${actionIndex + 1}`,
    label: action.label ?? "",
    action: actionType,
    variant,
    targetStep: action.targetStep ?? null,
    event: action.event ?? null
  };
}

function normalizeCondition(condition, path) {
  assert(isPlainObject(condition), `${path} must be an object.`);
  assert(typeof condition.field === "string" && condition.field, `${path}.field is required.`);
  if (["equals", "notEquals", "includes", "exists"].includes(condition.operator)) {
    return {
      field: condition.field,
      stepId: condition.stepId ?? null,
      operator: condition.operator,
      value: condition.value
    };
  }
  const operators = ["equals", "notEquals", "includes", "exists"].filter((key) => Object.hasOwn(condition, key));
  assert(operators.length === 1, `${path} needs exactly one of equals, notEquals, includes, or exists.`);
  return {
    field: condition.field,
    stepId: condition.stepId ?? null,
    operator: operators[0],
    value: condition[operators[0]]
  };
}

function normalizeNext(next, stepIndex) {
  if (next === undefined || next === null) return null;
  if (typeof next === "string") return next;
  assert(Array.isArray(next) && next.length > 0, `steps[${stepIndex}].next must be a step id or rule array.`);
  return next.map((rule, ruleIndex) => {
    const path = `steps[${stepIndex}].next[${ruleIndex}]`;
    assert(isPlainObject(rule), `${path} must be an object.`);
    assert(typeof rule.stepId === "string" && rule.stepId, `${path}.stepId is required.`);
    return {
      stepId: rule.stepId,
      when: rule.when ? normalizeCondition(rule.when, `${path}.when`) : null
    };
  });
}

function normalizeStep(step, index, defaultProgress, defaultShowCloseButton) {
  assert(isPlainObject(step), `steps[${index}] must be an object.`);
  assert(
    step.target === undefined || step.target === null || typeof step.target === "string",
    `steps[${index}].target must be a CSS selector string or null.`
  );

  const type = step.type ?? (step.target ? "tooltip" : "modal");
  assert(STEP_TYPES.has(type), `steps[${index}].type must be "tooltip", "modal", or "question".`);
  if (type === "tooltip") {
    assert(typeof step.target === "string" && step.target, `steps[${index}].target is required for tooltip.`);
  }

  const fields = (step.fields ?? []).map((field, fieldIndex) => normalizeField(field, index, fieldIndex));
  if (type === "question") assert(fields.length > 0, `steps[${index}].fields must not be empty for a question.`);
  assert(
    type === "question" || typeof step.title === "string" || typeof step.content === "string",
    `steps[${index}] needs a string "title" or "content".`
  );
  assert(new Set(fields.map((field) => field.name)).size === fields.length, `steps[${index}] has duplicate field names.`);

  const placement = step.placement ?? (step.target ? "auto" : "center");
  assert(PLACEMENTS.has(placement), `steps[${index}].placement is invalid.`);
  assert(
    step.showCloseButton === undefined || typeof step.showCloseButton === "boolean",
    `steps[${index}].showCloseButton must be a boolean.`
  );
  assert(step.actions === undefined || step.actions === null || Array.isArray(step.actions), `steps[${index}].actions must be an array.`);
  const actions = step.actions === undefined || step.actions === null
    ? null
    : step.actions.map((action, actionIndex) => normalizeAction(action, index, actionIndex));
  if (Array.isArray(step.actions)) assert(actions.length > 0, `steps[${index}].actions must not be empty.`);

  return {
    id: step.id ?? `step-${index + 1}`,
    type,
    target: step.target ?? null,
    title: step.title ?? "",
    content: step.content ?? "",
    placement,
    allowInteraction: step.allowInteraction ?? true,
    nextOnTargetClick: step.nextOnTargetClick ?? false,
    showCloseButton: step.showCloseButton ?? defaultShowCloseButton,
    padding: finiteNonNegative(step.padding, 8, `steps[${index}].padding`),
    progress: normalizeProgress(step.progress, defaultProgress, `steps[${index}].progress`),
    fields,
    actions,
    next: normalizeNext(step.next, index)
  };
}

function validateStepReferences(steps) {
  const ids = steps.map((step) => step.id);
  assert(new Set(ids).size === ids.length, "Step ids must be unique.");
  const knownIds = new Set(ids);
  for (const step of steps) {
    const targets = [
      ...(typeof step.next === "string" ? [step.next] : Array.isArray(step.next) ? step.next.map((rule) => rule.stepId) : []),
      ...(step.actions ?? []).filter((action) => action.action === "goTo").map((action) => action.targetStep)
    ];
    for (const target of targets) {
      assert(knownIds.has(target), `Step "${step.id}" references unknown step "${target}".`);
    }
  }
}

/** Validate and fill defaults for a product-tour configuration object. */
export function defineTourConfig(input) {
  assert(isPlainObject(input), "The configuration must be a JSON object.");
  assert(Array.isArray(input.steps) && input.steps.length > 0, '"steps" must be a non-empty array.');

  const id = input.id ?? DEFAULT_CONFIG.id;
  assert(typeof id === "string" && id.trim(), '"id" must be a non-empty string.');
  assert(
    input.version === undefined || ["string", "number"].includes(typeof input.version),
    '"version" must be a string or number.'
  );
  const storage = input.storage ?? DEFAULT_CONFIG.storage;
  const onMissingTarget = input.onMissingTarget ?? DEFAULT_CONFIG.onMissingTarget;
  const scrollBehavior = input.scrollBehavior ?? DEFAULT_CONFIG.scrollBehavior;
  const showCloseButton = input.showCloseButton ?? DEFAULT_CONFIG.showCloseButton;
  assert(STORAGE_TYPES.has(storage), '"storage" must be "local", "session", or "none".');
  assert(MISSING_TARGET_BEHAVIORS.has(onMissingTarget), '"onMissingTarget" must be "skip" or "abort".');
  assert(SCROLL_BEHAVIORS.has(scrollBehavior), '"scrollBehavior" must be "auto" or "smooth".');
  assert(typeof showCloseButton === "boolean", '"showCloseButton" must be a boolean.');

  const progress = normalizeProgress(input.progress);
  const steps = input.steps.map((step, index) => normalizeStep(step, index, progress, showCloseButton));
  validateStepReferences(steps);
  return {
    ...DEFAULT_CONFIG,
    ...input,
    id: id.trim(),
    storage,
    onMissingTarget,
    scrollBehavior,
    showCloseButton,
    startDelay: finiteNonNegative(input.startDelay, DEFAULT_CONFIG.startDelay, "startDelay"),
    targetTimeout: finiteNonNegative(input.targetTimeout, DEFAULT_CONFIG.targetTimeout, "targetTimeout"),
    progress,
    labels: { ...DEFAULT_CONFIG.labels, ...(input.labels ?? {}) },
    theme: { ...DEFAULT_CONFIG.theme, ...(input.theme ?? {}) },
    steps
  };
}

function normalizePageMatch(match, index) {
  const path = `pages[${index}].match`;
  if (typeof match === "string") {
    const mode = match.includes("*") || match.includes(":") ? "glob" : "exact";
    return { path: match, mode, hash: null, query: {} };
  }
  assert(isPlainObject(match), `${path} must be a path string or object.`);
  const routePath = match.path ?? "*";
  assert(typeof routePath === "string" && routePath, `${path}.path must be a non-empty string.`);
  const mode = match.mode ?? (routePath.includes("*") || routePath.includes(":") ? "glob" : "exact");
  assert(MATCH_MODES.has(mode), `${path}.mode must be "exact", "prefix", or "glob".`);
  assert(match.hash === undefined || match.hash === null || typeof match.hash === "string", `${path}.hash must be a string.`);
  assert(match.query === undefined || isPlainObject(match.query), `${path}.query must be an object.`);
  const query = {};
  for (const [key, value] of Object.entries(match.query ?? {})) {
    assert(["string", "number", "boolean"].includes(typeof value), `${path}.query.${key} must be a primitive.`);
    query[key] = String(value);
  }
  return { path: routePath, mode, hash: match.hash ?? null, query };
}

function pickTourOptions(source) {
  return Object.fromEntries(TOUR_OPTION_KEYS.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}

function mergeStructuredOption(parent, child) {
  if (child === undefined) return parent;
  if (parent === undefined) return child;
  return isPlainObject(parent) && isPlainObject(child) ? { ...parent, ...child } : child;
}

function mergeTourOptions(parent, child) {
  const parentOptions = pickTourOptions(parent);
  const childOptions = pickTourOptions(child);
  return {
    ...parentOptions,
    ...childOptions,
    ...(parentOptions.labels || childOptions.labels
      ? { labels: { ...(parentOptions.labels ?? {}), ...(childOptions.labels ?? {}) } }
      : {}),
    ...(parentOptions.theme || childOptions.theme
      ? { theme: { ...(parentOptions.theme ?? {}), ...(childOptions.theme ?? {}) } }
      : {}),
    ...(parentOptions.progress || childOptions.progress
      ? { progress: mergeStructuredOption(parentOptions.progress, childOptions.progress) }
      : {})
  };
}

function inheritPageOptions(page, shared) {
  return {
    ...shared,
    ...page,
    ...(shared.labels || page.labels
      ? { labels: { ...(shared.labels ?? {}), ...(page.labels ?? {}) } }
      : {}),
    ...(shared.theme || page.theme
      ? { theme: { ...(shared.theme ?? {}), ...(page.theme ?? {}) } }
      : {}),
    ...(shared.progress || page.progress
      ? { progress: mergeStructuredOption(shared.progress, page.progress) }
      : {})
  };
}

/** Validate a multi-page product-tour manifest and build each inherited page config. */
export function defineTourManifest(input) {
  assert(isPlainObject(input), "The multi-page configuration must be a JSON object.");
  assert(Array.isArray(input.pages) && input.pages.length > 0, '"pages" must be a non-empty array.');
  const id = input.id ?? DEFAULT_CONFIG.id;
  assert(typeof id === "string" && id.trim(), '"id" must be a non-empty string.');
  const shared = pickTourOptions(input);
  const pages = input.pages.map((page, index) => {
    assert(isPlainObject(page), `pages[${index}] must be an object.`);
    assert(typeof page.id === "string" && page.id.trim(), `pages[${index}].id must be a non-empty string.`);
    assert(page.match !== undefined, `pages[${index}].match is required.`);
    const pageOptions = pickTourOptions(page);
    const pageId = page.id.trim();
    const config = page.config
      ? defineTourConfig(page.config)
      : defineTourConfig({
          ...shared,
          ...pageOptions,
          labels: { ...(shared.labels ?? {}), ...(pageOptions.labels ?? {}) },
          theme: { ...(shared.theme ?? {}), ...(pageOptions.theme ?? {}) },
          progress: mergeStructuredOption(shared.progress, pageOptions.progress),
          id: `${id.trim()}:${pageId}`,
          steps: page.steps
        });
    return {
      id: pageId,
      enabled: page.enabled ?? true,
      match: normalizePageMatch(page.match, index),
      config
    };
  });
  assert(new Set(pages.map((page) => page.id)).size === pages.length, "Page ids must be unique.");
  return {
    id: id.trim(),
    version: input.version ?? DEFAULT_CONFIG.version,
    autoStart: input.autoStart ?? DEFAULT_CONFIG.autoStart,
    watchRoutes: input.watchRoutes ?? true,
    pages
  };
}

/** Load a config object from an object, URL, or path reachable by fetch(). */
export async function loadTourConfig(source = "/product-tour.json", options = {}) {
  if (isPlainObject(source)) return defineTourConfig(source);
  const isUrl = typeof URL !== "undefined" && source instanceof URL;
  assert(typeof source === "string" || isUrl, "Config source must be an object, URL, or URL string.");
  const fetcher = options.fetch ?? globalThis.fetch;
  assert(typeof fetcher === "function", "No fetch implementation is available to load the config URL.");

  let response;
  try {
    response = await fetcher(source, { signal: options.signal });
  } catch (error) {
    throw new Error(`[product-tour-js] Could not load config from ${source}: ${error.message}`, { cause: error });
  }
  if (!response.ok) throw new Error(`[product-tour-js] Could not load config from ${source}: HTTP ${response.status}.`);

  let json;
  try {
    json = await response.json();
  } catch (error) {
    throw new Error(`[product-tour-js] Config at ${source} is not valid JSON.`, { cause: error });
  }
  return defineTourConfig(json);
}

/** Load a multi-page manifest from an object, URL, or path reachable by fetch(). */
export async function loadTourManifest(source = "/product-tour.json", options = {}) {
  const fetcher = options.fetch ?? globalThis.fetch;
  const environmentBase = globalThis.location?.href ?? "http://product-tour.local/";
  const fallbackBase = new URL(String(options.baseUrl ?? environmentBase), environmentBase).href;
  const stack = new Set();

  const resolveUrl = (value, base = fallbackBase) => new URL(String(value), base).href;

  const readSource = async (currentSource, parentUrl, isRoot = false) => {
    if (isPlainObject(currentSource)) {
      return { json: currentSource, url: parentUrl ?? resolveUrl(fallbackBase), key: currentSource };
    }
    const isUrl = typeof URL !== "undefined" && currentSource instanceof URL;
    assert(typeof currentSource === "string" || isUrl, "Manifest source must be an object, URL, or URL string.");
    assert(typeof fetcher === "function", "No fetch implementation is available to load the manifest URL.");
    const resolvedUrl = resolveUrl(currentSource, parentUrl ?? fallbackBase);
    const requestUrl = isRoot ? currentSource : resolvedUrl;
    let response;
    try {
      response = await fetcher(requestUrl, { signal: options.signal });
    } catch (error) {
      throw new Error(`[product-tour-js] Could not load manifest from ${requestUrl}: ${error.message}`, { cause: error });
    }
    if (!response.ok) {
      throw new Error(`[product-tour-js] Could not load manifest from ${requestUrl}: HTTP ${response.status}.`);
    }
    let json;
    try {
      json = await response.json();
    } catch (error) {
      throw new Error(`[product-tour-js] Manifest at ${requestUrl} is not valid JSON.`, { cause: error });
    }
    return { json, url: resolvedUrl, key: resolvedUrl };
  };

  const expandSource = async (currentSource, inheritedOptions, parentUrl, isRoot = false) => {
    const record = await readSource(currentSource, parentUrl, isRoot);
    if (stack.has(record.key)) {
      throw new TypeError(`[product-tour-js] Circular manifest include detected at ${record.url}.`);
    }
    stack.add(record.key);
    try {
      const manifest = record.json;
      assert(isPlainObject(manifest), "Each included manifest must be a JSON object.");
      const isPageFile = manifest.match !== undefined || manifest.steps !== undefined;
      if (isPageFile) {
        assert(manifest.pages === undefined, 'A page file cannot also contain "pages".');
        assert(manifest.include === undefined, 'A page file cannot also contain "include".');
        assert(manifest.match !== undefined, 'A page file with "steps" must also contain "match".');
        return { manifest, pages: [inheritPageOptions(manifest, inheritedOptions)] };
      }
      assert(manifest.pages === undefined || Array.isArray(manifest.pages), 'Manifest "pages" must be an array.');
      assert(manifest.include === undefined || Array.isArray(manifest.include), 'Manifest "include" must be an array.');
      const includes = manifest.include ?? [];
      for (const [index, include] of includes.entries()) {
        const isUrl = typeof URL !== "undefined" && include instanceof URL;
        assert(
          (typeof include === "string" && include.trim()) || isUrl,
          `Manifest include[${index}] must be a non-empty URL string.`
        );
      }
      const directPages = manifest.pages ?? [];
      assert(
        directPages.length > 0 || includes.length > 0,
        'A manifest must contain at least one page or an "include" source.'
      );

      const shared = mergeTourOptions(inheritedOptions, manifest);
      const pages = directPages.map((page) => inheritPageOptions(page, shared));
      for (const include of includes) {
        const included = await expandSource(include, shared, record.url);
        pages.push(...included.pages);
      }
      return { manifest, pages };
    } finally {
      stack.delete(record.key);
    }
  };

  const expanded = await expandSource(source, {}, null, true);
  return defineTourManifest({ ...expanded.manifest, pages: expanded.pages });
}
