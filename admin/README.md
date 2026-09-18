# Women Impact Club — admin dashboard

React + Vite dashboard for the Women Impact Club membership platform. It talks
to Supabase with the public anon key only; every privileged action is gated by
RLS and `profiles.is_admin` in the database.

```bash
npm install
cp .env.example .env.local   # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
npm run build                # static output in dist/
```

Pages: overview statistics, members, requests, events, announcements,
permissions.
