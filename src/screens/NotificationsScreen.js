import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';

import { loadNotifications } from '../api';
import { Card, Empty, s } from '../ui';
import { theme } from '../theme';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setNotifications(await loadNotifications());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={theme.brand}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <Text style={s.h1}>Notifications</Text>
      {notifications.length === 0 ? (
        <Empty>Nothing new right now.</Empty>
      ) : (
        notifications.map((note) => (
          <Card key={note.id}>
            <Text style={s.h2}>{note.title}</Text>
            <Text style={s.muted}>{note.message}</Text>
            <Text style={s.muted}>{new Date(note.created_at).toLocaleDateString()}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

export default NotificationsScreen;
