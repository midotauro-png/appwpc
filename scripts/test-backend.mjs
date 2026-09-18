// Integration checks against a Supabase project (defaults to `supabase start`).
// Usage: node scripts/test-backend.mjs
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANON || !SERVICE) {
  console.error('Set SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const anon = () => createClient(URL, ANON, { auth: { persistSession: false } });

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const signUp = async (email, meta) => {
  const client = anon();
  const { data, error } = await client.auth.signUp({
    email,
    password: 'Passw0rd!123',
    options: { data: meta },
  });
  if (error) throw error;
  if (!data.session) {
    await admin.auth.admin.updateUserById(data.user.id, { email_confirm: true });
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password: 'Passw0rd!123',
    });
    if (signInError) throw signInError;
  }
  return { client, userId: data.user.id };
};

const stamp = Date.now();
const member = await signUp(`free${stamp}@example.com`, {
  first_name: 'Layla',
  last_name: 'Ahmed',
  phone: '+97333000000',
  country: 'Bahrain',
  city: 'Manama',
});

const { data: profile } = await member.client
  .from('profiles')
  .select('*')
  .eq('id', member.userId)
  .single();

check('profile auto-created on sign up', Boolean(profile));
check('defaults to free membership', profile?.membership_level === 'free', profile?.membership_level);
check('member id generated', /^WI-\d+$/.test(profile?.member_id ?? ''), profile?.member_id);
check('metadata copied to profile', profile?.first_name === 'Layla' && profile?.city === 'Manama');

const { error: promoteError } = await member.client
  .from('profiles')
  .update({ membership_level: 'golden', is_admin: true })
  .eq('id', member.userId);
const { data: afterPromote } = await member.client
  .from('profiles')
  .select('membership_level,is_admin')
  .eq('id', member.userId)
  .single();
check(
  'member cannot self-promote',
  afterPromote?.membership_level === 'free' && afterPromote?.is_admin === false,
  promoteError?.message ?? JSON.stringify(afterPromote)
);

const { data: levels } = await member.client.from('membership_levels').select('*').order('rank');
check('4 membership levels seeded', levels?.length === 4, levels?.map((l) => l.key).join(','));

const { data: freeEvent } = await admin
  .from('events')
  .insert({
    title: 'Open Networking Night',
    event_date: '2026-12-01',
    required_membership: 'free',
    capacity: 2,
    status: 'published',
  })
  .select()
  .single();

const { data: goldEvent } = await admin
  .from('events')
  .insert({
    title: 'Golden VIP Dinner',
    event_date: '2026-12-10',
    required_membership: 'golden',
    status: 'published',
  })
  .select()
  .single();

const { data: draftEvent } = await admin
  .from('events')
  .insert({ title: 'Draft event', event_date: '2026-12-20', status: 'draft' })
  .select()
  .single();

const { data: visible } = await member.client.from('events').select('id,title');
const ids = (visible ?? []).map((e) => e.id);
check('published events visible to member', ids.includes(freeEvent.id) && ids.includes(goldEvent.id));
check('draft events hidden from member', !ids.includes(draftEvent.id));

const { data: freeReg, error: freeRegError } = await member.client.rpc(
  'request_event_registration',
  { p_event_id: freeEvent.id, p_guests: 1 }
);
check(
  'eligible registration auto-approved',
  freeReg?.status === 'approved',
  freeRegError?.message ?? JSON.stringify(freeReg)
);

const { data: goldReg, error: goldRegError } = await member.client.rpc(
  'request_event_registration',
  { p_event_id: goldEvent.id }
);
check(
  'free member request to golden event stays pending',
  goldReg?.status === 'pending',
  goldRegError?.message ?? JSON.stringify(goldReg)
);

const { data: dupe, error: dupeError } = await member.client.rpc('request_event_registration', {
  p_event_id: goldEvent.id,
});
check('duplicate request returns existing row', dupe?.id === goldReg?.id, dupeError?.message);

// capacity: free event capacity 2, one seat taken
const other = await signUp(`free2${stamp}@example.com`, { first_name: 'Noor', last_name: 'S' });
await other.client.rpc('request_event_registration', { p_event_id: freeEvent.id });
const third = await signUp(`free3${stamp}@example.com`, { first_name: 'Sara', last_name: 'K' });
const { error: capacityError } = await third.client.rpc('request_event_registration', {
  p_event_id: freeEvent.id,
});
check('capacity enforced', Boolean(capacityError), capacityError?.message);

const { data: otherRegs } = await other.client.from('event_registrations').select('id,user_id');
check(
  'members only see their own registrations',
  (otherRegs ?? []).every((r) => r.user_id === other.userId),
  String(otherRegs?.length)
);

// upgrade to golden by admin, then gating changes
await admin.from('profiles').update({ membership_level: 'golden' }).eq('id', other.userId);
const { data: goldenReg } = await other.client.rpc('request_event_registration', {
  p_event_id: goldEvent.id,
});
check('golden member auto-approved for golden event', goldenReg?.status === 'approved');

// notifications targeting
await admin.from('notifications').insert([
  { title: 'All members', message: 'Hello everyone', target_level: null },
  { title: 'Golden only', message: 'VIP news', target_level: 'golden' },
]);
const { data: freeNotes } = await member.client.from('notifications').select('title');
const { data: goldNotes } = await other.client.from('notifications').select('title');
check(
  'free member does not see golden notification',
  !(freeNotes ?? []).some((n) => n.title === 'Golden only'),
  (freeNotes ?? []).map((n) => n.title).join(',')
);
check(
  'golden member sees golden notification',
  (goldNotes ?? []).some((n) => n.title === 'Golden only')
);

// directory gating (silver+)
const { data: freeDirectory } = await member.client.from('profiles').select('id');
check(
  'free member cannot browse directory',
  (freeDirectory ?? []).length <= 1,
  String(freeDirectory?.length)
);
const { data: goldDirectory } = await other.client.from('profiles').select('id');
check('silver+ member can browse directory', (goldDirectory ?? []).length > 1, String(goldDirectory?.length));

// admin stats
await admin.from('profiles').update({ is_admin: true }).eq('id', third.userId);
const { data: stats, error: statsError } = await third.client.rpc('admin_stats');
check(
  'admin stats readable by admin',
  Boolean(stats?.[0]),
  statsError?.message ?? JSON.stringify(stats)
);
const { error: memberStatsError } = await member.client.rpc('admin_stats');
check('admin stats blocked for member', Boolean(memberStatsError), memberStatsError?.message);

// registrations cannot be created or revived behind the RPC's back
const { error: directInsertError } = await member.client
  .from('event_registrations')
  .insert({ user_id: member.userId, event_id: draftEvent.id, status: 'pending' });
check('direct registration insert blocked', Boolean(directInsertError), directInsertError?.message);

await admin.from('event_registrations').update({ status: 'declined' }).eq('id', goldReg.id);
const { error: revivedError } = await member.client.rpc('request_event_registration', {
  p_event_id: goldEvent.id,
});
const { data: declinedRow } = await admin
  .from('event_registrations')
  .select('status')
  .eq('id', goldReg.id)
  .single();
check(
  'declined request cannot be reopened by the member',
  Boolean(revivedError) && declinedRow?.status === 'declined',
  `${revivedError?.message} / ${declinedRow?.status}`
);

// disabling a feature closes it for every level, not just in the UI
await admin.from('feature_permissions').update({ is_enabled: false }).eq('feature_key', 'events_view');
const { data: hiddenEvents } = await other.client.from('events').select('id');
check('events hidden when events_view is disabled', (hiddenEvents ?? []).length === 0, String(hiddenEvents?.length));
await admin.from('feature_permissions').update({ is_enabled: true }).eq('feature_key', 'events_view');

await admin.from('feature_permissions').update({ is_enabled: false }).eq('feature_key', 'events_register');
const { error: disabledRegError } = await other.client.rpc('request_event_registration', {
  p_event_id: freeEvent.id,
});
check('registration blocked when events_register is disabled', Boolean(disabledRegError), disabledRegError?.message);
await admin.from('feature_permissions').update({ is_enabled: true }).eq('feature_key', 'events_register');

await admin.from('feature_permissions').update({ is_enabled: false }).eq('feature_key', 'announcements');
const { data: hiddenNotes } = await other.client.from('notifications').select('id');
check(
  'broadcast announcements hidden when announcements is disabled',
  (hiddenNotes ?? []).length === 0,
  String(hiddenNotes?.length)
);
await admin.from('feature_permissions').update({ is_enabled: true }).eq('feature_key', 'announcements');

// account deletion
const { error: deleteError } = await member.client.rpc('delete_my_account');
const { data: gone } = await admin.from('profiles').select('id').eq('id', member.userId);
check('delete_my_account removes profile', !deleteError && (gone ?? []).length === 0, deleteError?.message);

console.log(failures === 0 ? '\nAll checks passed' : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
