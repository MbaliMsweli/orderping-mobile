import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getProfile, saveProfile, syncProfileToSupabase, fetchProfileFromSupabase } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

export default function SetupScreen() {
  const router = useRouter();
  const [loading, setLoading]           = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      let profile = await getProfile();
      if (!profile) profile = await fetchProfileFromSupabase();
      if (profile) {
        setBusinessName(profile.businessName);
        setBusinessPhone(profile.businessPhone);
        setPickupAddress(profile.pickupAddress);
        setBusinessHours(profile.businessHours);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!businessName.trim()) {
      Alert.alert('Required', 'Please enter your business name.');
      return;
    }
    setSaving(true);
    try {
      const profile = {
        businessName:  businessName.trim(),
        businessPhone: businessPhone.trim(),
        pickupAddress: pickupAddress.trim(),
        businessHours: businessHours.trim(),
      };
      await saveProfile(profile);
      await syncProfileToSupabase(profile);
      router.replace('/(main)');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {router.canGoBack() && (
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}

        <Text style={s.title}>Business Profile</Text>
        <Text style={s.subtitle}>Set this up once — it fills every message automatically.</Text>

        {/* Business details */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>DETAILS</Text>
          <View style={s.field}>
            <Text style={s.label}>Business Name *</Text>
            <TextInput style={s.input} value={businessName} onChangeText={setBusinessName}
              placeholder="African Butter Essential Oils" placeholderTextColor={Colors.textLight} />
          </View>
          <View style={s.field}>
            <Text style={s.label}>Business Phone (optional)</Text>
            <TextInput style={s.input} value={businessPhone} onChangeText={setBusinessPhone}
              placeholder="071 234 5678" placeholderTextColor={Colors.textLight} keyboardType="phone-pad" />
          </View>
          <View style={s.field}>
            <Text style={s.label}>Pickup Address (optional)</Text>
            <TextInput style={s.input} value={pickupAddress} onChangeText={setPickupAddress}
              placeholder="42 Main Rd, Sandton" placeholderTextColor={Colors.textLight} />
          </View>
          <View style={[s.field, { marginBottom: 0 }]}>
            <Text style={s.label}>Business Hours (optional)</Text>
            <TextInput style={s.input} value={businessHours} onChangeText={setBusinessHours}
              placeholder="Mon–Fri 9am–5pm, Sat 9am–1pm" placeholderTextColor={Colors.textLight} />
          </View>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={s.saveBtnText}>Save & Continue</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.background },
  content:      { padding: 20, paddingBottom: 60 },
  backBtn:      { marginTop: 32, marginBottom: 16 },
  backBtnText:  { fontSize: 15, fontWeight: '600', color: Colors.primary },
  title:        { fontSize: 26, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  subtitle:     { fontSize: 14, color: Colors.textMuted, marginBottom: 24, lineHeight: 20 },
  card:         { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 12 },
  field:        { marginBottom: 12 },
  label:        { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input:        { backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, padding: 14, fontSize: 16, color: Colors.text },
  saveBtn:      { backgroundColor: Colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', minHeight: 54, justifyContent: 'center', marginBottom: 12 },
  saveBtnText:  { color: 'white', fontSize: 16, fontWeight: '700' },
  signOutBtn:   { borderRadius: 16, padding: 16, alignItems: 'center', minHeight: 54, justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.error },
  signOutText:  { color: Colors.error, fontSize: 16, fontWeight: '700' },
});
