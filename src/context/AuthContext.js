import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { isBackendConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const LEVEL_RANK = { free: 0, bronze: 1, silver: 2, golden: 3 };

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [levels, setLevels] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(isBackendConfigured);

  const loadProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return setProfile(null);
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session ?? null);
      await loadProfile(data.session?.user?.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      loadProfile(next?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Admins change levels and feature gates from the dashboard, so the app
  // reloads them instead of trusting what it read at launch.
  const loadAccess = useCallback(async () => {
    if (!supabase) return;
    const [levelRows, featureRows] = await Promise.all([
      supabase.from('membership_levels').select('*').order('sort_order'),
      supabase.from('feature_permissions').select('*'),
    ]);
    setLevels(levelRows.data ?? []);
    setFeatures(featureRows.data ?? []);
  }, []);

  useEffect(() => {
    loadAccess();
  }, [session, loadAccess]);

  useEffect(() => {
    if (!supabase) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      loadAccess();
      loadProfile(session?.user?.id);
    });
    return () => sub.remove();
  }, [session, loadAccess, loadProfile]);

  const rank = LEVEL_RANK[profile?.membership_level] ?? 0;

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      levels,
      features,
      loading,
      rank,
      isAdmin: Boolean(profile?.is_admin),
      hasFeature: (key) => {
        const feature = features.find((f) => f.feature_key === key);
        if (!feature || !feature.is_enabled) return Boolean(profile?.is_admin);
        return profile?.is_admin || rank >= (LEVEL_RANK[feature.min_level] ?? 0);
      },
      canAccessLevel: (levelKey) => rank >= (LEVEL_RANK[levelKey] ?? 0),
      refreshProfile: () => Promise.all([loadProfile(session?.user?.id), loadAccess()]),
      signOut: () => supabase?.auth.signOut(),
    }),
    [session, profile, levels, features, loading, rank, loadProfile, loadAccess]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
