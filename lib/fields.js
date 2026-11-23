// Αγροί με εξαγωγή δεδομένων: slug -> { name, stations: [{ id, label }] }.
//
// Το repo είναι public, οπότε οι αγροί και τα slugs ΔΕΝ μπαίνουν στον κώδικα:
//   - στο Vercel: environment variable FIELDS με το JSON
//   - τοπικά: αρχείο fields.local.json (δεν ανεβαίνει στο GitHub)
import { readFileSync, existsSync } from 'node:fs';

let cache = null;

export function getFields() {
  if (cache) return cache;
  let raw = process.env.FIELDS;
  if (!raw && existsSync('fields.local.json')) raw = readFileSync('fields.local.json', 'utf8');
  cache = raw ? JSON.parse(raw) : {};
  return cache;
}

export function getField(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const fields = getFields();
  return Object.prototype.hasOwnProperty.call(fields, slug) ? fields[slug] : null;
}
