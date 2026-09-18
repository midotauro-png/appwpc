import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { isBackendConfigured, supabase } from '../lib/supabase';
import { Button, Field, s } from '../ui';
import { theme } from '../theme';

const MODES = { signIn: 'Sign In', signUp: 'Create Account', reset: 'Reset Password' };

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  city: '',
  password: '',
  confirmPassword: '',
};

const AuthScreen = () => {
  const [mode, setMode] = useState('signIn');
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!supabase) {
      Alert.alert('Not connected', 'The membership backend is not configured yet.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim());
        if (error) throw error;
        Alert.alert('Check your email', 'We sent you a link to reset your password.');
        setMode('signIn');
        return;
      }

      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
        return;
      }

      if (!form.firstName.trim() || !form.lastName.trim()) {
        throw new Error('Please enter your first and last name.');
      }
      if (form.password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }
      if (form.password !== form.confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            phone: form.phone.trim(),
            country: form.country.trim(),
            city: form.city.trim(),
          },
        },
      });
      if (error) throw error;
      setForm(emptyForm);
      // With email confirmation on, sign-up returns no session and the member
      // has to confirm first; otherwise they are already signed in.
      if (data.session) {
        Alert.alert('Welcome to Women Impact', 'Your account is ready.');
        return;
      }
      Alert.alert(
        'Verify your email',
        'We sent a verification link to your inbox. Confirm it, then sign in.'
      );
      setMode('signIn');
    } catch (error) {
      Alert.alert('Something went wrong', error.message ?? String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[s.content, { paddingTop: 40 }]} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 64, height: 64, borderRadius: 18 }}
          />
          <Text style={s.h1}>Women Impact</Text>
          <Text style={s.muted}>The private community for women who build.</Text>
        </View>

        {!isBackendConfigured && (
          <View style={[s.card, { borderColor: theme.brand }]}>
            <Text style={s.muted}>
              Membership backend not configured yet — add your Supabase URL and anon key to
              app.json (expo.extra) to enable accounts.
            </Text>
          </View>
        )}

        <View style={s.card}>
          <Text style={s.h2}>{MODES[mode]}</Text>

          {mode === 'signUp' && (
            <>
              <Field label="First name" value={form.firstName} onChangeText={set('firstName')} autoCapitalize="words" />
              <Field label="Last name" value={form.lastName} onChangeText={set('lastName')} autoCapitalize="words" />
            </>
          )}

          <Field
            label="Email"
            value={form.email}
            onChangeText={set('email')}
            keyboardType="email-address"
            placeholder="your@email.com"
          />

          {mode === 'signUp' && (
            <>
              <Field
                label="Mobile / WhatsApp"
                value={form.phone}
                onChangeText={set('phone')}
                keyboardType="phone-pad"
                placeholder="+973 ..."
              />
              <Field label="Country" value={form.country} onChangeText={set('country')} autoCapitalize="words" />
              <Field label="City" value={form.city} onChangeText={set('city')} autoCapitalize="words" />
            </>
          )}

          {mode !== 'reset' && (
            <Field label="Password" value={form.password} onChangeText={set('password')} secureTextEntry />
          )}
          {mode === 'signUp' && (
            <Field
              label="Confirm password"
              value={form.confirmPassword}
              onChangeText={set('confirmPassword')}
              secureTextEntry
            />
          )}

          <Button title={MODES[mode]} onPress={submit} loading={busy} style={{ marginTop: 6 }} />

          {mode === 'signIn' && (
            <>
              <Button title="Forgot password?" variant="ghost" onPress={() => setMode('reset')} />
              <Button title="Create a new account" variant="outline" onPress={() => setMode('signUp')} />
            </>
          )}
          {mode !== 'signIn' && (
            <Button title="Back to sign in" variant="ghost" onPress={() => setMode('signIn')} />
          )}
        </View>

        <Text style={[s.muted, { textAlign: 'center' }]}>
          New members join as Free. The Women Impact team upgrades you to Bronze, Silver or Golden.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AuthScreen;
