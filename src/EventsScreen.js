import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { loadEvents, loadMyRegistrations, requestEventRegistration } from './api';
import { useAuth } from './context/AuthContext';
import { bundledEvents, eventStartDate, formatEventDate } from './events';
import {
  cancelReminder,
  scheduleEventReminder,
  scheduledReminderIds,
} from './notifications';
import { theme, waLink } from './theme';

const LEVEL_LABEL = {
  free: 'Open to all members',
  bronze: 'Bronze members and above',
  silver: 'Silver members and above',
  golden: 'Golden members only',
};

const calendarLink = (event) => {
  const start = eventStartDate(event);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const stamp = (date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: event.description ?? '',
    location: event.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const EventCard = ({ event, reminderId, eligible, registration, onToggleReminder, onRegister }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.tag}>{event.tag || event.category}</Text>
      {event.featured ? <Text style={styles.featured}>Featured</Text> : null}
    </View>
    <Text style={styles.title}>{event.title}</Text>
    <Text style={styles.eligibility}>
      {LEVEL_LABEL[event.requiredMembership ?? 'free']}
      {eligible ? '' : ' · request required'}
    </Text>
    {event.speaker ? <Text style={styles.speaker}>with {event.speaker}</Text> : null}
    <Text style={styles.meta}>{formatEventDate(event)}</Text>
    <Text style={styles.meta}>
      {event.time || 'Time TBA'} · {event.location || 'Location TBA'}
    </Text>
    {event.description ? <Text style={styles.description}>{event.description}</Text> : null}
    <View style={styles.priceRow}>
      <View style={styles.price}>
        <Text style={styles.priceLabel}>Member</Text>
        <Text style={styles.priceValue}>{event.memberPrice || '—'}</Text>
      </View>
      <View style={styles.price}>
        <Text style={styles.priceLabel}>Non-member</Text>
        <Text style={styles.priceValue}>{event.publicPrice || '—'}</Text>
      </View>
      {typeof event.spotsLeft === 'number' ? (
        <View style={styles.price}>
          <Text style={styles.priceLabel}>Spots left</Text>
          <Text style={styles.priceValue}>{event.spotsLeft}</Text>
        </View>
      ) : null}
    </View>
    <View style={styles.actions}>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => onRegister(event)}
        accessibilityRole="button"
        disabled={Boolean(registration)}
      >
        <Text style={styles.primaryLabel}>
          {registration?.status === 'approved'
            ? 'Registered'
            : registration
              ? 'Request sent'
              : eligible
                ? 'Register'
                : 'Request to join'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryButton, reminderId && styles.secondaryButtonActive]}
        onPress={() => onToggleReminder(event)}
        accessibilityRole="button"
      >
        <Text style={[styles.secondaryLabel, reminderId && styles.secondaryLabelActive]}>
          {reminderId ? 'Reminder on' : 'Remind me'}
        </Text>
      </TouchableOpacity>
    </View>
    <View style={styles.linkRow}>
      <TouchableOpacity onPress={() => Linking.openURL(calendarLink(event)).catch(() => {})}>
        <Text style={styles.link}>Add to calendar</Text>
      </TouchableOpacity>
      {event.mapsUrl ? (
        <TouchableOpacity onPress={() => Linking.openURL(event.mapsUrl).catch(() => {})}>
          <Text style={styles.link}>Open in Maps</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  </View>
);

export default function EventsScreen() {
  const { session, canAccessLevel } = useAuth();
  const [events, setEvents] = useState(bundledEvents);
  const [reminders, setReminders] = useState({});
  const [registrations, setRegistrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [{ events: loaded }, existing, mine] = await Promise.all([
      loadEvents(),
      scheduledReminderIds(),
      loadMyRegistrations(session?.user?.id),
    ]);
    setEvents(loaded);
    setReminders(existing);
    setRegistrations(
      Object.fromEntries((mine ?? []).filter((r) => r.event).map((r) => [r.event.id, r]))
    );
    setLoading(false);
    setRefreshing(false);
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRegister = useCallback(
    async (event) => {
      if (!session) {
        const url =
          event.registrationUrl || waLink(event.waMsg || `Hi, I want to join ${event.title}`);
        Linking.openURL(url).catch(() => Alert.alert('Could not open the registration link.'));
        return;
      }
      try {
        const row = await requestEventRegistration(event.id);
        setRegistrations((current) => ({ ...current, [event.id]: row }));
        Alert.alert(
          row.status === 'approved' ? 'You are registered' : 'Request received',
          row.status === 'approved'
            ? `Your place at ${event.title} is confirmed.`
            : 'Your registration request has been received. The Women Impact team will contact you after reviewing your request.'
        );
      } catch (error) {
        Alert.alert('Could not register', error.message ?? String(error));
      }
    },
    [session]
  );

  const onToggleReminder = useCallback(
    async (event) => {
      const existing = reminders[event.id];
      if (existing) {
        await cancelReminder(existing);
        setReminders((current) => {
          const next = { ...current };
          delete next[event.id];
          return next;
        });
        return;
      }
      const result = await scheduleEventReminder(event);
      if (!result.ok) {
        Alert.alert(
          result.reason === 'permission'
            ? 'Enable notifications to get event reminders.'
            : 'This event starts too soon to schedule a reminder.',
        );
        return;
      }
      setReminders((current) => ({ ...current, [event.id]: result.identifier }));
    },
    [reminders],
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id ?? item.title}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={theme.brand}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upcoming events</Text>
          <Text style={styles.headerSubtitle}>
            Tap “Remind me” and we&apos;ll notify you the day before.
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>No upcoming events right now — check back soon.</Text>
      }
      renderItem={({ item }) => (
        <EventCard
          event={item}
          reminderId={reminders[item.id]}
          registration={registrations[item.id]}
          eligible={canAccessLevel(item.requiredMembership ?? 'free')}
          onToggleReminder={onToggleReminder}
          onRegister={onRegister}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
  list: { padding: 16, paddingBottom: 32, backgroundColor: theme.surfaceAlt },
  header: { paddingVertical: 12 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: theme.ink },
  headerSubtitle: { marginTop: 4, fontSize: 14, color: theme.muted },
  empty: { textAlign: 'center', color: theme.muted, marginTop: 40 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.line,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { fontSize: 11, letterSpacing: 1.2, fontWeight: '700', color: theme.brand },
  featured: { fontSize: 11, fontWeight: '700', color: theme.gold },
  title: { marginTop: 8, fontSize: 19, fontWeight: '700', color: theme.ink },
  speaker: { marginTop: 2, fontSize: 14, fontStyle: 'italic', color: theme.muted },
  eligibility: { marginTop: 6, fontSize: 12, fontWeight: '700', color: theme.gold },
  linkRow: { flexDirection: 'row', gap: 18, marginTop: 12 },
  link: { fontSize: 13, color: theme.muted, textDecorationLine: 'underline' },
  meta: { marginTop: 6, fontSize: 14, color: theme.ink },
  description: { marginTop: 10, fontSize: 14, lineHeight: 20, color: theme.muted },
  priceRow: { flexDirection: 'row', marginTop: 14, gap: 20 },
  price: { flex: 1 },
  priceLabel: { fontSize: 11, textTransform: 'uppercase', color: theme.muted },
  priceValue: { fontSize: 15, fontWeight: '700', color: theme.ink },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.brand,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.brand,
  },
  secondaryButtonActive: { backgroundColor: theme.brand },
  secondaryLabel: { color: theme.brand, fontWeight: '700', fontSize: 15 },
  secondaryLabelActive: { color: '#FFFFFF' },
});
