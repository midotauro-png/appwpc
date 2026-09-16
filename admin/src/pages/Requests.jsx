import { useEffect, useState } from 'react';

import { supabase } from '../supabase';

const Requests = () => {
  const [rows, setRows] = useState([]);
  const [upgrades, setUpgrades] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    const [registrations, upgradeRows] = await Promise.all([
      supabase
        .from('event_registrations')
        .select(
          '*, profiles!event_registrations_user_id_fkey(first_name,last_name,email,phone,membership_level), events(title,event_date)'
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('upgrade_requests')
        .select('*, profiles(first_name,last_name,email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);
    if (registrations.error) setError(registrations.error.message);
    setRows(registrations.data ?? []);
    setUpgrades(upgradeRows.data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (row, status) => {
    const { error: updateError } = await supabase
      .from('event_registrations')
      .update({ status, decided_at: new Date().toISOString() })
      .eq('id', row.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await supabase.from('notifications').insert({
      title: status === 'approved' ? 'Your event registration has been approved' : 'Event registration update',
      message:
        status === 'approved'
          ? `You are confirmed for ${row.events?.title}.`
          : `Your request for ${row.events?.title} was declined. Contact the team for details.`,
      target_user_id: row.user_id,
      event_id: row.event_id,
    });
    load();
  };

  const decideUpgrade = async (row, status) => {
    const updates = [
      supabase.from('upgrade_requests').update({ status }).eq('id', row.id),
    ];
    if (status === 'approved') {
      updates.push(
        supabase.from('profiles').update({ membership_level: row.desired_level }).eq('id', row.user_id)
      );
    }
    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed) setError(failed.error.message);
    else load();
  };

  return (
    <>
      <h1>Requests</h1>
      {error && <p className="error">{error}</p>}

      <h2>Event registrations</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Event</th>
              <th>Guests</th>
              <th>Status</th>
              <th>Requested</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>
                    {row.profiles?.first_name} {row.profiles?.last_name}
                  </strong>
                  <div className="muted">
                    {row.profiles?.email} · {row.profiles?.phone ?? 'no phone'} ·{' '}
                    {row.profiles?.membership_level}
                  </div>
                </td>
                <td>
                  {row.events?.title}
                  <div className="muted">{row.events?.event_date}</div>
                </td>
                <td>{row.guests}</td>
                <td>
                  <span className={`badge ${row.status}`}>{row.status}</span>
                </td>
                <td className="muted">{new Date(row.created_at).toLocaleString()}</td>
                <td>
                  {row.status === 'pending' && (
                    <div className="row">
                      <button className="small" onClick={() => decide(row, 'approved')}>
                        Approve
                      </button>
                      <button className="danger small" onClick={() => decide(row, 'declined')}>
                        Decline
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Membership upgrades</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>From</th>
              <th>To</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {upgrades.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.profiles?.first_name} {row.profiles?.last_name}
                  <div className="muted">{row.profiles?.email}</div>
                </td>
                <td>
                  <span className={`badge ${row.current_level}`}>{row.current_level}</span>
                </td>
                <td>
                  <span className={`badge ${row.desired_level}`}>{row.desired_level}</span>
                </td>
                <td>
                  <div className="row">
                    <button className="small" onClick={() => decideUpgrade(row, 'approved')}>
                      Approve
                    </button>
                    <button className="danger small" onClick={() => decideUpgrade(row, 'declined')}>
                      Decline
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!upgrades.length && (
              <tr>
                <td colSpan={4} className="muted">
                  No pending upgrade requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Requests;
