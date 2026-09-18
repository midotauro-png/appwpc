import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import AccountFooter from './src/AccountFooter';
import EventsScreen from './src/EventsScreen';
import WebScreen from './src/WebScreen';
import AuthScreen from './src/screens/AuthScreen';
import BenefitsScreen from './src/screens/BenefitsScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MembershipScreen from './src/screens/MembershipScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { savePushToken } from './src/api';
import { isBackendConfigured } from './src/lib/supabase';
import { registerForPushToken } from './src/notifications';
import { SITE_URL, theme } from './src/theme';

const MEMBER_TABS = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'events', label: 'Events', icon: '★' },
  { key: 'community', label: 'Community', icon: '☺' },
  { key: 'benefits', label: 'Benefits', icon: '✦' },
  { key: 'membership', label: 'Membership', icon: '♛' },
  { key: 'profile', label: 'Profile', icon: '⚑' },
];

// Used until the Supabase backend is connected: the app still works as the
// Women Impact Club site plus the native events screen.
const SITE_TABS = [
  { key: 'home', label: 'Home', icon: '⌂', uri: SITE_URL },
  { key: 'events', label: 'Events', icon: '★' },
  { key: 'members', label: 'Members', icon: '☺', uri: `${SITE_URL}/members` },
  { key: 'account', label: 'Account', icon: '⚑', uri: `${SITE_URL}/member-access` },
];

const TabBar = ({ tabs, activeTab, onSelect }) => (
  <View style={styles.tabBar}>
    {tabs.map((tab) => {
      const active = tab.key === activeTab;
      return (
        <TouchableOpacity
          key={tab.key}
          style={styles.tab}
          onPress={() => onSelect(tab.key)}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
        >
          <Text style={[styles.tabIcon, active && styles.tabActive]}>{tab.icon}</Text>
          <Text style={[styles.tabLabel, active && styles.tabActive]}>{tab.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const SiteShell = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [canGoBack, setCanGoBack] = useState(false);
  const [mounted, setMounted] = useState({ home: true });
  const webRefs = useRef({});

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab !== 'home' && !canGoBack) {
        setActiveTab('home');
        return true;
      }
      if (canGoBack) {
        webRefs.current[activeTab]?.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [activeTab, canGoBack]);

  return (
    <>
      <View style={styles.content}>
        {SITE_TABS.filter((tab) => mounted[tab.key]).map((tab) => (
          <View
            key={tab.key}
            style={[styles.screen, activeTab !== tab.key && styles.hidden]}
            pointerEvents={activeTab === tab.key ? 'auto' : 'none'}
          >
            {tab.uri ? (
              <WebScreen
                ref={(instance) => {
                  webRefs.current[tab.key] = instance;
                }}
                uri={tab.uri}
                onCanGoBackChange={(value) => {
                  if (activeTab === tab.key) setCanGoBack(value);
                }}
              />
            ) : (
              <EventsScreen />
            )}
            {tab.key === 'account' && <AccountFooter />}
          </View>
        ))}
      </View>
      <TabBar
        tabs={SITE_TABS}
        activeTab={activeTab}
        onSelect={(key) => {
          setCanGoBack(false);
          setMounted((prev) => ({ ...prev, [key]: true }));
          setActiveTab(key);
        }}
      />
    </>
  );
};

const MemberShell = () => {
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab === 'home') return false;
      setActiveTab('home');
      return true;
    });
    return () => subscription.remove();
  }, [activeTab]);

  const screens = {
    home: <DashboardScreen onNavigate={setActiveTab} />,
    events: <EventsScreen />,
    community: <CommunityScreen onNavigate={setActiveTab} />,
    benefits: <BenefitsScreen />,
    membership: <MembershipScreen />,
    profile: <ProfileScreen />,
    notifications: <NotificationsScreen />,
  };

  return (
    <>
      <View style={styles.content}>{screens[activeTab]}</View>
      <TabBar tabs={MEMBER_TABS} activeTab={activeTab} onSelect={setActiveTab} />
    </>
  );
};

const Root = () => {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!session) return;
    registerForPushToken().then((token) => {
      if (token) savePushToken(session.user.id, token, Platform.OS);
    });
  }, [session]);

  if (!isBackendConfigured) return <SiteShell />;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    );
  }

  return session ? <MemberShell /> : <AuthScreen />;
};

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <Root />
      </SafeAreaView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  content: { flex: 1 },
  screen: { flex: 1 },
  hidden: { display: 'none' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.line,
    backgroundColor: theme.surface,
    paddingBottom: Platform.OS === 'ios' ? 18 : 8,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 18, color: theme.muted },
  tabLabel: { fontSize: 10, color: theme.muted },
  tabActive: { color: theme.brand, fontWeight: '700' },
});
