// Supabase Edge Function — sends an Expo push for every row inserted into
// public.notifications, targeted by membership level or individual member.
// Wire it to a Database Webhook: table public.notifications · INSERT.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

Deno.serve(async (req) => {
  const payload = await req.json();
  const notification = payload.record ?? payload;
  if (!notification?.title) return new Response('ignored', { status: 200 });

  let userIds: string[] | null = null;

  if (notification.target_user_id) {
    userIds = [notification.target_user_id];
  } else if (notification.target_level) {
    const { data: levels } = await admin.from('membership_levels').select('key,rank');
    const targetRank = levels?.find((l) => l.key === notification.target_level)?.rank ?? 0;
    const allowed = (levels ?? []).filter((l) => l.rank >= targetRank).map((l) => l.key);
    const { data: members } = await admin
      .from('profiles')
      .select('id')
      .in('membership_level', allowed)
      .eq('membership_status', 'active');
    userIds = (members ?? []).map((m) => m.id);
  }

  let query = admin.from('push_tokens').select('token');
  if (userIds) query = query.in('user_id', userIds);
  const { data: tokens } = await query;

  const messages = (tokens ?? []).map((t) => ({
    to: t.token,
    sound: 'default',
    title: notification.title,
    body: notification.message,
    data: { notificationId: notification.id, eventId: notification.event_id },
  }));

  for (const batch of chunk(messages, 100)) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    if (!res.ok) console.error('expo push failed', res.status, await res.text());
  }

  return new Response(`sent ${messages.length}`, { status: 200 });
});
