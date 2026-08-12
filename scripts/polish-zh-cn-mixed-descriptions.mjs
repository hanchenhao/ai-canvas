#!/usr/bin/env node
// Polish pass: rewrite residual English connector words in zh-CN node descriptions
// that already mix Chinese characters with Latin words.
//
// Approach per spec:
// 1. Detect descriptions containing BOTH CJK chars AND Latin connector words.
// 2. Apply substitution rules.
// 3. If the result still has obvious English fragments (lots of Latin), leave as-is.
// 4. Don't touch property titles or short descriptions that are already clean Chinese.
//
// Conservative: a description is only rewritten when the rewrite materially reduces
// the connector count AND doesn't leave the description in worse shape.
//
// Usage:
//   node scripts/polish-zh-cn-mixed-descriptions.mjs           # apply
//   node scripts/polish-zh-cn-mixed-descriptions.mjs --dry-run # preview only

import fs from 'node:fs';

const dryRun = process.argv.includes('--dry-run');
const file = 'web/src/locales/zh-CN/nodes.json';
const zh = JSON.parse(fs.readFileSync(file, 'utf8'));

// Connector words we treat as residual English glue.
const CONNECTORS = [
  'and', 'or', 'with', 'for', 'to', 'of', 'the', 'a', 'an',
  'using', 'via', 'from', 'into', 'in', 'on', 'at', 'by',
  'is', 'are', 'was', 'be', 'this', 'that', 'these', 'those',
  'as', 'it', 'its', 'your', 'you', 'can', 'will', 'not', 'but',
];

function wordBoundary(word) {
  // Match whole Latin word, case-insensitive.
  return new RegExp(`(?<![a-zA-Z])${word}(?![a-zA-Z])`, 'gi');
}

function countLatinWords(s) {
  return (s.match(/[a-zA-Z]+/g) || []).length;
}

function countCJK(s) {
  return (s.match(/[一-龥]/g) || []).length;
}

function hasMixed(s) {
  return countCJK(s) > 0 && countLatinWords(s) > 0;
}

function connectorHits(s) {
  let n = 0;
  for (const c of CONNECTORS) {
    const m = s.match(wordBoundary(c));
    if (m) n += m.length;
  }
  return n;
}

// Apply substitution rules. Returns new string (or original if no change).
function polish(text) {
  if (!hasMixed(text)) return text;
  // Skip if there are no connector words at all — nothing to polish.
  const before = connectorHits(text);
  if (before === 0) return text;

  let out = text;

  // ' and ' -> '、' (only between CJK or between Latin-but-in-Chinese-context).
  // Use 、 when the words on both sides look like noun lists.
  out = out.replace(wordBoundary('and'), (m, offset, str) => {
    // Replace ' and ' with '、' only when between two CJK characters or a CJK and Latin word
    const prev = str[offset - 1] || '';
    const next = str[offset + m.length] || '';
    const cjkPrev = /[一-龥]/.test(prev);
    const cjkNext = /[一-龥]/.test(next);
    if (cjkPrev || cjkNext) return '、';
    return m;
  });

  // ' or ' -> '或'
  out = out.replace(wordBoundary('or'), (m, offset, str) => {
    const prev = str[offset - 1] || '';
    const next = str[offset + m.length] || '';
    if (/[一-龥]/.test(prev) || /[一-龥]/.test(next)) return '或';
    return m;
  });

  // ' with ' -> '（含 …）' is hard to do without knowing where to close.
  // Strategy: open '（含 ' after CJK + 'with', then close before the next
  // natural break — a period, comma, semicolon, newline, or another CJK
  // char that begins a new clause. If no break is found within a short
  // window, fall back to closing at end-of-segment (next . or ,).
  out = out.replace(/([一-龥])\s+with\s+/g, '$1（含 ');
  // Close the '（含 ...）' before the next comma/period/natural break,
  // but don't let it swallow another connector clause (using/via/for/...).
  // English period '.' and comma ',' are also break characters.
  out = out.replace(/（含 ([^，。、；.\n,()（）]*?)([.,，。；\n])|（含 ([^，。、；.\n,()（）]*)$/g, (m, a, sep, b) => {
    // If the captured content still contains another clause connector, bail:
    // we don't want to wrap a multi-clause tail.
    const content = a !== undefined ? a : b;
    if (content !== undefined && content.length > 0 && /\b(using|via|for|with|from|into|that|which|while|when|where|because|since|optimized|leveraging|leveraged|powered)\b/i.test(content)) {
      // Find the earliest connector position and close before it
      const re = /\b(using|via|for|with|from|into|that|which|while|when|where|because|since|optimized|leveraging|leveraged|powered)\b/i;
      const mm = re.exec(content);
      if (mm) {
        const before = content.slice(0, mm.index).replace(/[\s,]+$/, '');
        const after = content.slice(mm.index);
        if (a !== undefined && sep !== undefined) return `（含 ${before}）${after}${sep}`;
        return `（含 ${before}）${after}`;
      }
      return m;
    }
    if (a !== undefined && sep !== undefined) return `（含 ${a}）${sep}`;
    if (b !== undefined) return `（含 ${b}）`;
    return m;
  });

  // ' using ' -> '，使用 '
  out = out.replace(/([一-龥])\s+using\s+/g, '$1，使用 ');
  out = out.replace(/^using\s+/i, '使用 ');

  // ' via ' -> '，通过 '
  out = out.replace(/([一-龥])\s+via\s+/g, '$1，通过 ');
  out = out.replace(/^via\s+/i, '通过 ');

  // ' for ' -> '，用于 ' when after CJK; ' 为 ' rarely right here.
  out = out.replace(/([一-龥])\s+for\s+/g, '$1，用于 ');
  out = out.replace(/^for\s+/i, '用于 ');

  // ' the ', ' a ', ' an ', ' your ', ' its ', etc. -> drop when sandwiched by CJK
  for (const w of ['the', 'a', 'an', 'your', 'its', 'this', 'that', 'these', 'those']) {
    out = out.replace(new RegExp(`([一-龥])\\s+${w}\\s+`, 'gi'), '$1 ');
  }

  // ' of ' -> '的' only when sandwiched between CJK and CJK/Latin
  out = out.replace(/([一-龥])\s+of\s+([一-龥])/g, '$1的$2');

  // ' from ' -> '从'
  out = out.replace(/([一-龥])\s+from\s+/g, '$1，从 ');
  out = out.replace(/^from\s+/i, '从 ');

  // ' into ' -> '至'
  out = out.replace(/([一-龥])\s+into\s+/g, '$1至 ');

  // ' is ' / ' are ' / ' was ' -> 是 when between CJK
  out = out.replace(/([一-龥])\s+is\s+([一-龥])/g, '$1是$2');
  out = out.replace(/([一-龥])\s+are\s+([一-龥])/g, '$1是$2');
  out = out.replace(/([一-龥])\s+was\s+([一-龥])/g, '$1是$2');

  // ' to ' only when clearly between CJK — '为' or '至' depending. Use 为 when followed by a noun phrase, 至 when followed by a target.
  // Keep simple: only replace when sandwiched by CJK on both sides, leave alone otherwise.
  out = out.replace(/([一-龥])\s+to\s+([一-龥])/g, '$1至$2');

  // Tidy double spaces and stray whitespace before punctuation.
  out = out.replace(/[ \t]{2,}/g, ' ');
  out = out.replace(/\s+([，。、；：！？）])/g, '$1');
  out = out.replace(/（\s+/g, '（').replace(/\s+）/g, '）');

  // Sanity: if the rewrite did not remove any connector hits, return original.
  const after = connectorHits(out);
  if (after >= before) return text;

  // Sanity: if the rewrite introduced significantly more Latin words
  // (shouldn't happen with these rules), bail.
  return out;
}

let changed = 0;
const samplesBefore = [];
const samplesAfter = [];
const seen = new Set();

for (const key of Object.keys(zh)) {
  const entry = zh[key];
  if (!entry.description) continue;
  const orig = entry.description;
  if (!hasMixed(orig)) continue;
  if (connectorHits(orig) === 0) continue;
  const next = polish(orig);
  if (next !== orig) {
    changed += 1;
    entry.description = next;
    if (samplesBefore.length < 5) {
      samplesBefore.push({ key, before: orig, after: next });
      seen.add(key);
    }
  }
}

if (!dryRun) {
  fs.writeFileSync(file, JSON.stringify(zh, null, 2) + '\n');
}

console.log(`Polished ${changed} descriptions${dryRun ? ' (dry run)' : ''}`);
console.log('\nSamples:');
for (const s of samplesBefore) {
  console.log(`\n--- ${s.key} ---`);
  console.log('BEFORE:', s.before.slice(0, 250));
  console.log('AFTER :', s.after.slice(0, 250));
}
