import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  businessType: 'product' | 'service' | undefined;
  orderText:    string;
  setOrderText: (v: string) => void;
  extracting:   boolean;
  onExtract:    () => void;
}

export default function OrderPaste({ businessType, orderText, setOrderText, extracting, onExtract }: Props) {
  return (
    <View style={s.card}>
      <Text style={s.sectionLabel}>{businessType === 'service' ? 'PASTE BOOKING' : 'PASTE ORDER'}</Text>
      <TextInput
        style={s.pasteInput}
        value={orderText}
        onChangeText={setOrderText}
        multiline
        placeholder={businessType === 'service'
          ? 'Paste the booking here — name, phone, appointment details...\n\nThe app will extract everything automatically.'
          : 'Paste the full order here — name, phone, email, items...\n\nThe app will extract everything automatically.'}
        placeholderTextColor={Colors.textLight}
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[s.extractBtn, orderText.trim() && s.extractBtnActive, (!orderText.trim() || extracting) && { opacity: 0.5 }]}
        onPress={onExtract}
        disabled={!orderText.trim() || extracting}
        activeOpacity={0.85}
      >
        {extracting
          ? <ActivityIndicator color={orderText.trim() ? '#fff' : Colors.text} size="small" />
          : <Text style={[s.extractBtnText, orderText.trim() && s.extractBtnTextActive]}>⚡ Extract Details</Text>}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card:         { backgroundColor: Colors.surface, marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.0, marginBottom: 14, textTransform: 'uppercase' },

  pasteInput:           { backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 14, fontSize: 15, color: Colors.text, minHeight: 100, lineHeight: 24, marginBottom: 10 },
  extractBtn:           { backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 14, alignItems: 'center' },
  extractBtnActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  extractBtnText:       { fontSize: 15, fontWeight: '600', color: Colors.text, letterSpacing: 0.1 },
  extractBtnTextActive: { color: '#fff' },
});
