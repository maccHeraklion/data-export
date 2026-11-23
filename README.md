# MACC – Εξαγωγή δεδομένων σταθμών

Μικρή web εφαρμογή για κατέβασμα μετρήσεων σταθμών σε CSV, **από το αντίγραφο της βάσης στο Supabase**
(πίνακας `macc_stations`) και όχι από το TagoIO. Έτσι το TagoIO διαβάζεται μία φορά από τον συγχρονισμό
και όλες οι εξαγωγές γίνονται από το αντίγραφο, χωρίς χρέωση Data Output στο Tago.

## Πώς δουλεύει

- `index.html`: η σελίδα. Επιλογή σταθμού, ημερομηνιών και μορφής CSV.
- `api/data.js`: serverless function. Φέρνει από το Supabase τις μετρήσεις ενός σταθμού για ένα διάστημα,
  σε σελίδες (το Supabase δίνει έως 1000 γραμμές ανά αίτημα). Το κλειδί της βάσης μένει μόνο στον server.
- `api/field.js` + `lib/fields.js`: οι αγροί. Κάθε αγρός έχει δικό του link `/<slug>` και βλέπει μόνο
  τους δικούς του σταθμούς. Ο server ελέγχει ότι ο σταθμός ανήκει στον αγρό του link.
- Οι αγροί **δεν** είναι στο repo (είναι public): ζουν στο env `FIELDS` του Vercel, και τοπικά στο
  `fields.local.json` (δεν ανεβαίνει). Δες το `fields.example.json` για τη μορφή.
- Ο browser σπάει το διάστημα σε κομμάτια 7 ημερών, τα φέρνει παράλληλα και φτιάχνει το CSV.

Το CSV είναι «πλατύ»: μία γραμμή ανά χρονική στιγμή, μία στήλη ανά μεταβλητή, με στήλες
«Ώρα Ελλάδας» και «UTC». Η στήλη `date` της βάσης είναι σε UTC.

## Ρυθμίσεις στο Vercel

1. Import του repo `maccHeraklion/data-export` (Framework Preset: **Other**, χωρίς build command).
2. Environment Variables:
   - `SUPABASE_URL`: το URL του project στο Supabase
   - `SUPABASE_KEY`: το publishable key
   - `FIELDS`: το περιεχόμενο του `fields.local.json`
3. Deploy.

## Νέος αγρός

Πρόσθεσε μια εγγραφή στο `FIELDS` (και στο `fields.local.json`) με slug που έχει τυχαίο κομμάτι στο τέλος,
π.χ. `onoma-agrou-3f9a1c`, και κάνε Redeploy στο Vercel. Αγρός με `"stations": []` δείχνει
«Δεν υπάρχουν ακόμα διαθέσιμα δεδομένα».

## Τοπική δοκιμή

```bash
cp .env.example .env   # και συμπλήρωσε τις τιμές
cp fields.example.json fields.local.json
node dev.mjs           # http://localhost:3000
```

## Χρόνοι (δοκιμή 23/11/2026)

- 7 ημέρες μετεωρολογικού σταθμού: ~3 δευτ.
- 1 έτος μετεωρολογικού σταθμού (~575k μετρήσεις): ~26 δευτ., αρχείο ~6,6 MB.
