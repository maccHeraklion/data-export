// Επιστρέφει μία "σελίδα" μετρήσεων ενός σταθμού για ένα χρονικό διάστημα.
// Ο browser καλεί επανειλημμένα με το cursor `next` μέχρι να γυρίσει null.
//
// GET /api/data?field=<slug>&station=vria_1_weather_station
//               &from=2026-11-01T00:00:00&to=2026-11-02T00:00:00
//               [&after_date=...&after_var=...]
// Ο σταθμός πρέπει να ανήκει στον αγρό του slug, αλλιώς 403.
// Οι ημερομηνίες είναι UTC χωρίς ζώνη, όπως είναι αποθηκευμένες στη βάση.

import { getField } from '../lib/fields.js';

const PAGE = 1000;      // μέγιστο που επιστρέφει το Supabase ανά αίτημα
const MAX_PAGES = 8;    // σελίδες ανά κλήση, για να μένουμε μακριά από το timeout του Vercel
const DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?$/;
const VAR = /^[A-Za-z0-9_]+$/;

// "2026-03-26" ή "2026-03-26T05:00:00" (UTC) -> μορφή της βάσης· κενό -> null
function bound(v) {
  if (v === undefined || v === null || v === '') return null;
  const s = /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00` : v;
  if (!DT.test(s)) throw new Error('bad bound');
  return s;
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_KEY) return send(res, 500, { error: 'Λείπουν τα SUPABASE_URL / SUPABASE_KEY' });

  const q = new URL(req.url, 'http://localhost').searchParams;
  const station = q.get('station');
  const from = q.get('from');
  const to = q.get('to');
  let afterDate = q.get('after_date');
  let afterVar = q.get('after_var');

  const field = getField(q.get('field'));
  if (!field) return send(res, 404, { error: 'Δεν βρέθηκε ο αγρός' });
  const st = field.stations.find((s) => s.id === station);
  if (!st) return send(res, 403, { error: 'Ο σταθμός δεν ανήκει σε αυτόν τον αγρό' });
  if (!DT.test(from || '') || !DT.test(to || '') || from >= to) return send(res, 400, { error: 'Λάθος διάστημα ημερομηνιών' });
  if ((afterDate || afterVar) && !(DT.test(afterDate || '') && VAR.test(afterVar || ''))) {
    return send(res, 400, { error: 'Λάθος cursor' });
  }

  // Όρια του σταθμού σε αυτόν τον αγρό (since/until, UTC). Αν το όργανο ήταν πριν
  // ή μετά σε άλλον αγρό, οι μετρήσεις εκείνης της περιόδου δεν δίνονται ποτέ εδώ.
  let since, until;
  try {
    since = bound(st.since);
    until = bound(st.until);
  } catch {
    return send(res, 500, { error: `Λάθος since/until στη ρύθμιση του σταθμού ${station}` });
  }
  const lo = since && since > from ? since : from;
  const hi = until && until < to ? until : to;
  if (lo >= hi) return send(res, 200, { rows: [], next: null });

  const rows = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const p = new URLSearchParams();
    p.set('select', 'date,variable,value');
    p.set('station', `eq.${station}`);
    p.append('date', `gte.${lo}`);
    p.append('date', `lt.${hi}`);
    if (afterDate) p.set('or', `(date.gt."${afterDate}",and(date.eq."${afterDate}",variable.gt."${afterVar}"))`);
    p.set('order', 'date.asc,variable.asc');
    p.set('limit', String(PAGE));

    let r;
    try {
      r = await fetch(`${SUPABASE_URL}/rest/v1/macc_stations?${p}`, {
        headers: { apikey: SUPABASE_KEY, Accept: 'application/json' },
      });
    } catch (e) {
      return send(res, 502, { error: `Αποτυχία σύνδεσης με τη βάση: ${e.message}` });
    }
    if (!r.ok) {
      const text = await r.text();
      return send(res, 502, { error: `Σφάλμα βάσης (${r.status}): ${text.slice(0, 300)}` });
    }
    const page = await r.json();
    for (const x of page) rows.push([x.date, x.variable, x.value]);

    if (page.length < PAGE) return send(res, 200, { rows, next: null });
    const last = page[page.length - 1];
    afterDate = last.date;
    afterVar = last.variable;
  }
  send(res, 200, { rows, next: { after_date: afterDate, after_var: afterVar } });
}
