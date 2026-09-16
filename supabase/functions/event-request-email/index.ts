// Supabase Edge Function — emails every new event registration request to the
// Women Impact team. Wire it to a Database Webhook:
//   Table public.event_registrations · Events: INSERT · Type: Supabase Edge Function
//
// Secrets required:
//   supabase secrets set RESEND_API_KEY=...            (https://resend.com)
//   supabase secrets set NOTIFY_EMAIL=womanpowerbh@gmail.com
//   supabase secrets set FROM_EMAIL="Women Impact <noreply@womenimpactclub.com>"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const NOTIFY_EMAIL = Deno.env.get('NOTIFY_EMAIL') ?? 'womanpowerbh@gmail.com';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Women Impact <onboarding@resend.dev>';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const row = (label: string, value: string) =>
  `<tr><td style="padding:6px 16px 6px 0;color:#6B6B6B">${label}</td><td style="padding:6px 0;font-weight:600;color:#1A1A1A">${value}</td></tr>`;

Deno.serve(async (req) => {
  const payload = await req.json();
  const registration = payload.record ?? payload;
  if (!registration?.user_id || !registration?.event_id) {
    return new Response('ignored', { status: 200 });
  }

  const [{ data: member }, { data: event }] = await Promise.all([
    admin
      .from('profiles')
      .select('first_name,last_name,email,phone,membership_level,member_id')
      .eq('id', registration.user_id)
      .single(),
    admin.from('events').select('title,event_date,start_time,location').eq('id', registration.event_id).single(),
  ]);

  if (!member || !event) return new Response('missing data', { status: 200 });

  const name = `${member.first_name} ${member.last_name}`.trim() || member.email;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif">
      <h2 style="color:#B81C36;margin:0 0 4px">New event registration request</h2>
      <p style="color:#6B6B6B;margin:0 0 20px">Status: <strong>${registration.status}</strong></p>
      <table style="border-collapse:collapse;font-size:14px">
        ${row('Member', name)}
        ${row('Member ID', member.member_id ?? '—')}
        ${row('Email', member.email)}
        ${row('Phone / WhatsApp', member.phone ?? '—')}
        ${row('Membership', String(member.membership_level).toUpperCase())}
        ${row('Event', event.title)}
        ${row('Event date', `${event.event_date}${event.start_time ? ` · ${event.start_time}` : ''}`)}
        ${row('Location', event.location ?? '—')}
        ${row('Guests', String(registration.guests ?? 0))}
        ${row('Submitted', new Date(registration.created_at ?? Date.now()).toLocaleString('en-GB'))}
      </table>
      ${registration.note ? `<p style="margin-top:16px"><em>${registration.note}</em></p>` : ''}
      <p style="margin-top:24px;color:#6B6B6B;font-size:13px">Approve or decline in the Women Impact admin dashboard.</p>
    </div>`;

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY missing — email not sent');
    return new Response('email skipped', { status: 200 });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [NOTIFY_EMAIL],
      reply_to: member.email,
      subject: 'Women Impact — New Event Registration Request',
      html,
    }),
  });

  if (!res.ok) {
    console.error('resend failed', res.status, await res.text());
    return new Response('email failed', { status: 500 });
  }

  return new Response('sent', { status: 200 });
});
