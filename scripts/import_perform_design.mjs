/** The supplied HTML is the source of truth for the app's visual primitives. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import postcss from '../apps/web/node_modules/postcss/lib/postcss.mjs';

const file = 'PERFORMplus_MemberListApp_Member360_v14.html';
const html = fs.readFileSync(file, 'utf8');
const source = postcss.parse(html.match(/<style>([\s\S]*?)<\/style>/)[1]);
const declaration = (selector, property) => {
  let value;
  source.walkRules(rule => { if (rule.selectors.includes(selector)) rule.walkDecls(property, decl => { value = decl.value; }); });
  if (!value) throw new Error(`Missing reference property: ${selector} ${property}`);
  return value;
};
const tokens = {
  '--font-product': declaration('body', 'font-family'),
  '--text-body': declaration('body', 'font-size'),
  '--body-leading': declaration('body', 'line-height'),
  '--text-page': declaration('h1', 'font-size'),
  '--text-heading': declaration('h2', 'font-size'),
  '--text-section': declaration('h3', 'font-size'),
  '--text-metric': declaration('.kpi .v', 'font-size'),
  '--text-label': declaration('.f label', 'font-size'),
  '--text-control': declaration('.btn', 'font-size'),
  '--text-muted-size': declaration('.muted', 'font-size'),
  '--text-meta': declaration('.kpi .d', 'font-size'),
  '--control-height': declaration('.btn', 'height'),
  '--control-radius': declaration('.btn', 'border-radius'),
  '--control-padding': declaration('.btn', 'padding'),
  '--panel-radius': declaration('.card', 'border-radius'),
  '--panel-padding': declaration('.card', 'padding'),
  '--section-gap': declaration('.card', 'margin-bottom'),
  '--metric-gap': declaration('.kpis', 'gap'),
  '--metric-height': declaration('.kpi', 'min-height'),
  '--metric-margin': declaration('.kpi .v', 'margin'),
  '--tab-padding': declaration('.mtab', 'padding'),
  '--canvas-space': declaration('main', 'padding'),
  '--shell-nav-height': declaration('nav', 'min-height'),
  '--canvas-max-width': declaration('main', 'max-width'),
  '--table-cell-padding': declaration('td', 'padding'),
  '--table-font-size': declaration('table', 'font-size'),
  '--table-heading': declaration('th', 'background'),
  '--table-stripe': 'var(--rowalt)',
  '--reference-focus': declaration('details summary:focus-visible', 'outline'),
};
const aliases = {
  ':root': ':root', '*': '*', html: 'html', body: 'body', main: '.page-canvas',
  h1: 'h1', h2: 'h2', h3: 'h3', 'h3:first-child': 'h3:first-child',
  table: 'table', th: 'th', td: 'td', 'tbody tr:nth-child(even)': 'tbody tr:nth-child(even)', 'tbody tr:hover': 'tbody tr:hover',
  'button:focus-visible': 'button:focus-visible', 'select:focus-visible': 'select:focus-visible', 'a:focus-visible': 'a:focus-visible', '[tabindex]:focus-visible': '[tabindex]:focus-visible',
  '.top': '.topbar', 'nav': '.workspace-nav', 'nav span': '.workspace-nav-link', 'nav .on': '.workspace-nav-link[aria-current="page"]',
  '.card': '.ct-card', '.muted': '.ct-muted',
  '.btn': '[data-slot="button"]:where(:not([data-variant="ghost"]):not([data-variant="link"]))',
  '.btn.alt': '[data-slot="button"][data-variant="outline"], [data-slot="button"][data-variant="secondary"]',
  '.f select': 'select',
  '.kpis': '.ct-metric-grid', '.kpi': '.ct-metric', '.kpi .l': '.ct-metric-label', '.kpi .v': '.ct-metric-value', '.kpi .d': '.ct-metric-note',
  '.mtabs': '.ct-tabs', '.mtab': '.ct-tabs > [role="tab"]', '.mtab.on': '.ct-tabs > [role="tab"][aria-selected="true"], .ct-tabs > [role="tab"][data-state="active"]',
  '.pill': '.ct-badge', '.r': '.ct-badge-r', '.y': '.ct-badge-y', '.g': '.ct-badge-g', '.b': '.ct-badge-b', '.a': '.ct-badge-a', '.o': '.ct-badge-o',
  '.call': '.ct-callout', '.call.warn': '.ct-callout-warn',
  'details summary:focus-visible': 'summary:focus-visible',
};
const global = new Set([':root', '*', 'html', 'body', 'main', 'h1', 'h2', 'h3', 'h3:first-child', 'table', 'th', 'td', 'tbody tr:nth-child(even)', 'tbody tr:hover', 'button:focus-visible', 'select:focus-visible', 'a:focus-visible', '[tabindex]:focus-visible']);
const output = source.clone();
output.walkRules(rule => {
  rule.selectors = rule.selectors.flatMap(selector => {
    const scoped = '.member360-workspace ' + selector;
    if (global.has(selector)) return [aliases[selector]];
    return aliases[selector] ? [aliases[selector], scoped] : [scoped];
  });
});
const root = postcss.rule({ selector: ':root' });
Object.entries(tokens).forEach(([prop, value]) => root.append({prop,value}));
output.prepend(root);
const hash = crypto.createHash('sha256').update(html).digest('hex');
fs.writeFileSync('apps/web/src/app/perform-design.css', `/* Generated directly from ${file}\n * SHA-256 ${hash}\n * Regenerate: node scripts/import_perform_design.mjs\n * Shared across every route; only prototype-specific selectors retain a Member 360 scope. */\n${output.toString().trimEnd()}\n`);
console.log(`Imported ${Object.keys(tokens).length} design tokens and all reference CSS rules into the shared application stylesheet.`);
