import { ScrollView, Text, View } from 'react-native';

import { useAuth, LEVEL_RANK } from '../context/AuthContext';
import { Badge, Card, Empty, s } from '../ui';
import { theme } from '../theme';

const BenefitsScreen = () => {
  const { levels, features, profile, rank } = useAuth();

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.h1}>Benefits</Text>
      <Badge level={profile?.membership_level ?? 'free'} size="lg" />

      {features.length === 0 ? (
        <Empty>Benefits will appear once the backend is connected.</Empty>
      ) : (
        <Card>
          {features
            .filter((feature) => feature.is_enabled)
            .map((feature) => {
              const unlocked = rank >= (LEVEL_RANK[feature.min_level] ?? 0);
              return (
                <View key={feature.feature_key} style={[s.sectionRow, { paddingVertical: 6 }]}>
                  <Text style={[s.muted, unlocked && { color: theme.ink, fontWeight: '600' }]}>
                    {unlocked ? '✓ ' : '🔒 '}
                    {feature.label}
                  </Text>
                  <Badge level={feature.min_level} />
                </View>
              );
            })}
        </Card>
      )}

      {levels.map((level) => (
        <Card key={level.key}>
          <View style={s.sectionRow}>
            <Text style={s.h2}>{level.name}</Text>
            <Badge level={level.key} />
          </View>
          {(level.benefits ?? []).map((benefit) => (
            <Text key={benefit} style={s.muted}>
              · {benefit}
            </Text>
          ))}
        </Card>
      ))}
    </ScrollView>
  );
};

export default BenefitsScreen;
