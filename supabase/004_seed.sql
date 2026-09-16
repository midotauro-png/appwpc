-- Women Impact — seed data (membership levels, feature gates, sample event)

insert into public.membership_levels (key, name, rank, price_label, color, sort_order, benefits) values
  ('free',   'Free Member',   0, 'Free',        '#9A9A9A', 1,
     '["Create an account","See upcoming events","Request to join events","View membership plans"]'::jsonb),
  ('bronze', 'Bronze Member', 1, 'Contact us',  '#B08D57', 2,
     '["Everything in Free","Bronze-only content","Selected community events","Member resources","Member announcements","Selected workshops","Bronze badge"]'::jsonb),
  ('silver', 'Silver Member', 2, 'Contact us',  '#A8A9AD', 3,
     '["Everything in Bronze","Silver-exclusive events","Premium workshops","Networking opportunities","Additional resources","Priority event access","Silver badge"]'::jsonb),
  ('golden', 'Golden Member', 3, 'Contact us',  '#D9A441', 4,
     '["Everything in Silver","Golden-exclusive & VIP events","Premium networking","Exclusive workshops","Full resource library","Priority registration","Special offers","Golden badge"]'::jsonb)
on conflict (key) do update
  set name = excluded.name, rank = excluded.rank, color = excluded.color,
      benefits = excluded.benefits, sort_order = excluded.sort_order;

-- Feature gates — change min_level here (or from the admin dashboard) to move a
-- feature between membership levels without shipping a new app version.
insert into public.feature_permissions (feature_key, label, min_level) values
  ('events_view',      'View events',              'free'),
  ('events_register',  'Instant event registration','bronze'),
  ('resources',        'Member resources',          'bronze'),
  ('announcements',    'Member announcements',      'bronze'),
  ('workshops',        'Workshops',                 'silver'),
  ('directory',        'Member directory',          'silver'),
  ('networking',       'Networking opportunities',  'silver'),
  ('vip_events',       'VIP events',                'golden'),
  ('resource_library', 'Full resource library',     'golden'),
  ('priority_access',  'Priority registration',     'golden')
on conflict (feature_key) do update
  set label = excluded.label, min_level = excluded.min_level;

-- Sample event (matches the current site listing)
insert into public.events
  (title, description, event_date, start_time, location, organizer, capacity,
   required_membership, member_price, non_member_price, is_featured)
values
  ('Annual Women Impact Summit 2026',
   'The flagship annual gathering of women entrepreneurs, leaders, and changemakers across the GCC.',
   date '2026-11-14', time '15:00', 'Bahrain — Venue TBA', 'Women Impact Club', 50,
   'free', 'Free', '20 BD', true)
on conflict do nothing;

-- Promote your own account to admin after signing up:
-- update public.profiles set is_admin = true where email = 'womanpowerbh@gmail.com';
