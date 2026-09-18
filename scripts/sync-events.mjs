// Regenerates data/events.json from the events defined in the website's SEED_DATA.
// Run with: npm run sync:events
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_URL = 'https://www.womenimpactclub.com';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../data/events.json');

const sliceBalanced = (source, startIndex, open, close) => {
  let depth = 0;
  for (let i = startIndex; i < source.length; i += 1) {
    if (source[i] === open) depth += 1;
    else if (source[i] === close) {
      depth -= 1;
      if (depth === 0) return source.slice(startIndex, i + 1);
    }
  }
  throw new Error('Unbalanced literal while parsing site data');
};

const html = await fetch(SITE_URL).then((res) => {
  if (!res.ok) throw new Error(`Site responded with ${res.status}`);
  return res.text();
});

const seedIndex = html.indexOf('const SEED_DATA');
if (seedIndex === -1) throw new Error('SEED_DATA not found — the site markup changed');
const arrayStart = html.indexOf('[', html.indexOf('events:', seedIndex));
const literal = sliceBalanced(html, arrayStart, '[', ']');

// The literal is plain data (no function calls); evaluating it is safe enough for a build step.
const events = new Function(`return (${literal});`)();

const keep = [
  'id', 'title', 'subtitle', 'category', 'tag', 'description', 'date', 'time', 'location',
  'speaker', 'speakerTopic', 'memberPrice', 'publicPrice', 'note', 'registrationUrl',
  'status', 'spotsLeft', 'featured', 'waMsg',
];

const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);

const cleaned = events
  .filter((event) => event.status === 'upcoming' && new Date(event.date) >= startOfToday)
  .sort((a, b) => new Date(a.date) - new Date(b.date))
  .map((event) => Object.fromEntries(keep.filter((k) => event[k] !== undefined).map((k) => [k, event[k]])));

writeFileSync(OUT, `${JSON.stringify({ syncedAt: new Date().toISOString(), events: cleaned }, null, 2)}\n`);
console.log(`Wrote ${cleaned.length} upcoming events to ${OUT}`);
