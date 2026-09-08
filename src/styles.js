export const PRODUCT_TOUR_STYLES = `
.pt-root, .pt-root * { box-sizing: border-box; }
.pt-scroll-locked, .pt-scroll-locked body { overflow: hidden !important; overscroll-behavior: none; }
.pt-root { --pt-accent: #2563eb; --pt-overlay: rgba(15,23,42,.68); --pt-radius: 12px; --pt-z: 2147483000; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.pt-backdrop { position: fixed; background: transparent; z-index: var(--pt-z); pointer-events: auto; }
.pt-target-blocker { position: fixed; z-index: calc(var(--pt-z) + 1); background: transparent; }
.pt-spotlight { position: fixed; z-index: calc(var(--pt-z) + 1); pointer-events: none; border: 2px solid color-mix(in srgb, var(--pt-accent) 72%, white); border-radius: var(--pt-radius); background: transparent; box-shadow: 0 0 0 100vmax var(--pt-overlay), 0 0 0 3px color-mix(in srgb, var(--pt-accent) 20%, transparent); transition: top .22s cubic-bezier(.22,1,.36,1), left .22s cubic-bezier(.22,1,.36,1), width .22s cubic-bezier(.22,1,.36,1), height .22s cubic-bezier(.22,1,.36,1), border-color .12s ease; }
.pt-spotlight[data-has-target="false"] { border-color: transparent; border-radius: 999px; background: var(--pt-overlay); box-shadow: 0 0 0 100vmax var(--pt-overlay); }
.pt-popover { position: fixed; z-index: calc(var(--pt-z) + 2); width: min(360px, calc(100vw - 24px)); max-height: min(640px, calc(100vh - 24px)); overflow: auto; padding: 20px; color: #172033; background: #fff; border: 1px solid rgba(15,23,42,.10); border-radius: var(--pt-radius); box-shadow: 0 18px 50px rgba(15,23,42,.24); outline: none; }
.pt-popover--hidden { visibility: hidden; }
.pt-root[data-step-type="modal"] .pt-popover { width: min(480px, calc(100vw - 24px)); padding: 26px; }
.pt-root[data-step-type="question"] .pt-popover { width: min(540px, calc(100vw - 24px)); padding: 26px; }
.pt-root[data-step-type="modal"] .pt-popover,
.pt-root[data-step-type="question"] .pt-popover { scrollbar-width: none; -ms-overflow-style: none; }
.pt-root[data-step-type="modal"] .pt-popover::-webkit-scrollbar,
.pt-root[data-step-type="question"] .pt-popover::-webkit-scrollbar { display: none; width: 0; height: 0; }
.pt-title { margin: 0 34px 8px 0; font-size: 18px; line-height: 1.35; font-weight: 700; }
.pt-content { margin: 0; color: #475569; font-size: 14px; line-height: 1.6; }
.pt-content:empty, .pt-title:empty { display: none; }
.pt-close { position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; padding: 0; border: 0; border-radius: 8px; color: #64748b; background: transparent; font-size: 23px; line-height: 1; cursor: pointer; }
.pt-close:hover, .pt-close:focus-visible { color: #0f172a; background: #f1f5f9; }
.pt-form { display: grid; gap: 18px; margin-top: 20px; }
.pt-form[hidden] { display: none; }
.pt-field { display: grid; min-inline-size: 0; margin: 0; padding: 0; border: 0; gap: 8px; }
.pt-field-label { padding: 0; color: #1e293b; font-size: 14px; line-height: 1.4; font-weight: 700; }
.pt-field-description { color: #64748b; font-size: 12px; line-height: 1.45; }
.pt-input { width: 100%; min-height: 42px; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 9px; color: #0f172a; background: #fff; font: inherit; font-size: 14px; outline: none; }
.pt-input:focus { border-color: var(--pt-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--pt-accent) 16%, transparent); }
.pt-choice { display: flex; align-items: flex-start; gap: 9px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 9px; color: #334155; background: #fff; font-size: 14px; line-height: 1.4; cursor: pointer; }
.pt-choice:hover { border-color: #cbd5e1; background: #f8fafc; }
.pt-choice:has(input:checked) { border-color: var(--pt-accent); background: color-mix(in srgb, var(--pt-accent) 7%, white); }
.pt-choice input { flex: 0 0 auto; width: 16px; height: 16px; margin: 2px 0 0; accent-color: var(--pt-accent); }
.pt-choice:has(input:disabled) { opacity: .55; cursor: not-allowed; }
.pt-field--invalid .pt-input, .pt-field--invalid .pt-choice { border-color: #dc2626; }
.pt-error { margin-top: 10px; color: #b91c1c; font-size: 12px; line-height: 1.45; }
.pt-error:empty { display: none; }
.pt-progress { display: flex; width: 100%; align-items: center; color: #64748b; font-size: 12px; line-height: 1; white-space: nowrap; }
.pt-progress[hidden] { display: none; }
.pt-progress--top { width: 100%; margin: 0 0 15px; }
.pt-progress--bottom { margin-top: 18px; }
.pt-progress[data-progress-align="left"] { justify-content: flex-start; text-align: left; }
.pt-progress[data-progress-align="center"] { justify-content: center; text-align: center; }
.pt-progress[data-progress-align="right"] { justify-content: flex-end; text-align: right; }
.pt-progress-dots { display: flex; flex-wrap: wrap; align-items: center; justify-content: inherit; gap: 7px; }
.pt-progress-dot { width: 7px; height: 7px; border-radius: 999px; background: #cbd5e1; transition: background .16s ease; }
.pt-progress-dot--complete { background: color-mix(in srgb, var(--pt-accent) 48%, #cbd5e1); }
.pt-progress-dot--current { background: var(--pt-accent); }
.pt-progress-bar { display: flex; width: min(180px, 55%); height: 3px; gap: 4px; }
.pt-progress-bar__segment { flex: 1 1 0; min-width: 8px; height: 100%; border-radius: 999px; background: #e2e8f0; transition: background .18s ease; }
.pt-progress-bar__segment--complete { background: color-mix(in srgb, var(--pt-accent) 48%, #cbd5e1); }
.pt-progress-bar__segment--current { background: var(--pt-accent); }
.pt-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.pt-actions { display: flex; width: 100%; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.pt-action--dismiss { margin-right: auto; }
.pt-action { min-height: 36px; padding: 7px 13px; border: 1px solid #cbd5e1; border-radius: 8px; color: #334155; background: #fff; font: inherit; font-size: 13px; font-weight: 650; cursor: pointer; }
.pt-action:hover, .pt-action:focus-visible { background: #f8fafc; border-color: #94a3b8; }
.pt-action--primary { color: #fff; background: var(--pt-accent); border-color: var(--pt-accent); }
.pt-action--primary:hover, .pt-action--primary:focus-visible { filter: brightness(.94); background: var(--pt-accent); border-color: var(--pt-accent); }
.pt-action--link { padding-inline: 4px; border-color: transparent; color: #64748b; background: transparent; text-decoration: underline; text-underline-offset: 2px; }
.pt-action--link:hover, .pt-action--link:focus-visible { color: #0f172a; background: transparent; border-color: transparent; }
@media (max-width: 520px) { .pt-footer { align-items: flex-start; flex-direction: column; } .pt-actions { width: 100%; justify-content: flex-end; } }
@media (prefers-reduced-motion: reduce) { .pt-backdrop, .pt-spotlight, .pt-popover > *, .pt-progress-dot, .pt-progress-bar__segment { transition: none; } }
`;
