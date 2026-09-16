import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { requestUpgrade } from '../api';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, Empty, s } from '../ui';
import { theme } from '../theme';

const MembershipScreen = () => {
  const { profile, levels, session, rank } = useAuth();
  const [busy, setBusy] = useState(null);

  const upgrade = async (level) => {
    if (!session) {
      Alert.alert('Sign in required', 'Create an account to request a membership upgrade.');
      return;
    }
    setBusy(level.key);
    try {
      await requestUpgrade(session.user.id, profile?.membership_level ?? 'free', level.key);
      Alert.alert(
        'Request received',
        `The Women Impact team will contact you about your ${level.name} upgrade.`
      );
    } catch (error) {
      Alert.alert('Could not send request', error.message ?? String(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.h1}>Membership</Text>
      <Text style={s.muted}>
        Every level unlocks more of the Women Impact community. Upgrades are approved by the team.
      </Text>

      {levels.length === 0 ? (
        <Empty>Membership plans will appear once the backend is connected.</Empty>
      ) : (
        levels.map((level) => {
          const current = profile?.membership_level === level.key;
          return (
            <Card key={level.key} style={current && { borderColor: theme.brand, borderWidth: 1.5 }}>
              <View style={s.sectionRow}>
                <Text style={s.h2}>{level.name}</Text>
                <Badge level={level.key} />
              </View>
              <Text style={s.muted}>{level.price_label ?? ''}</Text>
              {(level.benefits ?? []).map((benefit) => (
                <Text key={benefit} style={s.muted}>
                  · {benefit}
                </Text>
              ))}
              {current ? (
                <Text style={{ color: theme.brand, fontWeight: '700', marginTop: 8 }}>
                  Your current membership
                </Text>
              ) : level.rank > rank ? (
                <Button
                  title={`Request ${level.name}`}
                  variant="outline"
                  loading={busy === level.key}
                  onPress={() => upgrade(level)}
                  style={{ marginTop: 8 }}
                />
              ) : null}
            </Card>
          );
        })
      )}
    </ScrollView>
  );
};

export default MembershipScreen;
