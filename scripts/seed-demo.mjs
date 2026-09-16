// Seeds a demo member + admin + sample content into a Supabase project.
// Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-demo.mjs
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const people = [
  {
    email: 'demo@womenimpactclub.com',
    password: 'WomenImpact2026!',
    meta: { first_name: 'Layla', last_name: 'Ahmed', phone: '+97333112233', country: 'Bahrain', city: 'Manama' },
    patch: { membership_level: 'silver' },
  },
  {
    email: 'admin@womenimpactclub.com',
    password: 'WomenImpact2026!',
    meta: { first_name: 'Women', last_name: 'Impact', country: 'Bahrain', city: 'Manama' },
    patch: { membership_level: 'golden', is_admin: true },
  },
  {
    email: 'noor@womenimpactclub.com',
    password: 'WomenImpact2026!',
    meta: { first_name: 'Noor', last_name: 'Hassan', country: 'Bahrain', city: 'Riffa' },
    patch: { membership_level: 'bronze' },
  },
];

for (const person of people) {
  const { data, error } = await admin.auth.admin.createUser({
    email: person.email,
    password: person.password,
    email_confirm: true,
    user_metadata: person.meta,
  });
  if (error && !error.message.includes('already')) throw error;
  const id = data?.user?.id;
  if (id) await admin.from('profiles').update(person.patch).eq('id', id);
}

const demoEvents = [
    {
      title: 'Women in Business Breakfast',
      description: 'Morning networking with founders and executives across the GCC.',
      event_date: '2026-10-08',
      start_time: '09:00',
      end_time: '11:00',
      location: 'Four Seasons, Manama',
      maps_url: 'https://maps.google.com/?q=Four+Seasons+Bahrain',
      capacity: 40,
      required_membership: 'free',
      member_price: 'Free',
      non_member_price: '15 BD',
      status: 'published',
    },
    {
      title: 'Silver Leadership Workshop',
      description: 'Practical leadership training for Silver and Golden members.',
      event_date: '2026-10-22',
      start_time: '18:00',
      location: 'Women Impact HQ',
      capacity: 25,
      required_membership: 'silver',
      member_price: 'Included',
      status: 'published',
    },
    {
      title: 'Golden VIP Dinner',
      description: 'An intimate dinner for Golden members with invited guests.',
      event_date: '2026-11-05',
      start_time: '20:00',
      location: 'Private venue',
      required_membership: 'golden',
      status: 'published',
    },
];

const { data: existing, error: listError } = await admin.from('events').select('title');
if (listError) throw listError;
const known = new Set((existing ?? []).map((row) => row.title));
const missing = demoEvents.filter((event) => !known.has(event.title));
if (missing.length) {
  const { error } = await admin.from('events').insert(missing);
  if (error) throw error;
}

const notes = [
  { title: 'New Women Impact event available', message: 'Women in Business Breakfast — 8 October, Manama.' },
  { title: 'Golden VIP Dinner invitations open', message: 'Golden members can now reserve a seat.', target_level: 'golden' },
];
const { data: seenNotes } = await admin.from('notifications').select('title');
const seen = new Set((seenNotes ?? []).map((row) => row.title));
const newNotes = notes.filter((note) => !seen.has(note.title));
if (newNotes.length) {
  const { error } = await admin.from('notifications').insert(newNotes);
  if (error) throw error;
}

console.log('Demo data seeded');
