import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme, waLink } from './theme';

const REQUEST = 'Hello Women Impact Club, I would like to delete my account and personal data.';

const openDeletionRequest = async () => {
  const mailto = `mailto:info@womenimpactclub.com?subject=${encodeURIComponent(
    'Account deletion request'
  )}&body=${encodeURIComponent(REQUEST)}`;
  if (await Linking.canOpenURL(mailto)) {
    Linking.openURL(mailto).catch(() => {});
    return;
  }
  Linking.openURL(waLink(REQUEST)).catch(() => {});
};

const confirmDeletion = () =>
  Alert.alert(
    'Delete account',
    'We will delete your membership account and personal data within 30 days. Continue to send the request?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send request', style: 'destructive', onPress: openDeletionRequest },
    ]
  );

const AccountFooter = () => (
  <View style={styles.bar}>
    <TouchableOpacity onPress={confirmDeletion} accessibilityRole="button">
      <Text style={styles.link}>Delete my account</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.line,
    backgroundColor: theme.surface,
  },
  link: { fontSize: 13, color: theme.muted, textDecorationLine: 'underline' },
});

export default AccountFooter;
