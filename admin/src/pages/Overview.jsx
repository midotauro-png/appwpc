import { useEffect, useState } from 'react';

import { supabase } from '../supabase';

const CARDS = [
  ['total_members', 'Total members'],
  ['free_members', 'Free'],
  ['bronze_members', 'Bronze'],
  ['silver_members', 'Silver'],
  ['golden_members', 'Golden'],
  ['new_members_this_month', 'New this month'],
  ['event_registrations', 'Registrations'],
  ['pending_requests', 'Pending requests'],
];

const Overview = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .rpc('admin_stats')
      .single()
      .then(({ data, error: rpcError }) => {
        if (rpcError) setError(rpcError.message);
        else setStats(data);
      });
  }, []);

  return (
    <>
      <h1>Overview</h1>
      {error && <p className="error">{error}</p>}
      <div className="grid stats">
        {CARDS.map(([key, label]) => (
          <div className="card stat" key={key}>
            <div className="value">{stats ? stats[key] : '—'}</div>
            <div className="label">{label}</div>
          </div>
        ))}
      </div>
    </>
  );
};

export default Overview;
