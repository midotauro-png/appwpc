import { bundledEvents } from './events';
import { supabase } from './lib/supabase';

const toAppEvent = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  date: row.event_date,
  time: row.start_time ? row.start_time.slice(0, 5) : null,
  endTime: row.end_time ? row.end_time.slice(0, 5) : null,
  location: row.location,
  mapsUrl: row.maps_url,
  image: row.image_url,
  organizer: row.organizer,
  capacity: row.capacity,
  requiredMembership: row.required_membership ?? 'free',
  registrationDeadline: row.registration_deadline,
  memberPrice: row.member_price,
  publicPrice: row.non_member_price,
  featured: row.is_featured,
});

export const loadEvents = async () => {
  if (!supabase) return { events: bundledEvents, source: 'bundled' };
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'published')
    .gte('event_date', today)
    .order('event_date');
  if (error || !data?.length) return { events: bundledEvents, source: 'bundled' };
  return { events: data.map(toAppEvent), source: 'remote' };
};

export const loadMyRegistrations = async (userId) => {
  if (!supabase || !userId) return [];
  const { data } = await supabase
    .from('event_registrations')
    .select('id,status,guests,created_at,event:events(id,title,event_date,start_time,location)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
};

export const requestEventRegistration = async (eventId, guests = 0, note = null) => {
  if (!supabase) throw new Error('Membership backend not configured.');
  const { data, error } = await supabase.rpc('request_event_registration', {
    p_event_id: eventId,
    p_guests: guests,
    p_note: note,
  });
  if (error) throw error;
  return data;
};

export const loadNotifications = async () => {
  if (!supabase) return [];
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  return data ?? [];
};

export const requestUpgrade = async (userId, currentLevel, desiredLevel) => {
  if (!supabase) throw new Error('Membership backend not configured.');
  const { error } = await supabase.from('upgrade_requests').insert({
    user_id: userId,
    current_level: currentLevel,
    desired_level: desiredLevel,
  });
  if (error) throw error;
};

export const saveProfile = async (userId, patch) => {
  if (!supabase) throw new Error('Membership backend not configured.');
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
};

export const savePushToken = async (userId, token, platform) => {
  if (!supabase || !userId || !token) return;
  await supabase.from('push_tokens').upsert({ token, user_id: userId, platform });
};

export const deleteMyAccount = async () => {
  if (!supabase) throw new Error('Membership backend not configured.');
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut();
};
