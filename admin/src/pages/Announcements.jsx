import { useEffect, useState } from 'react';

import { supabase } from '../supabase';

const LEVELS = ['free', 'bronze', 'silver', 'golden'];

const Announcements = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [memberId, setMemberId] = useState('');
  const [members, setMembers] = useState([]);
  const [sent, setSent] = useState([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [profiles, notifications] = await Promise.all([
      supabase.from('profiles').select('id,first_name,last_name,email').order('first_name'),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(25),
    ]);
    setMembers(profiles.data ?? []);
    setSent(notifications.data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.');
      return;
    }
    setBusy(true);
    setError('');
    setStatus('');

    const row = {
      title: title.trim(),
      message: message.trim(),
      target_level: LEVELS.includes(target) ? target : null,
      target_user_id: target === 'member' ? memberId || null : null,
    };
    const { error: insertError } = await supabase.from('notifications').insert(row);
    if (insertError) {
      setBusy(false);
      setError(insertError.message);
      return;
    }

    // Push delivery is best effort: the in-app notification is already stored.
    const { error: pushError } = await supabase.functions.invoke('push-broadcast', {
      body: {
        title: row.title,
        message: row.message,
        target_level: row.target_level,
        target_user_id: row.target_user_id,
      },
    });
    setBusy(false);
    setStatus(
      pushError
        ? 'Saved in-app. Push delivery failed — deploy the push-broadcast function.'
        : 'Sent in-app and by push notification.'
    );
    setTitle('');
    setMessage('');
    load();
  };

  return (
    <>
      <h1>Announcements</h1>
      {error && <p className="error">{error}</p>}
      {status && <p className="muted">{status}</p>}

      <div className="card grid">
        <h2>New announcement</h2>
        <div>
          <label>Title</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div>
          <label>Message</label>
          <textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
        </div>
        <div className="form-grid">
          <div>
            <label>Audience</label>
            <select value={target} onChange={(event) => setTarget(event.target.value)}>
              <option value="all">All members</option>
              {LEVELS.map((key) => (
                <option key={key} value={key}>
                  {key} and above
                </option>
              ))}
              <option value="member">Individual member</option>
            </select>
          </div>
          {target === 'member' && (
            <div>
              <label>Member</label>
              <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
                <option value="">Select a member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.first_name} {member.last_name} — {member.email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div>
          <button onClick={send} disabled={busy}>
            Send announcement
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Message</th>
              <th>Audience</th>
              <th>Sent</th>
            </tr>
          </thead>
          <tbody>
            {sent.map((row) => (
              <tr key={row.id}>
                <td>{row.title}</td>
                <td className="muted">{row.message}</td>
                <td>
                  {row.target_user_id ? (
                    'individual'
                  ) : row.target_level ? (
                    <span className={`badge ${row.target_level}`}>{row.target_level}+</span>
                  ) : (
                    'all members'
                  )}
                </td>
                <td className="muted">{new Date(row.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Announcements;
