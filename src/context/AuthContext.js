import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('membership_levels')
      .select('*')
      .order('sort_order')
      .then(({ data }) => setLevels(data ?? []));
    supabase
      .from('feature_permissions')
      .select('*')
      .then(({ data }) => setFeatures(data ?? []));
  }, [session]);

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
      refreshProfile: () => loadProfile(session?.user?.id),
      signOut: () => supabase?.auth.signOut(),
    }),
    [session, profile, levels, features, loading, rank, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
