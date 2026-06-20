import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProfile, saveProfile, syncProfileToSupabase, fetchProfileFromSupabase } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

export default function SetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading]               = useState(true);
  const [isGuest, setIsGuest]               = useState(false);
  const [businessType, setBusinessType]     = useState<'product' | 'service'>('product');
  const [businessName, setBusinessName]     = useState('');
  const [businessPhone, setBusinessPhone]   = useState('');
  const [pickupAddress, setPickupAddress]   = useState('');
  const [businessHours, setBusinessHours]         = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [saving, setSaving]                         = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const guest = user?.is_anonymous ?? false;
      setIsGuest(guest);

      let profile = await getProfile();
      if (!profile && !guest) profile = await fetchProfileFromSupabase();
      if (profile) {
        setBusinessType(profile.businessType ?? 'product');
        setBusinessName(profile.businessName);
        setBusinessPhone(profile.businessPhone);
        setPickupAddress(profile.pickupAddress);
        setBusinessHours(profile.businessHours);
        setBusinessDescription(profile.businessDescription ?? '');
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!businessName.trim()) {
      Alert.alert('Required', 'Please enter your business name.');
      return;
    }
    if (!businessDescription.trim()) {
      Alert.alert('Required', 'Please describe your business so messages match your style.');
      return;
    }
    setSaving(true);
    try {
      const profile = {
        businessType,
        businessName:        businessName.trim(),
        businessPhone:       businessPhone.trim(),
        pickupAddress:       pickupAddress.trim(),
        businessHours:       businessHours.trim(),
        businessDescription: businessDescription.trim(),
      };
      await saveProfile(profile);
      if (!isGuest) await syncProfileToSupabase(profile);
      router.replace('/(main)');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      isGuest ? 'Exit Guest Mode' : 'Sign Out',
      isGuest ? 'This will end your guest session.' : 'Are you sure you want to sign out?',
      [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isGuest ? 'Exit Guest Mode' : 'Sign Out', style: 'destructive', onPress: async () => {
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
      <ScrollView style={s.root} contentContainerStyle={[s.content, { paddingTop: insets.top + 20 }]} keyboardShouldPersistTaps="handled">

        {router.canGoBack() && (
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}

        <Text style={s.title}>Business Profile</Text>
        <Text style={s.subtitle}>Set this up once — it fills every message automatically.</Text>

        {/* Business type */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>BUSINESS TYPE</Text>
          <Text style={s.typeHint}>This personalises your statuses and messages.</Text>
          <View style={s.typeRow}>
            <TouchableOpacity
              style={[s.typeCard, businessType === 'product' && s.typeCardActive]}
              onPress={() => setBusinessType('product')}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: businessType === 'product' }}
              accessibilityLabel="Product business type"
            >
              <Text style={s.typeEmoji}>📦</Text>
              <Text style={[s.typeLabel, businessType === 'product' && s.typeLabelActive]}>Product</Text>
              <Text style={s.typeSub}>Orders, shipping{'\n'}& deliveries</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.typeCard, businessType === 'service' && s.typeCardActive]}
              onPress={() => setBusinessType('service')}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: businessType === 'service' }}
              accessibilityLabel="Service business type"
            >
              <Text style={s.typeEmoji}>🔧</Text>
              <Text style={[s.typeLabel, businessType === 'service' && s.typeLabelActive]}>Service</Text>
              <Text style={s.typeSub}>Appointments,{'\n'}technicians & visits</Text>
            </TouchableOpacity>
          </View>
          {businessType === 'service' && (
            <View style={s.typeExamplesBox}>
              <Text style={s.typeExamplesText}>
                Electricians · Plumbers · Salons · Mechanics · Cleaners · Tutors · Installers
              </Text>
            </View>
          )}
        </View>

        {/* Business details */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>DETAILS</Text>
          <View style={s.field}>
            <Text style={s.label}>Business Name *</Text>
            <TextInput style={s.input} value={businessName} onChangeText={setBusinessName}
              placeholder={businessType === 'service' ? 'Bright Fix Electricals' : 'African Butter Essential Oils'}
              placeholderTextColor={Colors.textLight} />
          </View>
          <View style={s.field}>
            <Text style={s.label}>Business Phone (optional)</Text>
            <TextInput style={s.input} value={businessPhone} onChangeText={setBusinessPhone}
              placeholder="071 234 5678" placeholderTextColor={Colors.textLight} keyboardType="phone-pad" />
          </View>
          {businessType === 'product' && (
            <View style={s.field}>
              <Text style={s.label}>Pickup Address (optional)</Text>
              <TextInput style={s.input} value={pickupAddress} onChangeText={setPickupAddress}
                placeholder="42 Main Rd, Sandton" placeholderTextColor={Colors.textLight} />
            </View>
          )}
          <View style={s.field}>
            <Text style={s.label}>{businessType === 'service' ? 'Operating Hours (optional)' : 'Business Hours (optional)'}</Text>
            <TextInput style={s.input} value={businessHours} onChangeText={setBusinessHours}
              placeholder="Mon–Fri 9am–5pm, Sat 9am–1pm" placeholderTextColor={Colors.textLight} />
          </View>
          <View style={[s.field, { marginBottom: 0 }]}>
            <Text style={s.label}>About Your Business *</Text>
            <TextInput
              style={[s.input, { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }]}
              value={businessDescription}
              onChangeText={setBusinessDescription}
              placeholder={
                businessType === 'service'
                  ? 'e.g. We fix electrical faults and install lighting in homes and offices.'
                  : 'e.g. We sell handmade skincare products and hair care bundles.'
              }
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={s.saveBtnText}>Save & Continue</Text>
          }
        </TouchableOpacity>

        {isGuest && (
          <Text style={s.guestNote}>Sign up to sync your profile across devices.</Text>
        )}

        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={s.signOutText}>{isGuest ? 'Exit Guest Mode' : 'Sign Out'}</Text>
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
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 4 },
  field:        { marginBottom: 12 },
  label:        { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input:        { backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, padding: 14, fontSize: 16, color: Colors.text },
  saveBtn:      { backgroundColor: Colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', minHeight: 54, justifyContent: 'center', marginBottom: 12 },
  saveBtnText:  { color: 'white', fontSize: 16, fontWeight: '700' },
  guestNote:    { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginBottom: 12 },
  signOutBtn:   { borderRadius: 16, padding: 16, alignItems: 'center', minHeight: 54, justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.error },
  signOutText:  { color: Colors.error, fontSize: 16, fontWeight: '700' },

  // Business type picker
  typeHint:          { fontSize: 13, color: Colors.textMuted, marginBottom: 14, lineHeight: 18 },
  typeRow:           { flexDirection: 'row', gap: 12 },
  typeCard:          { flex: 1, borderWidth: 2, borderColor: Colors.border, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 14, alignItems: 'center', backgroundColor: Colors.background },
  typeCardActive:    { borderColor: Colors.primary, backgroundColor: Colors.primary + '0D' },
  typeEmoji:         { fontSize: 32, marginBottom: 8 },
  typeLabel:         { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  typeLabelActive:   { color: Colors.primary },
  typeSub:           { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 17 },
  typeExamplesBox:   { marginTop: 14, backgroundColor: Colors.background, borderRadius: 10, padding: 10 },
  typeExamplesText:  { fontSize: 12, color: Colors.textMuted, lineHeight: 18, textAlign: 'center' },
});
