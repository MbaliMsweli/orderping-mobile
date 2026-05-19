import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getProfile, fetchProfileFromSupabase } from '@/lib/storage';
import { Colors } from '@/constants/colors';

type Mode = 'signin' | 'signup' | 'forgot';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    if (mode === 'signup') {
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
      }
      let profile = await getProfile();
      if (!profile) profile = await fetchProfileFromSupabase();
      router.replace(profile ? '/(main)' : '/(setup)');
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : '').toLowerCase();
      if (msg.includes('invalid') || msg.includes('credentials')) {
        setError('Wrong email or password.');
      } else if (msg.includes('already registered')) {
        setError('Account exists. Sign in instead.');
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInAnonymously();
      if (err) throw err;
      const profile = await getProfile();
      router.replace(profile ? '/(main)' : '/(setup)');
    } catch {
      setError('Could not start guest session. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setError('');
    if (!email.trim()) { setError('Enter your email address.'); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://www.orderping.net/auth/reset',
      });
      if (err) throw err;
      setResetSent(true);
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('too many')) {
        setError('Too many attempts. Please wait a moment.');
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password view ──────────────────────────────────────────────────
  if (mode === 'forgot') {
    return (
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.brand}>
            <Text style={s.brandText}>
              <Text style={s.brandOrder}>Order</Text>
              <Text style={s.brandPing}>Ping</Text>
            </Text>
            <Text style={s.tagline}>One click. Communicate. Connect.</Text>
          </View>

          <TouchableOpacity onPress={() => { setMode('signin'); setError(''); setResetSent(false); }} style={s.backBtn}>
            <Text style={s.backText}>← Back to sign in</Text>
          </TouchableOpacity>

          {resetSent ? (
            <View style={s.sentCard}>
              <Text style={s.sentIcon}>✉️</Text>
              <Text style={s.sentTitle}>Check your inbox</Text>
              <Text style={s.sentBody}>
                We sent a reset link to{' '}
                <Text style={s.sentEmail}>{email}</Text>.
                {'\n'}Click it to set a new password.
              </Text>
              <TouchableOpacity onPress={() => { setResetSent(false); setError(''); }}>
                <Text style={s.tryAgain}>Didn&apos;t get it? Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={s.forgotHint}>
                Enter your email and we&apos;ll send you a link to reset your password.
              </Text>
              <View style={s.fields}>
                <TextInput
                  style={s.input}
                  placeholder="Email"
                  placeholderTextColor={Colors.textLight}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              {error ? <Text style={s.error}>{error}</Text> : null}

              <TouchableOpacity style={s.submitBtn} onPress={handleForgot} disabled={loading} activeOpacity={0.85}>
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={s.submitText}>Send Reset Link</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Sign in / Sign up view ────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Brand */}
        <View style={s.brand}>
          <Text style={s.brandText}>
            <Text style={s.brandOrder}>Order</Text>
            <Text style={s.brandPing}>Ping</Text>
          </Text>
          <Text style={s.tagline}>One click. Communicate. Connect.</Text>
        </View>

        {/* Toggle */}
        <View style={s.toggle}>
          {(['signin', 'signup'] as const).map((m) => (
            <TouchableOpacity key={m} style={[s.toggleBtn, mode === m && s.toggleActive]}
              onPress={() => { setMode(m); setError(''); }}>
              <Text style={[s.toggleText, mode === m && s.toggleTextActive]}>
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fields */}
        <View style={s.fields}>
          <TextInput style={s.input} placeholder="Email" placeholderTextColor={Colors.textLight}
            value={email} onChangeText={setEmail} keyboardType="email-address"
            autoCapitalize="none" autoCorrect={false} />
          <View>
            <TextInput style={s.input} placeholder="Password" placeholderTextColor={Colors.textLight}
              value={password} onChangeText={setPassword} secureTextEntry />
            {mode === 'signin' && (
              <TouchableOpacity
                onPress={() => { setMode('forgot'); setError(''); setResetSent(false); }}
                style={s.forgotLink}
              >
                <Text style={s.forgotLinkText}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </View>
          {mode === 'signup' && (
            <TextInput style={s.input} placeholder="Confirm Password" placeholderTextColor={Colors.textLight}
              value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          )}
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={s.submitText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
          }
        </TouchableOpacity>

        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.dividerLine} />
        </View>

        <TouchableOpacity onPress={handleGuest} disabled={loading} style={s.guestBtn} activeOpacity={0.8}>
          {loading
            ? <ActivityIndicator color={Colors.textMuted} />
            : <Text style={s.guestText}>Continue as Guest</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }} style={s.switchWrap}>
          <Text style={s.switchText}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={s.switchLink}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: Colors.background },
  scroll:           { flexGrow: 1, padding: 24, paddingTop: 80, paddingBottom: 40 },
  brand:            { alignItems: 'center', marginBottom: 40 },
  brandText:        { fontSize: 36, letterSpacing: -0.5 },
  brandOrder:       { color: Colors.text, fontWeight: '600' },
  brandPing:        { color: Colors.primary, fontWeight: '800' },
  tagline:          { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  toggle:           { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 24 },
  toggleBtn:        { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleActive:     { backgroundColor: Colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  toggleText:       { fontSize: 15, fontWeight: '500', color: Colors.textMuted },
  toggleTextActive: { color: Colors.primary, fontWeight: '700' },
  fields:           { gap: 12, marginBottom: 16 },
  input:            { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 16, fontSize: 16, color: Colors.text },
  error:            { color: Colors.error, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  submitBtn:        { backgroundColor: Colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 20, minHeight: 54, justifyContent: 'center' },
  submitText:       { color: 'white', fontSize: 16, fontWeight: '700' },
  divider:          { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine:      { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText:      { marginHorizontal: 12, fontSize: 13, color: Colors.textLight },
  guestBtn:         { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 16, padding: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  guestText:        { fontSize: 15, fontWeight: '600', color: Colors.textMuted },
  switchWrap:       { marginTop: 20 },
  switchText:       { textAlign: 'center', color: Colors.textMuted, fontSize: 14 },
  switchLink:       { color: Colors.primary, fontWeight: '600' },

  // Forgot password
  forgotLink:       { alignSelf: 'flex-end', marginTop: 6 },
  forgotLinkText:   { fontSize: 13, fontWeight: '600', color: Colors.primary },
  backBtn:          { marginBottom: 24 },
  backText:         { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  forgotHint:       { fontSize: 15, color: Colors.textMuted, lineHeight: 22, marginBottom: 20 },
  sentCard:         { backgroundColor: Colors.surface, borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  sentIcon:         { fontSize: 40, marginBottom: 12 },
  sentTitle:        { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  sentBody:         { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  sentEmail:        { fontWeight: '700', color: Colors.text },
  tryAgain:         { fontSize: 13, fontWeight: '600', color: Colors.primary },
});
