#!/usr/bin/env node
// One-off migration (NEXT_STEPS_PROMPT.md phase 1.4): give every referral and
// notification that predates `createdAtMs` the field, derived from its ISO
// `createdAt`. Firestore rules cannot parse ISO strings, so `createdAtMs` is
// what lets them check the SLA window and bound notification dates.
//
// Dry run by default; pass --apply to write. Uses the caller's gcloud
// credentials (`gcloud auth print-access-token`) against the Firestore REST
// API, so it runs with the caller's IAM rights, not through security rules.
// Each write is conditional on the document's updateTime, so a document that
// changed since it was read is skipped rather than overwritten.
//
//   node scripts/backfill-created-at-ms.mjs            # report only
//   node scripts/backfill-created-at-ms.mjs --apply    # write
import { execFileSync } from 'node:child_process';

const PROJECT = process.env.FIREBASE_PROJECT || 'eha-transfer-1785622025';
const APPLY = process.argv.includes('--apply');
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function listAll(collection) {
  const docs = [];
  let pageToken = '';
  do {
    const url = `${BASE}/${collection}?pageSize=300&mask.fieldPaths=createdAt&mask.fieldPaths=createdAtMs${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${collection}: list failed ${res.status} ${await res.text()}`);
    const body = await res.json();
    docs.push(...(body.documents || []));
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return docs;
}

async function backfill(collection) {
  const docs = await listAll(collection);
  const missing = docs.filter(d => !d.fields?.createdAtMs);
  const summary = { collection, total: docs.length, missing: missing.length, written: 0, skipped: [] };
  for (const d of missing) {
    const id = d.name.split('/').pop();
    const iso = d.fields?.createdAt?.stringValue ?? d.fields?.createdAt?.timestampValue;
    const ms = Date.parse(iso || '');
    if (Number.isNaN(ms)) { summary.skipped.push(`${id}: unparseable createdAt`); continue; }
    if (!APPLY) continue;
    const url = `${BASE}/${collection}/${id}?updateMask.fieldPaths=createdAtMs&currentDocument.updateTime=${encodeURIComponent(d.updateTime)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields: { createdAtMs: { integerValue: String(ms) } } }),
    });
    if (res.ok) summary.written += 1;
    else summary.skipped.push(`${id}: ${res.status} (changed since read or refused)`);
  }
  return summary;
}

const results = [];
for (const c of ['referrals', 'notifications']) results.push(await backfill(c));
console.log(APPLY ? 'APPLIED' : 'DRY RUN (pass --apply to write)');
for (const r of results) {
  console.log(`${r.collection}: ${r.total} total, ${r.missing} missing createdAtMs, ${r.written} written`);
  for (const s of r.skipped) console.log(`  skipped ${s}`);
}
