import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/colors';
import type { Tone, Channel } from '@/lib/status-config';
import type { BusinessProfile } from '@/lib/storage';
import type { FrustrationResult } from '@/lib/frustration';

interface Props {
  tone:           Tone;
  setTone:        (v: Tone) => void;
  profile:        BusinessProfile | null;
  message:        string;
  setMessage:     (v: string) => void;
  generating:     boolean;
  email:          string;
  frustration:    FrustrationResult;
  onGenerate:     () => void;
  onSend:         (channel: Channel) => void;
  onClear:        () => void;
}

export default function MessageEditor({
  tone, setTone, profile, message, setMessage, generating,
  email, frustration, onGenerate, onSend, onClear,
}: Props) {
  const isService = (profile?.businessType ?? 'product') === 'service';
  const tones = isService
    ? (['friendly', 'professional', 'apologetic', 'reassuring'] as Tone[])
    : (['friendly', 'professional', 'apologetic'] as Tone[]);

  return (
    <>
      {/* Mood insight */}
      {frustration.level !== 'none' && (
        <View style={[s.moodCard, frustration.level === 'high' && s.moodCardHigh]}>
          <View style={s.moodHeader}>
            <View style={s.moodIconWrap}>
              <Text style={s.moodIcon}>{frustration.level === 'high' ? '⚠️' : '🔍'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.moodTitle, frustration.level === 'high' && s.moodTitleHigh]}>
                {frustration.level === 'high' ? 'Customer may be frustrated' : 'Customer needs extra care'}
              </Text>
              <Text style={s.moodSub}>Tone auto-set to Apologetic</Text>
            </View>
          </View>
          <View style={s.moodSignals}>
            {frustration.signals.map((sig, i) => (
              <View key={i} style={[s.moodPill, frustration.level === 'high' && s.moodPillHigh]}>
                <Text style={[s.moodPillText, frustration.level === 'high' && s.moodPillTextHigh]}>{sig}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Tone */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>TONE</Text>
        <View style={s.toneRow}>
          {tones.map(t => (
            <TouchableOpacity
              key={t}
              style={[s.tonePill, tone === t && s.tonePillActive]}
              onPress={() => setTone(t)}
              activeOpacity={0.8}
            >
              <Text style={[s.tonePillText, tone === t && s.tonePillTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Generate */}
      <TouchableOpacity
        style={[s.generateBtn, generating && s.generateBtnDisabled]}
        onPress={onGenerate}
        disabled={generating}
        activeOpacity={0.88}
      >
        {generating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <View style={s.generateBtnInner}>
            <Text style={s.generateBtnIcon}>✨</Text>
            <Text style={s.generateBtnText}>Generate Customer Update</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Message + send */}
      {!!message && (
        <View style={s.card}>
          <Text style={s.sectionLabel}>MESSAGE</Text>
          <TextInput
            style={s.messageInput}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />
          <Text style={s.charCount}>
            {message.length} chars · {Math.ceil(message.length / 160)} SMS segment{Math.ceil(message.length / 160) !== 1 ? 's' : ''}
          </Text>
          <View style={s.sendRow}>
            <TouchableOpacity style={[s.sendBtn, { backgroundColor: Colors.whatsapp }]} onPress={() => onSend('whatsapp')} activeOpacity={0.85}>
              <Text style={s.sendBtnText} numberOfLines={1}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.sendBtn, { backgroundColor: Colors.sms }]} onPress={() => onSend('sms')} activeOpacity={0.85}>
              <Text style={s.sendBtnText} numberOfLines={1}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.sendBtn, { backgroundColor: Colors.email }]}
              onPress={() => {
                if (!email.trim()) { Alert.alert('No email', 'Enter the customer\'s email address above.'); return; }
                onSend('email');
              }}
              activeOpacity={0.85}
            >
              <Text style={s.sendBtnText} numberOfLines={1}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.sendBtn, { backgroundColor: Colors.textMuted }]} onPress={() => onSend('copy')} activeOpacity={0.85}>
              <Text style={s.sendBtnText} numberOfLines={1}>Copy</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onGenerate} style={s.regenerateBtn} disabled={generating}>
            <Text style={s.regenerateText}>↻  Regenerate</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Clear */}
      <TouchableOpacity onPress={onClear} style={s.clearBtn} activeOpacity={0.8}>
        <Text style={s.clearBtnText}>↺  Clear & Start New</Text>
      </TouchableOpacity>
    </>
  );
}

const s = StyleSheet.create({
  card:         { backgroundColor: Colors.surface, marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.0, marginBottom: 14, textTransform: 'uppercase' },

  // Mood
  moodCard:         { backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A', borderRadius: 18, marginHorizontal: 16, marginTop: 16, paddingVertical: 14, paddingHorizontal: 16 },
  moodCardHigh:     { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  moodHeader:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  moodIconWrap:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' },
  moodIcon:         { fontSize: 16 },
  moodTitle:        { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 1 },
  moodTitleHigh:    { color: '#78350F' },
  moodSub:          { fontSize: 12, fontWeight: '500', color: '#B45309' },
  moodSignals:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  moodPill:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
  moodPillHigh:     { backgroundColor: '#FFEDD5', borderColor: '#FED7AA' },
  moodPillText:     { fontSize: 11, fontWeight: '600', color: '#92400E' },
  moodPillTextHigh: { color: '#78350F' },

  // Tone
  toneRow:            { flexDirection: 'row', gap: 8 },
  tonePill:           { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 50, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  tonePillActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tonePillText:       { fontSize: 14, fontWeight: '500', color: Colors.textMuted },
  tonePillTextActive: { color: '#fff', fontWeight: '600' },

  // Generate
  generateBtn:         { marginHorizontal: 16, marginTop: 20, backgroundColor: Colors.primary, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 24, minHeight: 68, justifyContent: 'center', shadowColor: Colors.primary, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  generateBtnDisabled: { opacity: 0.7, shadowOpacity: 0.15 },
  generateBtnInner:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  generateBtnIcon:     { fontSize: 26 },
  generateBtnText:     { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },

  // Message
  messageInput:   { backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 14, fontSize: 15, color: Colors.text, minHeight: 150, lineHeight: 24 },
  charCount:      { fontSize: 12, fontWeight: '500', color: Colors.textLight, textAlign: 'right', marginTop: 8, marginBottom: 14 },
  sendRow:        { flexDirection: 'row', gap: 6, marginBottom: 12 },
  sendBtn:        { flex: 1, paddingVertical: 13, paddingHorizontal: 2, borderRadius: 14, alignItems: 'center' },
  sendBtnText:    { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.1 },
  regenerateBtn:  { alignItems: 'center', paddingVertical: 10 },
  regenerateText: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },

  // Clear
  clearBtn:     { alignItems: 'center', justifyContent: 'center', marginTop: 12, marginHorizontal: 16, paddingVertical: 15, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  clearBtnText: { color: Colors.textMuted, fontSize: 15, fontWeight: '700' },
});
