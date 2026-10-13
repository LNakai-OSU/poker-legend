/**
 * The look of the character and event tabs.
 *
 * The same palette and controls as the map editor — dark, compact, gold for
 * what is selected — written as a stylesheet rather than inline styles because
 * these tabs need a phone layout, and a media query cannot be inline.
 */

const COLOR = {
  page: '#14141f',
  bar: '#0e1018',
  panel: '#171b26',
  control: '#1a1f2b',
  border: '#2c3d35',
  text: '#e8e8f0',
  muted: '#8f8fa6',
  gold: '#f2c14e',
  green: '#3a9d5c',
  red: '#e05a5a',
  pink: '#e8b0b0',
}

export const EDITOR_CSS = `
.ed-page { position: fixed; inset: 0; background: ${COLOR.page}; color: ${COLOR.text};
  font-family: system-ui, sans-serif; overflow: auto; z-index: 200; font-size: 13px; }
.ed-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; padding: 10px 16px;
  border-bottom: 1px solid ${COLOR.border}; background: ${COLOR.bar}; position: sticky; top: 0; z-index: 2; }
.ed-tabs { display: flex; gap: 4px; }
.ed-tab { background: transparent; color: ${COLOR.muted}; border: 1px solid transparent; border-radius: 6px;
  padding: 5px 10px; font-size: 13px; font-weight: 600; min-height: 32px; cursor: pointer; }
.ed-tab[aria-selected="true"] { color: ${COLOR.gold}; border-color: ${COLOR.gold}; background: ${COLOR.control}; }
.ed-btn, .ed-input, .ed-select { background: ${COLOR.control}; color: ${COLOR.text}; border: 1px solid ${COLOR.border};
  border-radius: 6px; padding: 5px 9px; font-size: 12px; min-height: 32px; font-family: inherit; box-sizing: border-box; }
.ed-btn { cursor: pointer; white-space: nowrap; }
.ed-btn:disabled { opacity: 0.45; cursor: default; }
.ed-btn.primary:not(:disabled) { border-color: ${COLOR.green}; color: #c8f0d4; }
.ed-btn.small { min-height: 26px; padding: 2px 8px; }
.ed-btn.icon { min-height: 28px; min-width: 28px; padding: 0 6px; color: ${COLOR.muted}; }
.ed-btn.icon:hover:not(:disabled) { color: ${COLOR.text}; }
.ed-btn.danger:hover:not(:disabled) { color: ${COLOR.red}; border-color: ${COLOR.red}; }
.ed-input { width: 100%; min-width: 0; }
.ed-input.num { width: 64px; }
.ed-input:focus, .ed-select:focus, .ed-btn:focus-visible { outline: 1px solid ${COLOR.gold}; outline-offset: 0; }
textarea.ed-input { resize: vertical; line-height: 1.4; }
textarea.ed-input.line { resize: none; overflow: hidden; line-height: 1.45; padding-top: 6px; padding-bottom: 5px; }
.ed-select { max-width: 100%; }
.ed-body { display: flex; gap: 16px; padding: 16px; align-items: flex-start; }
.ed-list { flex: 0 0 260px; position: sticky; top: 70px; max-height: calc(100vh - 90px); display: flex;
  flex-direction: column; gap: 8px; min-width: 0; }
.ed-list-items { overflow: auto; display: grid; gap: 4px; padding-right: 2px; }
.ed-item { display: flex; gap: 9px; align-items: center; text-align: left; width: 100%; background: ${COLOR.control};
  color: ${COLOR.text}; border: 1px solid ${COLOR.border}; border-radius: 6px; padding: 6px 8px; cursor: pointer;
  font-family: inherit; font-size: 12px; }
.ed-item[aria-selected="true"] { border-color: ${COLOR.gold}; box-shadow: 0 0 0 1px rgba(242,193,78,0.35); }
.ed-item .sub { display: block; color: ${COLOR.muted}; font-size: 11px; line-height: 1.35; margin-top: 1px; }
.ed-item .clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ed-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.ed-detail { flex: 1 1 auto; min-width: 0; display: grid; gap: 12px; max-width: 980px; }
.ed-section { background: ${COLOR.panel}; border: 1px solid ${COLOR.border}; border-radius: 8px; padding: 12px; min-width: 0; }
.ed-section > header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.ed-section > header h3 { font-size: 13px; margin: 0; }
.ed-section > header .hint { color: ${COLOR.muted}; font-size: 12px; }
.ed-section > header .grow { flex: 1; }
.ed-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px 14px; }
.ed-field { display: grid; gap: 4px; min-width: 0; align-content: start; }
/* A select is as wide as its longest option unless something says otherwise;
   on a phone that pushed whole cards off the side of the screen. */
.ed-detail div, .ed-detail .ed-row { min-width: 0; }
.ed-field > span { color: ${COLOR.muted}; font-size: 11px; }
.ed-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; min-width: 0; }
.ed-row > .ed-input { flex: 1 1 160px; width: auto; }
.ed-row > .ed-input.num { flex: none; }
.ed-lines { display: grid; gap: 4px; }
.ed-line { display: flex; gap: 4px; align-items: center; }
.ed-line .ed-input { flex: 1; }
.ed-card { border: 1px solid ${COLOR.border}; border-radius: 7px; padding: 8px; background: ${COLOR.bar}; display: grid; gap: 8px; min-width: 0; }
.ed-card > .head { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.ed-card > .head .say { color: ${COLOR.muted}; font-size: 12px; flex: 1 1 200px; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ed-step { color: ${COLOR.gold}; font-weight: 700; font-size: 12px; min-width: 18px; text-align: right; }
.ed-muted { color: ${COLOR.muted}; }
.ed-small { font-size: 12px; }
.ed-problems { margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.6; }
.ed-problems li { color: ${COLOR.pink}; }
.ed-problems li.ok { color: ${COLOR.green}; list-style: none; margin-left: -18px; }
.ed-count { font-weight: 700; }
.ed-script { margin: 0; padding: 0; list-style: none; display: grid; gap: 3px; font-size: 13px; line-height: 1.45; }
.ed-script li:first-child { color: ${COLOR.gold}; }
.ed-script li + li { padding-left: 14px; }
.ed-script li.more { padding-left: 34px; color: #cfcfe0; }
.ed-chip { display: inline-flex; align-items: center; gap: 4px; border: 1px solid ${COLOR.border}; border-radius: 999px;
  padding: 2px 8px; font-size: 11px; color: ${COLOR.muted}; background: ${COLOR.bar}; }
.ed-toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }
.ed-periods { display: inline-flex; gap: 3px; flex-wrap: wrap; }
.ed-periods button[aria-pressed="true"] { border-color: ${COLOR.gold}; color: ${COLOR.gold}; }
.ed-avatar { image-rendering: pixelated; border-radius: 8px; border: 1px solid ${COLOR.border}; background: #0b0b12; flex: none; }
.ed-result { font-size: 12px; line-height: 1.5; }
.ed-colors { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.ed-colors label { display: inline-flex; gap: 4px; align-items: center; color: ${COLOR.muted}; font-size: 11px; }
.ed-colors input[type=color] { width: 32px; height: 26px; padding: 0; border: 1px solid ${COLOR.border}; background: none; border-radius: 4px; }
@media (max-width: 760px) {
  .ed-bar { padding: 8px 10px; gap: 6px; }
  .ed-body { flex-direction: column; padding: 10px; gap: 10px; align-items: stretch; }
  .ed-list { position: static; flex: none; width: 100%; max-height: none; }
  .ed-list-items { max-height: 210px; }
  .ed-detail { width: 100%; }
  .ed-grid { grid-template-columns: 1fr; }
  .ed-section { padding: 10px; }
  .ed-count-label { display: none; }
}
`
