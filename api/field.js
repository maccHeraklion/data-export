// GET /api/field?slug=vria-1-xxxxxx  ->  { name, stations: [{ id, label }] }
import { getField } from '../lib/fields.js';

export default function handler(req, res) {
  const slug = new URL(req.url, 'http://localhost').searchParams.get('slug');
  const field = getField(slug);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (!field) {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Δεν βρέθηκε ο αγρός' }));
  }
  res.statusCode = 200;
  res.end(JSON.stringify({ name: field.name, stations: field.stations }));
}
