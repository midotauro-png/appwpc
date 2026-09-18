import { useEffect, useMemo, useState } from 'react';

import { supabase } from '../supabase';

const LEVELS = ['free', 'bronze', 'silver', 'golden'];
const STATUSES = ['active', 'pending', 'suspended', 'expired'];

const toCsv = (rows) => {
  const columns = [
    'member_id',
    'first_name',
    'last_name',
    'email',
    'phone',
    'country',
    'city',
    'membership_level',
    'membership_status',
    'membership_expiry',
    'created_at',
  ];
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(',')),
  ].join('\n');
};

const Members = () => {
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [error, setError] = useState('');

  const load = async () => {
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (loadError) setError(loadError.message);
    else setMembers(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      if (level !== 'all' && member.membership_level !== level) return false;
      if (!needle) return true;
      return [member.first_name, member.last_name, member.email, member.member_id, member.city]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [members, query, level]);

  const patch = async (id, changes) => {
    setMembers((current) =>
      current.map((member) => (member.id === id ? { ...member, ...changes } : member))
    );
    const { error: updateError } = await supabase.from('profiles').update(changes).eq('id', id);
    if (updateError) {
      setError(updateError.message);
      load();
    }
  };

  const remove = async (member) => {
    const label = `${member.first_name} ${member.last_name}`.trim() || member.email;
    if (!window.confirm(`Delete ${label}? This removes their account permanently.`)) return;
    const { error: deleteError } = await supabase.rpc('admin_delete_member', {
      p_user_id: member.id,
    });
    if (deleteError) setError(deleteError.message);
    else load();
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(visible)], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `women-impact-members-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <>
      <h1>Members</h1>
      <div className="row">
        <input
          style={{ maxWidth: 280 }}
          placeholder="Search name, email, member ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select style={{ maxWidth: 160 }} value={level} onChange={(event) => setLevel(event.target.value)}>
          <option value="all">All levels</option>
          {LEVELS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <button className="ghost" onClick={exportCsv}>
          Export CSV
        </button>
        <span className="muted">{visible.length} shown</span>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Contact</th>
              <th>Location</th>
              <th>Level</th>
              <th>Status</th>
              <th>Admin</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((member) => (
              <tr key={member.id}>
                <td>
                  <strong>
                    {member.first_name} {member.last_name}
                  </strong>
                  <div className="muted">{member.member_id}</div>
                </td>
                <td>
                  {member.email}
                  <div className="muted">{member.phone ?? '—'}</div>
                </td>
                <td className="muted">
                  {[member.city, member.country].filter(Boolean).join(', ') || '—'}
                </td>
                <td>
                  <select
                    value={member.membership_level}
                    onChange={(event) => patch(member.id, { membership_level: event.target.value })}
                  >
                    {LEVELS.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={member.membership_status}
                    onChange={(event) => patch(member.id, { membership_status: event.target.value })}
                  >
                    {STATUSES.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    style={{ width: 18 }}
                    checked={member.is_admin}
                    onChange={(event) => patch(member.id, { is_admin: event.target.checked })}
                  />
                </td>
                <td>
                  <button className="danger small" onClick={() => remove(member)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Members;
