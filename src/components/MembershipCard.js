import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import QR from 'qrcode/lib/core/qrcode';

import { Badge, LEVEL_STYLE } from '../ui';
import { theme } from '../theme';

const QrCode = ({ value, size = 96 }) => {
  const modules = useMemo(() => {
    try {
      const code = QR.create(value, { errorCorrectionLevel: 'M' });
      const count = code.modules.size;
      const bits = code.modules.data;
      return { count, bits };
    } catch {
      return null;
    }
  }, [value]);

  if (!modules) return null;
  const cell = size / modules.count;

  return (
    <View style={[styles.qr, { width: size, height: size }]}>
      {Array.from({ length: modules.count }).map((_, row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {Array.from({ length: modules.count }).map((__, col) => (
            <View
              key={col}
              style={{
                width: cell,
                height: cell,
                backgroundColor: modules.bits[row * modules.count + col] ? '#111' : '#fff',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

const MembershipCard = ({ profile }) => {
  if (!profile) return null;
  const level = LEVEL_STYLE[profile.membership_level] ?? LEVEL_STYLE.free;
  const name = `${profile.first_name} ${profile.last_name}`.trim() || profile.email;
  const active = profile.membership_status === 'active';
  const payload = JSON.stringify({
    id: profile.member_id,
    level: profile.membership_level,
    status: profile.membership_status,
  });

  return (
    <View style={[styles.card, profile.membership_level === 'golden' && styles.golden]}>
      <View style={styles.header}>
        <Text style={styles.brand}>WOMEN IMPACT</Text>
        <Badge level={profile.membership_level} />
      </View>

      <View style={styles.body}>
        <View style={styles.identity}>
          {profile.profile_photo ? (
            <Image source={{ uri: profile.profile_photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.meta}>{profile.member_id ?? '—'}</Text>
            <Text style={[styles.status, { color: active ? '#1B7F4B' : theme.brand }]}>
              {active ? 'ACTIVE' : profile.membership_status.toUpperCase()}
            </Text>
          </View>
        </View>
        <QrCode value={payload} />
      </View>

      <Text style={styles.footer}>
        {level.label} · {profile.membership_expiry ? `Valid to ${profile.membership_expiry}` : 'No expiry set'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 22,
    padding: 18,
    gap: 16,
  },
  golden: { backgroundColor: '#2A2109', borderWidth: 1, borderColor: theme.gold },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontSize: 20, fontWeight: '800' },
  name: { color: '#fff', fontSize: 17, fontWeight: '700' },
  meta: { color: 'rgba(255,255,255,.62)', fontSize: 12, marginTop: 2 },
  status: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  qr: { backgroundColor: '#fff', padding: 4, borderRadius: 8, overflow: 'hidden' },
  footer: { color: 'rgba(255,255,255,.5)', fontSize: 11, letterSpacing: 0.6 },
});

export default MembershipCard;
