import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { theme } from './theme';

export const LEVEL_STYLE = {
  free: { label: 'FREE', color: '#6B6B6B', bg: '#F1F1F1' },
  bronze: { label: 'BRONZE', color: '#7A5A2E', bg: '#F5E9D8' },
  silver: { label: 'SILVER', color: '#5A5C60', bg: '#ECEEF0' },
  golden: { label: 'GOLDEN', color: '#6B4E06', bg: '#F8E7BC' },
};

export const Badge = ({ level, size = 'md' }) => {
  const style = LEVEL_STYLE[level] ?? LEVEL_STYLE.free;
  return (
    <View style={[s.badge, { backgroundColor: style.bg }, size === 'lg' && s.badgeLg]}>
      <Text style={[s.badgeText, { color: style.color }, size === 'lg' && s.badgeTextLg]}>
        {style.label} MEMBER
      </Text>
    </View>
  );
};

export const Button = ({ title, onPress, variant = 'primary', disabled, loading, style }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityRole="button"
    style={[
      s.btn,
      variant === 'primary' && s.btnPrimary,
      variant === 'outline' && s.btnOutline,
      variant === 'ghost' && s.btnGhost,
      (disabled || loading) && s.btnDisabled,
      style,
    ]}
  >
    {loading ? (
      <ActivityIndicator color={variant === 'primary' ? '#fff' : theme.brand} />
    ) : (
      <Text
        style={[
          s.btnText,
          variant === 'primary' ? s.btnTextPrimary : s.btnTextBrand,
          variant === 'ghost' && s.btnTextGhost,
        ]}
      >
        {title}
      </Text>
    )}
  </TouchableOpacity>
);

export const Field = ({ label, ...props }) => (
  <View style={s.field}>
    {label ? <Text style={s.label}>{label}</Text> : null}
    <TextInput
      placeholderTextColor="#B0B0B0"
      style={s.input}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
    />
  </View>
);

export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;

export const SectionTitle = ({ children, action }) => (
  <View style={s.sectionRow}>
    <Text style={s.section}>{children}</Text>
    {action}
  </View>
);

export const Empty = ({ children }) => <Text style={s.empty}>{children}</Text>;

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.surfaceAlt },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  h1: { fontSize: 28, fontWeight: '800', color: theme.ink },
  h2: { fontSize: 20, fontWeight: '700', color: theme.ink },
  muted: { fontSize: 14, color: theme.muted, lineHeight: 20 },
  section: { fontSize: 13, fontWeight: '800', letterSpacing: 1, color: theme.muted },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.line,
    gap: 10,
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeLg: { paddingHorizontal: 14, paddingVertical: 7 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  badgeTextLg: { fontSize: 12 },
  btn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center' },
  btnPrimary: { backgroundColor: theme.brand },
  btnOutline: { borderWidth: 1.5, borderColor: theme.brand },
  btnGhost: { paddingVertical: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 15, fontWeight: '700' },
  btnTextPrimary: { color: '#fff' },
  btnTextBrand: { color: theme.brand },
  btnTextGhost: { color: theme.muted, fontWeight: '600', fontSize: 13 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: theme.ink },
  input: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.ink,
    backgroundColor: theme.surface,
  },
  empty: { fontSize: 14, color: theme.muted, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
