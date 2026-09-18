import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { theme } from './theme';

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

const WebScreen = forwardRef(({ uri, onCanGoBackChange }, ref) => {
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useImperativeHandle(ref, () => ({
    goBack: () => webViewRef.current?.goBack(),
  }));

  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    webViewRef.current?.reload();
  }, []);

  const onShouldStartLoadWithRequest = useCallback((request) => {
    if (isInternalUrl(request.url) || request.url === 'about:blank') return true;
    Linking.openURL(request.url).catch(() => {});
    return false;
  }, []);

  if (error) {
    return (
      <ScrollView
        contentContainerStyle={styles.errorContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              reload();
              setTimeout(() => setRefreshing(false), 1000);
            }}
          />
        }
      >
        <Text style={styles.errorTitle}>Can&apos;t reach Women Impact Club</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={reload} accessibilityRole="button">
          <Text style={styles.retryLabel}>Try again</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri }}
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
        onNavigationStateChange={(navState) => onCanGoBackChange?.(navState.canGoBack)}
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
      {loading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={theme.brand} />
        </View>
      ) : null}
    </View>
  );
});

WebScreen.displayName = 'WebScreen';

export default WebScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  webview: { flex: 1, backgroundColor: theme.surface },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
  },
  errorContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: theme.surface,
  },
  errorTitle: { fontSize: 20, fontWeight: '600', color: theme.ink, textAlign: 'center' },
  errorBody: { marginTop: 8, fontSize: 15, color: theme.muted, textAlign: 'center' },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: theme.brand,
  },
  retryLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
