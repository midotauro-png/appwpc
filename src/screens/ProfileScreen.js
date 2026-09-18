import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

import MembershipCard from '../components/MembershipCard';
import { deleteMyAccount, saveProfile } from '../api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Card, Field, s } from '../ui';
import { theme } from '../theme';

const ProfileScreen = () => {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({
      first_name: profile?.first_name ?? '',
      last_name: profile?.last_name ?? '',
      phone: profile?.phone ?? '',
      country: profile?.country ?? '',
      city: profile?.city ?? '',
    });
  }, [profile]);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setBusy(true);
    try {
      await saveProfile(session.user.id, form);
      await refreshProfile();
      Alert.alert('Profile updated');
    } catch (error) {
      Alert.alert('Could not save', error.message ?? String(error));
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access is needed to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !supabase) return;

    const asset = result.assets[0];
    const path = `${session.user.id}/avatar.jpg`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, decode(asset.base64), { contentType: 'image/jpeg', upsert: true });
    if (error) {
      Alert.alert('Upload failed', error.message);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    await saveProfile(session.user.id, { profile_photo: `${data.publicUrl}?v=${Date.now()}` });
    await refreshProfile();
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete account',
      'This permanently deletes your Women Impact account, profile and registrations. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMyAccount();
            } catch (error) {
              Alert.alert('Could not delete account', error.message ?? String(error));
            }
          },
        },
      ]
    );

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.h1}>Profile</Text>

      <MembershipCard profile={profile} />

      <Card>
        <View style={s.row}>
          {profile?.profile_photo ? (
            <Image
              source={{ uri: profile.profile_photo }}
              style={{ width: 64, height: 64, borderRadius: 32 }}
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: theme.muted }}>No photo</Text>
            </View>
          )}
          <Button title="Change photo" variant="outline" onPress={pickPhoto} />
        </View>

        <Field label="First name" value={form.first_name} onChangeText={set('first_name')} autoCapitalize="words" />
        <Field label="Last name" value={form.last_name} onChangeText={set('last_name')} autoCapitalize="words" />
        <Field label="Mobile / WhatsApp" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <Field label="Country" value={form.country} onChangeText={set('country')} autoCapitalize="words" />
        <Field label="City" value={form.city} onChangeText={set('city')} autoCapitalize="words" />
        <Text style={s.muted}>{profile?.email}</Text>

        <Button title="Save changes" onPress={save} loading={busy} />
      </Card>

      <Button title="Log out" variant="outline" onPress={signOut} />
      <Button title="Delete my account" variant="ghost" onPress={confirmDelete} />
    </ScrollView>
  );
};

export default ProfileScreen;
