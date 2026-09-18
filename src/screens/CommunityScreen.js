import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Badge, Card, Empty, s } from '../ui';
import { theme } from '../theme';

const CommunityScreen = ({ onNavigate }) => {
  const { hasFeature, profile } = useAuth();
  const [members, setMembers] = useState([]);
  const unlocked = hasFeature('directory');

  useEffect(() => {
    if (!supabase || !unlocked) return;
    supabase
      .from('profiles')
      .select('id,first_name,last_name,city,country,profile_photo,membership_level')
      .eq('membership_status', 'active')
      .order('first_name')
      .limit(100)
      .then(({ data }) => setMembers(data ?? []));
  }, [unlocked]);

  if (!unlocked) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.content}>
        <Text style={s.h1}>Community</Text>
        <Card>
          <Text style={s.h2}>Members only</Text>
          <Text style={s.muted}>
            The member directory unlocks at Silver level. You are currently{' '}
            {(profile?.membership_level ?? 'free').toUpperCase()}.
          </Text>
          <Text
            style={{ color: theme.brand, fontWeight: '700', marginTop: 6 }}
            onPress={() => onNavigate('membership')}
          >
            See membership levels →
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.h1}>Community</Text>
      <Text style={s.muted}>{members.length} active members</Text>
      {members.length === 0 ? (
        <Empty>No members to show yet.</Empty>
      ) : (
        members.map((member) => (
          <Card key={member.id}>
            <View style={s.row}>
              {member.profile_photo ? (
                <Image
                  source={{ uri: member.profile_photo }}
                  style={{ width: 44, height: 44, borderRadius: 22 }}
                />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={s.h2}>
                  {member.first_name} {member.last_name}
                </Text>
                <Text style={s.muted}>
                  {[member.city, member.country].filter(Boolean).join(', ') || '—'}
                </Text>
              </View>
              <Badge level={member.membership_level} />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

export default CommunityScreen;
