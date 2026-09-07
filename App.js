import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

const SITE_URL = 'https://www.womenimpactclub.com';
const BRAND_COLOR = '#B81C36';
const ALLOWED_HOSTS = ['womenimpactclub.com'];

const isInternalUrl = (url) => {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return ALLOWED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
};

export default function App() {
  const webViewRef = useRef(null);
  const canGoBackRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackRef.current && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, []);

  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    webViewRef.current?.reload();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const onShouldStartLoadWithRequest = useCallback((request) => {
    if (isInternalUrl(request.url) || request.url === 'about:blank') return true;
    Linking.openURL(request.url).catch(() => {});
    return false;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        {error ? (
          <ScrollView
            contentContainerStyle={styles.errorContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <Text style={styles.errorTitle}>Can&apos;t reach Women Impact Club</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={reload} accessibilityRole="button">
              <Text style={styles.retryLabel}>Try again</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: SITE_URL }}
            originWhitelist={['https://*', 'http://*']}
            pullToRefreshEnabled
            allowsBackForwardNavigationGestures
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
            onNavigationStateChange={(navState) => {
              canGoBackRef.current = navState.canGoBack;
            }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={({ nativeEvent }) => {
              setLoading(false);
              setError(nativeEvent.description || 'Network request failed.');
            }}
            onHttpError={({ nativeEvent }) => {
              if (nativeEvent.statusCode >= 500) {
                setError(`The site returned an error (${nativeEvent.statusCode}).`);
              }
            }}
            style={styles.webview}
          />
        )}
        {loading && !error ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={BRAND_COLOR} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  content: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorTitle: { fontSize: 20, fontWeight: '600', color: '#1A1A1A', textAlign: 'center' },
  errorBody: { marginTop: 8, fontSize: 15, color: '#5A5A5A', textAlign: 'center' },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: BRAND_COLOR,
  },
  retryLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
