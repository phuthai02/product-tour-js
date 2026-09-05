export type Placement = "auto" | "top" | "right" | "bottom" | "left" | "center";
export type StepType = "tooltip" | "modal" | "question";
export type FieldType = "text" | "radio" | "checkbox";
export type ActionType = "next" | "back" | "finish" | "dismiss" | "goTo" | "emit";
export type AnswerValue = string | number | boolean | null | Array<string | number | boolean>;
export type TourAnswers = Record<string, Record<string, AnswerValue>>;
export type ProgressType = "none" | "text" | "dots" | "bar";
export type ProgressPosition =
  | "top-left" | "top-center" | "top-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export interface ProgressConfig {
  type?: ProgressType;
  position?: ProgressPosition;
}

export interface TourOption {
  label?: string;
  value: string | number | boolean;
  disabled?: boolean;
}

export interface TourField {
  name: string;
  type?: FieldType;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<TourOption | string | number | boolean>;
  defaultValue?: AnswerValue;
  validationMessage?: string;
}

export interface TourAction {
  id?: string;
  label?: string;
  action: ActionType;
  variant?: "primary" | "secondary" | "link";
  targetStep?: string;
  event?: string;
}

export type TourCondition = {
  field: string;
  stepId?: string;
} & (
  | { equals: AnswerValue }
  | { notEquals: AnswerValue }
  | { includes: string | number | boolean }
  | { exists: boolean }
);

export interface TourNextRule {
  stepId: string;
  when?: TourCondition;
}

export interface TourStep {
  id?: string;
  type?: StepType;
  target?: string | null;
  title?: string;
  content?: string;
  placement?: Placement;
  allowInteraction?: boolean;
  nextOnTargetClick?: boolean;
  showCloseButton?: boolean;
  padding?: number;
  progress?: ProgressConfig;
  fields?: TourField[];
  actions?: TourAction[];
  next?: string | TourNextRule[];
}

export interface ProductTourConfig {
  id?: string;
  version?: string | number;
  autoStart?: boolean;
  showOnce?: boolean;
  markOnDismiss?: boolean;
  storage?: "local" | "session" | "none";
  storageKey?: string;
  startDelay?: number;
  targetTimeout?: number;
  onMissingTarget?: "skip" | "abort";
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  allowHtml?: boolean;
  progress?: ProgressConfig;
  labels?: Partial<{
    next: string;
    previous: string;
    finish: string;
    skip: string;
    close: string;
    progress: string;
    required: string;
  }>;
  theme?: Partial<{
    accentColor: string;
    overlayColor: string;
    borderRadius: string;
    zIndex: number;
  }>;
  steps: TourStep[];
}

export interface PageMatch {
  path?: string;
  mode?: "exact" | "prefix" | "glob";
  hash?: string;
  query?: Record<string, string | number | boolean>;
}

export interface ProductTourPage extends Omit<ProductTourConfig, "id"> {
  id: string;
  match: string | PageMatch;
  enabled?: boolean;
}

export interface ProductTourManifest extends Omit<ProductTourConfig, "steps"> {
  watchRoutes?: boolean;
  include?: Array<string | URL>;
  pages?: ProductTourPage[];
}

export interface ResolvedProductTourManifest extends ProductTourManifest {
  pages: ProductTourPage[];
}

export type ProductTourManifestSource = ProductTourManifest | ProductTourPage | string | URL;

export interface RuntimeOptions {
  autoStart?: boolean;
  fetch?: typeof globalThis.fetch;
  signal?: AbortSignal;
  baseUrl?: string | URL;
  document?: Document;
  window?: Window & typeof globalThis;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  initialAnswers?: TourAnswers;
  onEvent?: (name: string, detail: Record<string, unknown>) => void;
  onComplete?: (answers: TourAnswers, tour: ProductTour, pageId?: string) => void;
  watchRoutes?: boolean;
  onPageChange?: (pageId: string | null, tour: ProductTour | null, manager: ProductTourManager) => void;
  onError?: (error: Error, manager: ProductTourManager) => void;
}

export declare class ProductTour {
  constructor(config: ProductTourConfig, runtime?: RuntimeOptions);
  readonly config: Required<ProductTourConfig>;
  readonly completionKey: string;
  readonly isActive: boolean;
  readonly state: "ready" | "active" | "completed" | "dismissed" | "destroyed";
  readonly currentIndex: number;
  isCompleted(): boolean;
  getAnswers(): TourAnswers;
  getAnswer(stepId: string, fieldName: string): AnswerValue | undefined;
  setAnswer(stepId: string, fieldName: string, value: AnswerValue): this;
  reset(options?: { clearAnswers?: boolean }): this;
  start(options?: { force?: boolean }): Promise<boolean>;
  next(): Promise<boolean>;
  previous(): Promise<boolean>;
  goTo(step: number | string, options?: { recordHistory?: boolean }): Promise<boolean>;
  complete(options?: { validate?: boolean }): boolean;
  dismiss(reason?: string): void;
  stop(reason?: string): void;
  destroy(): void;
}

export declare class ProductTourManager {
  constructor(manifest: ResolvedProductTourManifest, runtime?: RuntimeOptions);
  readonly manifest: ResolvedProductTourManifest;
  readonly activePageId: string | null;
  readonly activeTour: ProductTour | null;
  readonly state: "ready" | "active" | "destroyed";
  findPage(location?: Location | URL | string): { id: string } | null;
  getTour(pageId: string): ProductTour;
  start(options?: { force?: boolean; watchRoutes?: boolean }): Promise<ProductTour | null>;
  refresh(options?: { force?: boolean; location?: Location | URL | string }): Promise<ProductTour | null>;
  startPage(pageId: string, options?: { force?: boolean }): Promise<ProductTour>;
  reset(pageId?: string): this;
  stop(): void;
  destroy(): void;
}

export declare function defineTourConfig(config: ProductTourConfig): Required<ProductTourConfig>;
export declare function loadTourConfig(
  source?: ProductTourConfig | string | URL,
  options?: Pick<RuntimeOptions, "fetch" | "signal">
): Promise<Required<ProductTourConfig>>;
export declare function defineTourManifest(config: ResolvedProductTourManifest): ResolvedProductTourManifest;
export declare function loadTourManifest(
  source?: ProductTourManifestSource,
  options?: Pick<RuntimeOptions, "fetch" | "signal" | "baseUrl">
): Promise<ResolvedProductTourManifest>;
export declare function initProductTour(
  source?: ProductTourConfig | string | URL,
  options?: RuntimeOptions
): Promise<ProductTour>;
export declare function initProductTours(
  source?: ProductTourManifestSource,
  options?: RuntimeOptions
): Promise<ProductTourManager>;
export default initProductTour;
