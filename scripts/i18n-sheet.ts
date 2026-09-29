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
const flatten = (o: Tree, p = ''): Array<[string, string]> =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : flatten(v, `${p}${k}.`)));

const arabic = new Map(flatten(ar as unknown as Tree));
const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
const rows = [['key', 'english', 'arabic_draft', 'reviewer_correction', 'reviewer_initials']]
  .concat(flatten(en as unknown as Tree).map(([k, e]) => [k, e, arabic.get(k) ?? '', '', '']));

mkdirSync('docs/i18n', { recursive: true });
writeFileSync('docs/i18n/arabic-review.csv', '﻿' + rows.map(r => r.map(cell).join(',')).join('\n') + '\n');
console.log(`docs/i18n/arabic-review.csv: ${rows.length - 1} strings`);
