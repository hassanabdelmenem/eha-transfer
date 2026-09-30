// Writes the Arabic review sheet a clinician signs off before a pilot:
// docs/i18n/arabic-review.csv with key, English, Arabic draft, and empty
// columns for the reviewer's correction and initials. UTF-8 with a BOM so Excel
// opens the Arabic correctly.
//
//   npm run i18n:sheet
import { mkdirSync, writeFileSync } from 'node:fs';
import { en } from '../src/i18n/en';
import { ar } from '../src/i18n/ar';

type Tree = { [k: string]: string | Tree };
type Plural = { [form: string]: string };
const isPlural = (v: unknown): v is Plural => typeof v === 'object' && v !== null && 'other' in v;
const walk = (o: Tree, p = ''): Array<[string, string | Plural]> =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'string' || isPlural(v) ? [[`${p}${k}`, v] as [string, string | Plural]] : walk(v, `${p}${k}.`));

// A plural gets one row per Arabic form (zero, one, two, few, many, other: the
// reviewer checks each), next to the English form that applies.
const ARABIC_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];
const arabic = new Map(walk(ar as unknown as Tree));
const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
const rows = [['key', 'english', 'arabic_draft', 'reviewer_correction', 'reviewer_initials']].concat(
  walk(en as unknown as Tree).flatMap(([k, e]) => {
    const a = arabic.get(k);
    if (typeof e === 'string') return [[k, e, typeof a === 'string' ? a : '', '', '']];
    const forms = isPlural(a) ? ARABIC_FORMS.filter(f => f in a) : ['other'];
    return forms.map(f => [`${k}.${f}`, e[f === 'one' ? 'one' : 'other'] ?? e.other, isPlural(a) ? a[f] ?? '' : '', '', '']);
  })
);

mkdirSync('docs/i18n', { recursive: true });
writeFileSync('docs/i18n/arabic-review.csv', '﻿' + rows.map(r => r.map(cell).join(',')).join('\n') + '\n');
console.log(`docs/i18n/arabic-review.csv: ${rows.length - 1} strings`);
