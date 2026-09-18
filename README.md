# Women Impact Club — membership platform

Three parts:

| Path      | What it is                                                              |
| --------- | ----------------------------------------------------------------------- |
| `/`       | Expo SDK 57 iOS/Android member app (auth, dashboard, events, QR card)   |
| `/admin`  | Vite + React web admin dashboard                                        |
| `/supabase` | Postgres schema, RBAC functions, RLS policies, seed, edge functions   |

App identity: display name `Women Impact Club`, bundle ID / package
`com.womenimpactclub.app`, brand color `#B81C36`.

Membership levels: `free` → `bronze` → `silver` → `golden`. Access is enforced
in the database (RLS + security-definer functions), not only in the UI, and the
gates are rows in `feature_permissions` so the admin can change them without a
new app release.

## 1. Set up the backend

Create a Supabase project, then run the SQL files **in order** in the SQL editor:

```
supabase/001_schema.sql    tables, storage buckets
supabase/002_functions.sql member IDs, RBAC helpers, registration RPC, admin RPCs
supabase/003_rls.sql       row level security policies
supabase/004_seed.sql      membership levels + feature permissions
```

Then deploy the edge functions and their secrets:

```bash
supabase functions deploy event-request-email
supabase functions deploy push-broadcast
supabase secrets set RESEND_API_KEY=... NOTIFY_EMAIL=womanpowerbh@gmail.com FROM_EMAIL=...
```

Add a database webhook on `event_registrations` (insert) pointing at
`event-request-email` so every new request emails womanpowerbh@gmail.com with
the subject `Women Impact — New Event Registration Request`.

Make the first administrator:

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

## 2. Mobile app

```bash
npm install
cp .env.example .env    # EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo run:ios        # macOS + Xcode
npx expo run:android
```

Without Supabase credentials the app falls back to a WebView of
womenimpactclub.com, so it still builds and runs unconfigured.

Backend regression suite (needs a Supabase URL, anon key and service role key):

```bash
node scripts/test-backend.mjs
node scripts/seed-demo.mjs      # demo members + events
```

## 3. Admin dashboard

```bash
cd admin
npm install
cp .env.example .env.local   # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

Sign in with an account whose `profiles.is_admin` is true. Pages: overview
statistics, members (search, level/status/admin edits, delete, CSV export),
requests (event registrations and upgrade requests), events (create/edit/cancel/
delete, photo upload), announcements (in-app + push, targeted by level or
individual), permissions (feature gates and membership benefits).

Deploy as a static site: `npm run build` → `admin/dist`.

## 4. Ship to the App Store

1. Create the App Store Connect record for `com.womenimpactclub.app`.
2. `npm install -g eas-cli && eas login`
3. `eas build --platform ios --profile production`
4. Fill `eas.json` → `submit.production.ios`, then `eas submit -p ios --latest`.
5. Upload screenshots, the published privacy policy URL, and App Review demo
   credentials (a member account and the review notes in
   `store/SUBMISSION_STEPS.md`).
