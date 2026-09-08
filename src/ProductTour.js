import { defineTourConfig } from "./config.js";
import { PRODUCT_TOUR_STYLES } from "./styles.js";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
const scrollLocks = new WeakMap();
let instanceCount = 0;

function format(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function valuesEqual(left, right) {
  return Object.is(left, right) || JSON.stringify(left) === JSON.stringify(right);
}

export class ProductTour {
  constructor(config, runtime = {}) {
    this.config = defineTourConfig(config);
    this.runtime = runtime;
    this.document = runtime.document ?? globalThis.document;
    this.window = runtime.window ?? globalThis.window;
    this.currentIndex = -1;
    this.state = "ready";
    this.root = null;
    this.currentTarget = null;
    this.runId = 0;
    this.restoreFocusTo = null;
    this.history = [];
    this.answers = clone(runtime.initialAnswers);
    this.uid = `pt-${++instanceCount}`;
    this.popoverAnimation = null;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onScrollAttempt = this._onScrollAttempt.bind(this);
    this._onViewportChange = this._onViewportChange.bind(this);
    this._onTargetClick = this._onTargetClick.bind(this);
  }

  get completionKey() {
    return `${this.config.storageKey}:${this.config.id}:v${this.config.version}`;
  }

  get isActive() {
    return this.state === "active";
  }

  getAnswers() {
    return clone(this.answers);
  }

  getAnswer(stepId, fieldName) {
    return clone({ value: this.answers[stepId]?.[fieldName] }).value;
  }

  setAnswer(stepId, fieldName, value) {
    const step = this.config.steps.find((candidate) => candidate.id === stepId);
    if (!step) throw new RangeError(`[product-tour-js] Unknown step: ${stepId}.`);
    if (!step.fields.some((field) => field.name === fieldName)) {
      throw new RangeError(`[product-tour-js] Unknown field "${fieldName}" in step "${stepId}".`);
    }
    this._setAnswer(stepId, fieldName, value, true);
    return this;
  }

  isCompleted() {
    if (!this.config.showOnce || this.config.storage === "none") return false;
    try {
      return this._getStorage()?.getItem(this.completionKey) === "completed";
    } catch {
      return false;
    }
  }

  reset(options = {}) {
    try {
      this._getStorage()?.removeItem(this.completionKey);
    } catch {
      // Storage can be blocked by privacy settings; reset remains best-effort.
    }
    if (options.clearAnswers ?? true) this.answers = clone(this.runtime.initialAnswers);
    this.history = [];
    if (!this.isActive) this.state = "ready";
    this._emit("reset", { answers: this.getAnswers() });
    return this;
  }

  async start(options = {}) {
    this._assertBrowser();
    if (this.state === "destroyed") throw new Error("[product-tour-js] This tour was destroyed.");
    if (this.isActive) return true;

    const force = options.force ?? false;
    if (!force && this.config.showOnce && this.isCompleted()) {
      this.state = "completed";
      this._emit("skip", { reason: "already-completed" });
      return false;
    }

    const runId = ++this.runId;
    if (this.config.startDelay > 0) await wait(this.config.startDelay);
    if (runId !== this.runId || this.state === "destroyed") return false;

    this.restoreFocusTo = this.document.activeElement;
    this.history = [];
    this.state = "active";
    this._mount();
    this._emit("start", { answers: this.getAnswers() });
    return this._showStep(0, 1, runId);
  }

  next() {
    if (!this.isActive) return Promise.resolve(false);
    if (!this._validateCurrentStep()) return Promise.resolve(false);
    const step = this.config.steps[this.currentIndex];
    const nextStepId = this._resolveNextStep(step);
    if (nextStepId) return this.goTo(nextStepId);
    if (this.currentIndex >= this.config.steps.length - 1) {
      this.complete({ validate: false });
      return Promise.resolve(true);
    }
    this.history.push(this.currentIndex);
    return this._showStep(this.currentIndex + 1, 1, this.runId);
  }

  previous() {
    if (!this.isActive || (this.currentIndex <= 0 && this.history.length === 0)) return Promise.resolve(false);
    const previousIndex = this.history.length ? this.history.pop() : this.currentIndex - 1;
    return this._showStep(previousIndex, -1, this.runId);
  }

  goTo(step, options = {}) {
    if (!this.isActive) return Promise.resolve(false);
    const index = typeof step === "number"
      ? step
      : this.config.steps.findIndex((candidate) => candidate.id === step);
    if (!Number.isInteger(index) || index < 0 || index >= this.config.steps.length) {
      throw new RangeError(`[product-tour-js] Unknown step: ${step}.`);
    }
    if (index === this.currentIndex) return Promise.resolve(true);
    const direction = index >= this.currentIndex ? 1 : -1;
    if ((options.recordHistory ?? true) && this.currentIndex >= 0) this.history.push(this.currentIndex);
    return this._showStep(index, direction, this.runId);
  }

  complete(options = {}) {
    if (this.state === "destroyed") return false;
    if (this.isActive && (options.validate ?? true) && !this._validateCurrentStep()) return false;
    this._rememberCompletion();
    this.state = "completed";
    this.runId += 1;
    const answers = this.getAnswers();
    this.runtime.onComplete?.(answers, this);
    this._emit("complete", { answers });
    this._unmount();
    return true;
  }

  dismiss(reason = "dismissed") {
    if (!this.isActive) return;
    if (this.config.markOnDismiss) this._rememberCompletion();
    this.state = "dismissed";
    this.runId += 1;
    this._emit("dismiss", { reason, answers: this.getAnswers() });
    this._unmount();
  }

  stop(reason = "stopped") {
    if (!this.isActive) return;
    this.runId += 1;
    this.state = "ready";
    this._emit("stop", { reason, answers: this.getAnswers() });
    this._unmount();
  }

  destroy() {
    if (this.state === "destroyed") return;
    this.runId += 1;
    this._unmount();
    this.state = "destroyed";
    this._emit("destroy");
  }

  async _showStep(index, direction, runId) {
    let candidate = index;
    while (candidate >= 0 && candidate < this.config.steps.length) {
      if (runId !== this.runId || !this.isActive) return false;
      const step = this.config.steps[candidate];
      const target = step.target
        ? await this._waitForTarget(step.target, this.config.targetTimeout, runId)
        : null;

      if (!step.target || target) {
        if (target) await this._settleTarget(target, runId);
        if (runId !== this.runId || !this.isActive) return false;
        this._renderStep(step, candidate, target);
        return true;
      }

      this._emit("missingtarget", { step, index: candidate, selector: step.target });
      if (this.config.onMissingTarget === "abort") {
        this.dismiss("missing-target");
        return false;
      }
      candidate += direction;
    }

    if (direction > 0) this.complete({ validate: false });
    return false;
  }

  async _waitForTarget(selector, timeout, runId) {
    let target;
    try {
      target = this.document.querySelector(selector);
    } catch (error) {
      throw new TypeError(`[product-tour-js] Invalid target selector "${selector}".`, { cause: error });
    }
    if (target) return target;
    if (timeout === 0) return null;

    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        observer?.disconnect();
        clearTimeout(timer);
        resolve(value);
      };
      const observer = typeof this.window.MutationObserver === "function"
        ? new this.window.MutationObserver(() => {
            if (runId !== this.runId) return finish(null);
            const found = this.document.querySelector(selector);
            if (found) finish(found);
          })
        : null;
      observer?.observe(this.document.documentElement, { childList: true, subtree: true });
      const timer = setTimeout(() => finish(null), timeout);
    });
  }

  _mount() {
    this._injectStyles();
    const root = this.document.createElement("div");
    const titleId = `${this.uid}-title`;
    const contentId = `${this.uid}-content`;
    root.className = "pt-root";
    root.dataset.productTourId = this.config.id;
    root.style.setProperty("--pt-accent", this.config.theme.accentColor);
    root.style.setProperty("--pt-overlay", this.config.theme.overlayColor);
    root.style.setProperty("--pt-radius", this.config.theme.borderRadius);
    root.style.setProperty("--pt-z", String(this.config.theme.zIndex));
    root.innerHTML = `
      <div class="pt-backdrop" data-panel="top"></div>
      <div class="pt-backdrop" data-panel="left"></div>
      <div class="pt-backdrop" data-panel="right"></div>
      <div class="pt-backdrop" data-panel="bottom"></div>
      <div class="pt-target-blocker" hidden></div>
      <div class="pt-spotlight" aria-hidden="true"></div>
      <section class="pt-popover pt-popover--hidden" role="dialog" aria-modal="true" aria-labelledby="${titleId}" aria-describedby="${contentId}" tabindex="-1">
        <button class="pt-close" type="button" data-action="close"></button>
        <div class="pt-progress pt-progress--top" data-progress-area="top" aria-live="polite" hidden></div>
        <h2 class="pt-title" id="${titleId}"></h2>
        <div class="pt-content" id="${contentId}"></div>
        <form class="pt-form" novalidate hidden></form>
        <div class="pt-error" role="alert" aria-live="polite"></div>
        <div class="pt-footer">
          <div class="pt-actions"></div>
        </div>
        <div class="pt-progress pt-progress--bottom" data-progress-area="bottom" aria-live="polite" hidden></div>
      </section>`;

    const closeButton = root.querySelector('[data-action="close"]');
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", this.config.labels.close);
    closeButton.addEventListener("click", () => this.dismiss("close"));
    root.querySelector(".pt-form").addEventListener("submit", (event) => {
      event.preventDefault();
      this.next();
    });
    for (const panel of root.querySelectorAll(".pt-backdrop")) {
      panel.addEventListener("click", () => {
        if (this.config.closeOnOverlayClick) this.dismiss("overlay");
      });
    }

    this.root = root;
    this.document.body.append(root);
    this._lockPageScroll();
    this.document.addEventListener("keydown", this._onKeyDown, true);
    this.window.addEventListener("wheel", this._onScrollAttempt, { capture: true, passive: false });
    this.window.addEventListener("touchmove", this._onScrollAttempt, { capture: true, passive: false });
    this.window.addEventListener("resize", this._onViewportChange);
    this.window.addEventListener("scroll", this._onViewportChange, true);
  }

  _renderStep(step, index, target) {
    this._detachTargetListener();
    const popover = this.root.querySelector(".pt-popover");
    const previousRect = this.currentIndex >= 0 ? popover.getBoundingClientRect() : null;
    this.popoverAnimation?.cancel();
    this.popoverAnimation = null;
    this.currentIndex = index;
    this.currentTarget = target;
    this.root.dataset.stepType = step.type;

    const title = this.root.querySelector(".pt-title");
    const content = this.root.querySelector(".pt-content");
    const form = this.root.querySelector(".pt-form");
    this.root.querySelector('[data-action="close"]').hidden = !step.showCloseButton;
    title.textContent = step.title;
    if (this.config.allowHtml) content.innerHTML = step.content;
    else content.textContent = step.content;
    form.replaceChildren();
    form.hidden = step.type !== "question";
    this.root.querySelector(".pt-error").textContent = "";
    if (step.type === "question") this._renderQuestion(step, form);
    this._renderActions(step, index);
    this._renderProgress(step, index);

    if (target && step.nextOnTargetClick) target.addEventListener("click", this._onTargetClick);
    this._position(step, target);
    popover.classList.remove("pt-popover--hidden");
    this._animatePopover(popover, previousRect);
    popover.focus({ preventScroll: true });
    this._emit("step", { step, index, target, answers: this.getAnswers() });
  }

  _renderProgress(step, index) {
    const progress = step.progress ?? this.config.progress;
    const slots = [...this.root.querySelectorAll(".pt-progress")];
    for (const slot of slots) {
      slot.replaceChildren();
      slot.hidden = true;
      delete slot.dataset.progressType;
      delete slot.dataset.progressAlign;
      slot.removeAttribute("role");
      slot.removeAttribute("aria-valuemin");
      slot.removeAttribute("aria-valuemax");
      slot.removeAttribute("aria-valuenow");
      slot.removeAttribute("aria-label");
    }
    if (progress.type === "none") return;

    const [area, align] = progress.position.split("-");
    const slot = this.root.querySelector(`[data-progress-area="${area}"]`);
    const current = index + 1;
    const total = this.config.steps.length;
    const label = format(this.config.labels.progress, { current, total });
    slot.hidden = false;
    slot.dataset.progressType = progress.type;
    slot.dataset.progressAlign = align;

    if (progress.type === "text") {
      slot.textContent = label;
      return;
    }

    slot.setAttribute("role", "progressbar");
    slot.setAttribute("aria-valuemin", "1");
    slot.setAttribute("aria-valuemax", String(total));
    slot.setAttribute("aria-valuenow", String(current));
    slot.setAttribute("aria-label", label);

    if (progress.type === "dots") {
      const dots = this.document.createElement("div");
      dots.className = "pt-progress-dots";
      dots.setAttribute("aria-hidden", "true");
      for (let dotIndex = 0; dotIndex < total; dotIndex += 1) {
        const dot = this.document.createElement("span");
        dot.className = "pt-progress-dot";
        if (dotIndex < current) dot.classList.add("pt-progress-dot--complete");
        if (dotIndex === index) dot.classList.add("pt-progress-dot--current");
        dots.append(dot);
      }
      slot.append(dots);
      return;
    }

    const bar = this.document.createElement("div");
    bar.className = "pt-progress-bar";
    bar.setAttribute("aria-hidden", "true");
    for (let segmentIndex = 0; segmentIndex < total; segmentIndex += 1) {
      const segment = this.document.createElement("span");
      segment.className = "pt-progress-bar__segment";
      if (segmentIndex < current) segment.classList.add("pt-progress-bar__segment--complete");
      if (segmentIndex === index) segment.classList.add("pt-progress-bar__segment--current");
      bar.append(segment);
    }
    slot.append(bar);
  }

  _renderQuestion(step, form) {
    this.answers[step.id] ??= {};
    step.fields.forEach((field, fieldIndex) => {
      if (!Object.hasOwn(this.answers[step.id], field.name)) {
        this._setAnswer(step.id, field.name, clone({ value: field.defaultValue }).value, false);
      }
      const value = this.answers[step.id][field.name];
      const group = this.document.createElement(field.type === "text" ? "div" : "fieldset");
      group.className = "pt-field";
      group.dataset.fieldIndex = String(fieldIndex);

      if (field.type === "text") {
        const label = this.document.createElement("label");
        const input = this.document.createElement("input");
        input.id = `${this.uid}-${step.id}-${fieldIndex}`;
        input.name = field.name;
        input.type = "text";
        input.className = "pt-input";
        input.placeholder = field.placeholder;
        input.required = field.required;
        input.value = value ?? "";
        label.className = "pt-field-label";
        label.htmlFor = input.id;
        label.textContent = `${field.label}${field.required ? " *" : ""}`;
        input.addEventListener("input", () => {
          this._setAnswer(step.id, field.name, input.value, true);
          this._clearFieldError(group);
        });
        group.append(label, input);
      } else {
        if (field.type === "checkbox" && field.options.length === 0) {
          const choice = this._createChoice(
            field,
            step,
            fieldIndex,
            0,
            `${field.label}${field.required ? " *" : ""}`,
            true,
            Boolean(value),
            group
          );
          group.append(choice);
        } else {
          const legend = this.document.createElement("legend");
          legend.className = "pt-field-label";
          legend.textContent = `${field.label}${field.required ? " *" : ""}`;
          group.append(legend);
          field.options.forEach((option, optionIndex) => {
            const checked = field.type === "radio"
              ? valuesEqual(value, option.value)
              : Array.isArray(value) && value.some((item) => valuesEqual(item, option.value));
            group.append(this._createChoice(field, step, fieldIndex, optionIndex, option.label, option.value, checked, group));
          });
        }
      }

      if (field.description) {
        const description = this.document.createElement("div");
        description.className = "pt-field-description";
        description.textContent = field.description;
        group.append(description);
      }
      form.append(group);
    });
  }

  _createChoice(field, step, fieldIndex, optionIndex, labelText, optionValue, checked, group) {
    const choice = this.document.createElement("label");
    const input = this.document.createElement("input");
    const text = this.document.createElement("span");
    choice.className = "pt-choice";
    input.type = field.type;
    input.name = `${this.uid}-${step.id}-${field.name}`;
    input.dataset.optionIndex = String(optionIndex);
    input.required = field.required;
    input.checked = checked;
    input.disabled = field.options[optionIndex]?.disabled ?? false;
    text.textContent = labelText;
    input.addEventListener("change", () => {
      let answer;
      if (field.type === "radio") {
        answer = optionValue;
      } else if (field.options.length === 0) {
        answer = input.checked;
      } else {
        answer = [...group.querySelectorAll('input[type="checkbox"]:checked')]
          .map((element) => field.options[Number(element.dataset.optionIndex)].value);
      }
      this._setAnswer(step.id, field.name, answer, true);
      this._clearFieldError(group);
    });
    choice.append(input, text);
    return choice;
  }

  _renderActions(step, index) {
    const container = this.root.querySelector(".pt-actions");
    container.replaceChildren();
    const actions = step.actions ?? [
      { id: "skip", label: this.config.labels.skip, action: "dismiss", variant: "link" },
      ...(index > 0 ? [{ id: "back", label: this.config.labels.previous, action: "back", variant: "secondary" }] : []),
      {
        id: "continue",
        label: index === this.config.steps.length - 1 ? this.config.labels.finish : this.config.labels.next,
        action: index === this.config.steps.length - 1 ? "finish" : "next",
        variant: "primary"
      }
    ];

    for (const action of actions) {
      const button = this.document.createElement("button");
      button.type = "button";
      button.className = action.variant === "link"
        ? "pt-action pt-action--link"
        : `pt-action pt-action--${action.variant}`;
      if (action.action === "dismiss") button.classList.add("pt-action--dismiss");
      button.textContent = action.label || this._defaultActionLabel(action.action);
      button.dataset.tourAction = action.id;
      button.addEventListener("click", () => this._runAction(action));
      container.append(button);
    }
  }

  _defaultActionLabel(action) {
    if (action === "back") return this.config.labels.previous;
    if (action === "finish") return this.config.labels.finish;
    if (action === "dismiss") return this.config.labels.skip;
    return this.config.labels.next;
  }

  async _runAction(action) {
    const step = this.config.steps[this.currentIndex];
    this._emit("action", { action, step, answers: this.getAnswers() });
    if (action.action === "next") return this.next();
    if (action.action === "back") return this.previous();
    if (action.action === "finish") return this.complete();
    if (action.action === "dismiss") return this.dismiss(action.id || "dismissed");
    if (action.action === "goTo") {
      if (!this._validateCurrentStep()) return false;
      return this.goTo(action.targetStep);
    }
    if (action.action === "emit") {
      this._emit(action.event, { action, step, answers: this.getAnswers() });
      return true;
    }
    return false;
  }

  _setAnswer(stepId, fieldName, value, emit) {
    this.answers[stepId] ??= {};
    this.answers[stepId][fieldName] = clone({ value }).value;
    if (emit) this._emit("answer", { stepId, field: fieldName, value: clone({ value }).value, answers: this.getAnswers() });
  }

  _validateCurrentStep() {
    const step = this.config.steps[this.currentIndex];
    if (!step || step.type !== "question") return true;
    let firstInvalid = null;
    let message = this.config.labels.required;
    step.fields.forEach((field, index) => {
      const value = this.answers[step.id]?.[field.name];
      const missing = field.required && (
        value === null || value === undefined || value === ""
        || (typeof value === "string" && !value.trim())
        || (Array.isArray(value) && value.length === 0)
        || (field.type === "checkbox" && field.options.length === 0 && value !== true)
      );
      const group = this.root.querySelector(`[data-field-index="${index}"]`);
      group?.classList.toggle("pt-field--invalid", missing);
      for (const input of group?.querySelectorAll("input") ?? []) input.setAttribute("aria-invalid", String(missing));
      if (missing && !firstInvalid) {
        firstInvalid = group?.querySelector("input");
        message = field.validationMessage || this.config.labels.required;
      }
    });
    this.root.querySelector(".pt-error").textContent = firstInvalid ? message : "";
    if (firstInvalid) {
      firstInvalid.focus();
      this._emit("validationerror", { step, answers: this.getAnswers() });
      return false;
    }
    return true;
  }

  _clearFieldError(group) {
    group.classList.remove("pt-field--invalid");
    for (const input of group.querySelectorAll("input")) input.removeAttribute("aria-invalid");
    if (!this.root.querySelector(".pt-field--invalid")) this.root.querySelector(".pt-error").textContent = "";
  }

  _resolveNextStep(step) {
    if (typeof step.next === "string") return step.next;
    if (!Array.isArray(step.next)) return null;
    const rule = step.next.find((candidate) => !candidate.when || this._matchesCondition(candidate.when, step.id));
    return rule?.stepId ?? null;
  }

  async _settleTarget(target, runId) {
    if (typeof target.scrollIntoView !== "function") return;
    const rect = target.getBoundingClientRect();
    const fullyVisible = rect.top >= 0 && rect.left >= 0
      && rect.bottom <= this.window.innerHeight && rect.right <= this.window.innerWidth;
    if (fullyVisible) return;

    // Keep the previous (or not-yet-rendered) tooltip out of view while the
    // browser scrolls the target into its best possible visible position.
    this.root?.querySelector(".pt-popover")?.classList.add("pt-popover--hidden");

    const reducedMotion = this.window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center",
      inline: "center"
    });
    if (reducedMotion) {
      await new Promise((resolve) => {
        if (typeof this.window.requestAnimationFrame === "function") this.window.requestAnimationFrame(() => resolve());
        else this.window.setTimeout(resolve, 0);
      });
      return;
    }

    await new Promise((resolve) => {
      let settledTimer = null;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(settledTimer);
        clearTimeout(maxTimer);
        this.window.removeEventListener("scroll", onScroll, true);
        resolve();
      };
      const onScroll = () => {
        if (runId !== this.runId) return finish();
        clearTimeout(settledTimer);
        settledTimer = setTimeout(finish, 90);
      };
      this.window.addEventListener("scroll", onScroll, true);
      settledTimer = setTimeout(finish, 180);
      const maxTimer = setTimeout(finish, 700);
    });
  }

  _animatePopover(popover, previousRect) {
    if (!previousRect || typeof popover.animate !== "function") return;
    if (this.window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const nextRect = popover.getBoundingClientRect();
    if (!nextRect.width || !nextRect.height) return;
    const deltaX = previousRect.left - nextRect.left;
    const deltaY = previousRect.top - nextRect.top;
    const scaleX = clamp(previousRect.width / nextRect.width, 0.8, 1.25);
    const scaleY = clamp(previousRect.height / nextRect.height, 0.85, 1.15);
    const animation = popover.animate([
      {
        opacity: 0.76,
        transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
        transformOrigin: "top left"
      },
      { opacity: 1, transform: "translate(0, 0) scale(1)", transformOrigin: "top left" }
    ], {
      duration: 220,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)"
    });
    this.popoverAnimation = animation;
    animation.finished.catch(() => {}).then(() => {
      if (this.popoverAnimation === animation) this.popoverAnimation = null;
    });
  }

  _matchesCondition(condition, currentStepId) {
    const value = this.answers[condition.stepId ?? currentStepId]?.[condition.field];
    if (condition.operator === "equals") return valuesEqual(value, condition.value);
    if (condition.operator === "notEquals") return !valuesEqual(value, condition.value);
    if (condition.operator === "includes") {
      return Array.isArray(value) ? value.some((item) => valuesEqual(item, condition.value)) : String(value ?? "").includes(String(condition.value));
    }
    if (condition.operator === "exists") {
      const exists = value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
      return condition.value ? exists : !exists;
    }
    return false;
  }

  _position(step, target) {
    if (!this.root || !this.isActive) return;
    const viewportWidth = this.window.innerWidth;
    const viewportHeight = this.window.innerHeight;
    const spotlight = this.root.querySelector(".pt-spotlight");
    const blocker = this.root.querySelector(".pt-target-blocker");
    const popover = this.root.querySelector(".pt-popover");

    if (!target) {
      this._setPanelRect("top", 0, 0, viewportWidth, viewportHeight);
      for (const name of ["left", "right", "bottom"]) this._setPanelRect(name, 0, 0, 0, 0);
      spotlight.dataset.hasTarget = "false";
      this._setRect(spotlight, viewportWidth / 2, viewportHeight / 2, 0, 0);
      blocker.hidden = true;
      popover.style.left = `${Math.max(12, (viewportWidth - popover.offsetWidth) / 2)}px`;
      popover.style.top = `${Math.max(12, (viewportHeight - popover.offsetHeight) / 2)}px`;
      return;
    }

    const rect = target.getBoundingClientRect();
    const padding = step.padding;
    const left = clamp(rect.left - padding, 0, viewportWidth);
    const top = clamp(rect.top - padding, 0, viewportHeight);
    const right = clamp(rect.right + padding, 0, viewportWidth);
    const bottom = clamp(rect.bottom + padding, 0, viewportHeight);
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);
    this._setPanelRect("top", 0, 0, viewportWidth, top);
    this._setPanelRect("left", 0, top, left, height);
    this._setPanelRect("right", right, top, viewportWidth - right, height);
    this._setPanelRect("bottom", 0, bottom, viewportWidth, viewportHeight - bottom);
    this._setRect(spotlight, left, top, width, height);
    spotlight.dataset.hasTarget = "true";
    this._setRect(blocker, left, top, width, height);
    blocker.hidden = step.allowInteraction;

    const gap = 14;
    const margin = 8;
    const popoverWidth = popover.offsetWidth;
    const popoverHeight = popover.offsetHeight;
    let placement = step.placement;
    const spaces = { bottom: viewportHeight - bottom, top, right: viewportWidth - right, left };
    const requiredSpace = {
      bottom: popoverHeight + gap + margin,
      top: popoverHeight + gap + margin,
      right: popoverWidth + gap + margin,
      left: popoverWidth + gap + margin
    };
    const rankedPlacements = Object.keys(spaces).sort(
      (a, b) => (spaces[b] - requiredSpace[b]) - (spaces[a] - requiredSpace[a])
    );
    if (placement === "auto" || (placement !== "center" && spaces[placement] < requiredSpace[placement])) {
      placement = rankedPlacements[0];
    }

    let x = left + width / 2 - popoverWidth / 2;
    let y = bottom + gap;
    if (placement === "top") y = top - popoverHeight - gap;
    if (placement === "right") {
      x = right + gap;
      y = top + height / 2 - popoverHeight / 2;
    }
    if (placement === "left") {
      x = left - popoverWidth - gap;
      y = top + height / 2 - popoverHeight / 2;
    }
    if (placement === "center") {
      x = (viewportWidth - popoverWidth) / 2;
      y = (viewportHeight - popoverHeight) / 2;
    }
    popover.style.left = `${clamp(x, margin, viewportWidth - popoverWidth - margin)}px`;
    popover.style.top = `${clamp(y, margin, viewportHeight - popoverHeight - margin)}px`;
  }

  _setPanelRect(name, left, top, width, height) {
    this._setRect(this.root.querySelector(`[data-panel="${name}"]`), left, top, width, height);
  }

  _setRect(element, left, top, width, height) {
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.width = `${Math.max(0, width)}px`;
    element.style.height = `${Math.max(0, height)}px`;
  }

  _onKeyDown(event) {
    if (!this.isActive) return;
    const isFormControl = ["INPUT", "TEXTAREA", "SELECT"].includes(this.document.activeElement?.tagName)
      || this.document.activeElement?.isContentEditable;
    if (event.key === "Escape" && this.config.closeOnEscape) {
      event.preventDefault();
      this.dismiss("escape");
      return;
    }
    if (!isFormControl && event.key === "ArrowRight") {
      event.preventDefault();
      this.next();
    }
    if (!isFormControl && event.key === "ArrowLeft") {
      event.preventDefault();
      this.previous();
    }
    if (event.key === "Tab") {
      const focusable = [...this.root.querySelectorAll('button:not([hidden]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && this.document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && this.document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  _onScrollAttempt(event) {
    if (!this.isActive) return;
    const popover = this.root?.querySelector(".pt-popover");
    if (popover?.contains(event.target)) return;
    event.preventDefault();
  }

  _lockPageScroll() {
    if (this.scrollLocked) return;
    const element = this.document.documentElement;
    const lock = scrollLocks.get(this.document) ?? {
      count: 0,
      hadClass: element.classList.contains("pt-scroll-locked")
    };
    lock.count += 1;
    scrollLocks.set(this.document, lock);
    element.classList.add("pt-scroll-locked");
    this.scrollLocked = true;
  }

  _unlockPageScroll() {
    if (!this.scrollLocked) return;
    const lock = scrollLocks.get(this.document);
    if (lock) {
      lock.count -= 1;
      if (lock.count <= 0) {
        if (!lock.hadClass) this.document.documentElement.classList.remove("pt-scroll-locked");
        scrollLocks.delete(this.document);
      }
    }
    this.scrollLocked = false;
  }

  _onViewportChange() {
    if (!this.isActive || this.currentIndex < 0) return;
    this._position(this.config.steps[this.currentIndex], this.currentTarget);
  }

  _onTargetClick() {
    this.next();
  }

  _detachTargetListener() {
    this.currentTarget?.removeEventListener("click", this._onTargetClick);
  }

  _unmount() {
    this._detachTargetListener();
    this.popoverAnimation?.cancel();
    this.popoverAnimation = null;
    this.currentTarget = null;
    this.currentIndex = -1;
    this.document?.removeEventListener("keydown", this._onKeyDown, true);
    this.window?.removeEventListener("wheel", this._onScrollAttempt, true);
    this.window?.removeEventListener("touchmove", this._onScrollAttempt, true);
    this.window?.removeEventListener("resize", this._onViewportChange);
    this.window?.removeEventListener("scroll", this._onViewportChange, true);
    this._unlockPageScroll();
    this.root?.remove();
    this.root = null;
    if (this.restoreFocusTo?.isConnected && typeof this.restoreFocusTo.focus === "function") {
      this.restoreFocusTo.focus({ preventScroll: true });
    }
    this.restoreFocusTo = null;
  }

  _injectStyles() {
    if (this.document.querySelector("style[data-product-tour-styles]")) return;
    const style = this.document.createElement("style");
    style.dataset.productTourStyles = "";
    style.textContent = PRODUCT_TOUR_STYLES;
    this.document.head.append(style);
  }

  _getStorage() {
    if (this.runtime.storage) return this.runtime.storage;
    if (this.config.storage === "none") return null;
    return this.config.storage === "session" ? this.window?.sessionStorage : this.window?.localStorage;
  }

  _rememberCompletion() {
    if (!this.config.showOnce || this.config.storage === "none") return;
    try {
      this._getStorage()?.setItem(this.completionKey, "completed");
    } catch {
      // The tour still works when browser storage is unavailable.
    }
  }

  _emit(name, detail = {}) {
    const payload = { tour: this, ...detail };
    this.runtime.onEvent?.(name, payload);
    if (this.document && typeof this.window?.CustomEvent === "function") {
      this.document.dispatchEvent(new this.window.CustomEvent(`product-tour:${name}`, { detail: payload }));
    }
  }

  _assertBrowser() {
    if (!this.document?.body || !this.window) {
      throw new Error("[product-tour-js] start() requires a browser DOM.");
    }
  }
}
