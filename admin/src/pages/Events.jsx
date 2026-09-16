import { useEffect, useState } from 'react';

import { supabase } from '../supabase';

const LEVELS = ['free', 'bronze', 'silver', 'golden'];
const STATUSES = ['draft', 'published', 'cancelled'];

const emptyEvent = {
  title: '',
  description: '',
  event_date: '',
  start_time: '',
  end_time: '',
  location: '',
  maps_url: '',
  organizer: 'Women Impact Club',
  capacity: '',
  required_membership: 'free',
  registration_deadline: '',
  member_price: '',
  non_member_price: '',
  image_url: '',
  status: 'published',
};

const clean = (form) => ({
  ...form,
  capacity: form.capacity === '' ? null : Number(form.capacity),
  start_time: form.start_time || null,
  end_time: form.end_time || null,
  registration_deadline: form.registration_deadline || null,
});

const Events = () => {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyEvent);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error: loadError } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });
    if (loadError) setError(loadError.message);
    else setEvents(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const uploadImage = async (file) => {
    if (!file) return;
    setBusy(true);
    const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '')}`;
    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(path, file, { upsert: true });
    if (uploadError) setError(uploadError.message);
    else {
      const { data } = supabase.storage.from('event-images').getPublicUrl(path);
      setForm((prev) => ({ ...prev, image_url: data.publicUrl }));
    }
    setBusy(false);
  };

  const save = async () => {
    if (!form.title || !form.event_date) {
      setError('Title and date are required.');
      return;
    }
    setBusy(true);
    const payload = clean(form);
    const { error: saveError } = editing
      ? await supabase.from('events').update(payload).eq('id', editing)
      : await supabase.from('events').insert(payload);
    setBusy(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setForm(emptyEvent);
    setEditing(null);
    setError('');
    load();
  };

  const edit = (event) => {
    setEditing(event.id);
    setForm({
      ...emptyEvent,
      ...Object.fromEntries(
        Object.keys(emptyEvent).map((key) => [key, event[key] ?? emptyEvent[key]])
      ),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEvent = async (event) => {
    if (!window.confirm(`Cancel ${event.title}?`)) return;
    const { error: cancelError } = await supabase
      .from('events')
      .update({ status: 'cancelled' })
      .eq('id', event.id);
    if (cancelError) setError(cancelError.message);
    else load();
  };

  const remove = async (event) => {
    if (!window.confirm(`Delete ${event.title} and its registrations?`)) return;
    const { error: deleteError } = await supabase.from('events').delete().eq('id', event.id);
    if (deleteError) setError(deleteError.message);
    else load();
  };

  return (
    <>
      <h1>Events</h1>
      {error && <p className="error">{error}</p>}

      <div className="card grid">
        <h2>{editing ? 'Edit event' : 'Create event'}</h2>
        <div className="form-grid">
          <div>
            <label>Title</label>
            <input value={form.title} onChange={set('title')} />
          </div>
          <div>
            <label>Date</label>
            <input type="date" value={form.event_date} onChange={set('event_date')} />
          </div>
          <div>
            <label>Start time</label>
            <input type="time" value={form.start_time ?? ''} onChange={set('start_time')} />
          </div>
          <div>
            <label>End time</label>
            <input type="time" value={form.end_time ?? ''} onChange={set('end_time')} />
          </div>
          <div>
            <label>Location</label>
            <input value={form.location ?? ''} onChange={set('location')} />
          </div>
          <div>
            <label>Google Maps link</label>
            <input value={form.maps_url ?? ''} onChange={set('maps_url')} />
          </div>
          <div>
            <label>Organizer</label>
            <input value={form.organizer ?? ''} onChange={set('organizer')} />
          </div>
          <div>
            <label>Available places</label>
            <input type="number" value={form.capacity ?? ''} onChange={set('capacity')} />
          </div>
          <div>
            <label>Membership eligibility</label>
            <select value={form.required_membership} onChange={set('required_membership')}>
              {LEVELS.map((key) => (
                <option key={key} value={key}>
                  {key === 'free' ? 'Everyone' : `${key} and above`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Registration deadline</label>
            <input
              type="date"
              value={form.registration_deadline ?? ''}
              onChange={set('registration_deadline')}
            />
          </div>
          <div>
            <label>Member price</label>
            <input value={form.member_price ?? ''} onChange={set('member_price')} />
          </div>
          <div>
            <label>Non-member price</label>
            <input value={form.non_member_price ?? ''} onChange={set('non_member_price')} />
          </div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={set('status')}>
              {STATUSES.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Event photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => uploadImage(event.target.files?.[0])}
            />
          </div>
        </div>
        <div>
          <label>Description</label>
          <textarea rows={3} value={form.description ?? ''} onChange={set('description')} />
        </div>
        {form.image_url && (
          <img src={form.image_url} alt="" style={{ maxHeight: 120, borderRadius: 12 }} />
        )}
        <div className="row">
          <button onClick={save} disabled={busy}>
            {editing ? 'Save changes' : 'Create event'}
          </button>
          {editing && (
            <button
              className="ghost"
              onClick={() => {
                setEditing(null);
                setForm(emptyEvent);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Eligibility</th>
              <th>Places</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>
                  <strong>{event.title}</strong>
                  <div className="muted">{event.location ?? '—'}</div>
                </td>
                <td>{event.event_date}</td>
                <td>
                  <span className={`badge ${event.required_membership}`}>
                    {event.required_membership}
                  </span>
                </td>
                <td>{event.capacity ?? '—'}</td>
                <td className="muted">{event.status}</td>
                <td>
                  <div className="row">
                    <button className="ghost small" onClick={() => edit(event)}>
                      Edit
                    </button>
                    <button className="ghost small" onClick={() => cancelEvent(event)}>
                      Cancel
                    </button>
                    <button className="danger small" onClick={() => remove(event)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Events;
