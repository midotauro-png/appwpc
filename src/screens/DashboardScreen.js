import { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, Text, View } from 'react-native';

import MembershipCard from '../components/MembershipCard';
import { loadEvents, loadMyRegistrations, loadNotifications } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatEventDate } from '../events';
import { Badge, Button, Card, Empty, SectionTitle, s } from '../ui';
import { theme } from '../theme';

const STATUS_COPY = {
  pending: 'Awaiting approval',
  approved: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const DashboardScreen = ({ onNavigate }) => {
  const { profile, levels, session } = useAuth();
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [{ events: list }, regs, notes] = await Promise.all([
      loadEvents(),
      loadMyRegistrations(session?.user?.id),
      loadNotifications(),
    ]);
    setEvents(list.slice(0, 3));
    setRegistrations(regs);
    setAnnouncements(notes.slice(0, 3));
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const level = levels.find((l) => l.key === profile?.membership_level);
  const benefits = level?.benefits ?? [];
  const name = profile?.first_name || 'member';

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.brand} />}
    >
      <View style={s.row}>
        {profile?.profile_photo ? (
          <Image source={{ uri: profile.profile_photo }} style={{ width: 52, height: 52, borderRadius: 26 }} />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={s.h1}>Welcome, {name}</Text>
          <Badge level={profile?.membership_level ?? 'free'} />
        </View>
      </View>

      <MembershipCard profile={profile} />

      <SectionTitle
        action={<Button title="See all" variant="ghost" onPress={() => onNavigate('events')} />}
      >
        UPCOMING EVENTS
      </SectionTitle>
      {events.length === 0 ? (
        <Empty>No upcoming events yet.</Empty>
      ) : (
        events.map((event) => (
          <Card key={event.id}>
            <Text style={s.h2}>{event.title}</Text>
            <Text style={s.muted}>
              {formatEventDate(event)} · {event.time ?? 'TBD'} · {event.location ?? 'Bahrain'}
            </Text>
          </Card>
        ))
      )}

      <SectionTitle>MY REGISTRATIONS</SectionTitle>
      {registrations.length === 0 ? (
        <Empty>You have not registered for an event yet.</Empty>
      ) : (
        registrations.map((reg) => (
          <Card key={reg.id}>
            <Text style={s.h2}>{reg.event?.title ?? 'Event'}</Text>
            <Text style={s.muted}>
              {reg.event?.event_date} · {STATUS_COPY[reg.status] ?? reg.status}
            </Text>
          </Card>
        ))
      )}

      <SectionTitle
        action={<Button title="See all" variant="ghost" onPress={() => onNavigate('notifications')} />}
      >
        ANNOUNCEMENTS
      </SectionTitle>
      {announcements.length === 0 ? (
        <Empty>No announcements right now.</Empty>
      ) : (
        announcements.map((note) => (
          <Card key={note.id}>
            <Text style={s.h2}>{note.title}</Text>
            <Text style={s.muted}>{note.message}</Text>
          </Card>
        ))
      )}

      <SectionTitle>YOUR BENEFITS</SectionTitle>
      <Card>
        {benefits.length === 0 ? (
          <Empty>Benefits are being updated.</Empty>
        ) : (
          benefits.map((benefit) => (
            <Text key={benefit} style={s.muted}>
              · {benefit}
            </Text>
          ))
        )}
        {profile?.membership_level !== 'golden' && (
          <Button
            title="Upgrade membership"
            variant="outline"
            onPress={() => onNavigate('membership')}
            style={{ marginTop: 8 }}
          />
        )}
      </Card>
    </ScrollView>
  );
};

export default DashboardScreen;
