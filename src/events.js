import bundled from '../data/events.json';

// Optional hosted feed: publish the same shape as data/events.json at this URL to
// update events without shipping a new build.
const REMOTE_FEED_URL = 'https://www.womenimpactclub.com/events.json';
const REQUEST_TIMEOUT_MS = 6000;

const isEvent = (event) =>
  event && typeof event.title === 'string' && typeof event.date === 'string';

const normalize = (payload) => {
  const events = Array.isArray(payload) ? payload : payload?.events;
  if (!Array.isArray(events)) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const valid = events
    .filter(isEvent)
    .filter((event) => eventStartDate(event) >= startOfToday)
    .sort((a, b) => eventStartDate(a) - eventStartDate(b));
  return valid.length ? valid : null;
};

export const eventStartDate = (event) => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((event.time || '').trim());
  const [year, month, day] = event.date.split('-').map(Number);
  if (!match) return new Date(year, month - 1, day, 9, 0, 0);
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hours += 12;
  return new Date(year, month - 1, day, hours, Number(match[2]), 0);
};

export const bundledEvents = normalize(bundled) ?? [];

export const fetchEvents = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(REMOTE_FEED_URL, { signal: controller.signal });
    if (!response.ok) return { events: bundledEvents, source: 'bundled' };
    const remote = normalize(await response.json());
    return remote
      ? { events: remote, source: 'remote' }
      : { events: bundledEvents, source: 'bundled' };
  } catch {
    return { events: bundledEvents, source: 'bundled' };
  } finally {
    clearTimeout(timeout);
  }
};

export const formatEventDate = (event) =>
  eventStartDate(event).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
