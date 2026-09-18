import { useEffect, useState } from 'react';

import Announcements from './pages/Announcements';
import Events from './pages/Events';
import Members from './pages/Members';
import Overview from './pages/Overview';
import Permissions from './pages/Permissions';
import Requests from './pages/Requests';
import { isConfigured, supabase } from './supabase';

const PAGES = {
  overview: Overview,
  members: Members,
  requests: Requests,
  events: Events,
  announcements: Announcements,
  permissions: Permissions,
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) setError(signInError.message);
  };

  return (
    <div className="login">
      <form className="card" onSubmit={submit}>
        <div>
          <div style={{ letterSpacing: '.14em', fontWeight: 800, fontSize: 13 }}>WOMEN IMPACT</div>
          <h1 style={{ fontSize: 22, marginTop: 6 }}>Admin dashboard</h1>
        </div>
        <div>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          Sign in
        </button>
      </form>
    </div>
  );
};

const App = () => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [session]);

  if (!isConfigured) {
    return (
      <div className="login">
        <div className="card">
          <h1 style={{ fontSize: 20 }}>Not configured</h1>
          <p className="muted">
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in admin/.env, then restart the dev
            server.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="login">Loading…</div>;
  if (!session) return <Login />;

  if (profile && !profile.is_admin) {
    return (
      <div className="login">
        <div className="card">
          <h1 style={{ fontSize: 20 }}>Admins only</h1>
          <p className="muted">This account does not have administrator access.</p>
          <button className="ghost" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const Page = PAGES[page];

  return (
    <div className="shell">
      <nav className="side">
        <div className="brand">WOMEN IMPACT</div>
        {Object.keys(PAGES).map((key) => (
          <button
            key={key}
            className={key === page ? 'active' : ''}
            onClick={() => setPage(key)}
          >
            {key[0].toUpperCase() + key.slice(1)}
          </button>
        ))}
        <div className="spacer" />
        <div className="muted">{profile?.email}</div>
        <button className="ghost" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </nav>
      <main className="main">{profile ? <Page /> : <p className="muted">Loading…</p>}</main>
    </div>
  );
};

export default App;
