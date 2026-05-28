import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  customerName:    string;
  setCustomerName: (v: string) => void;
  phoneNumber:     string;
  setPhoneNumber:  (v: string) => void;
  email:           string;
  setEmail:        (v: string) => void;
}

export default function CustomerInputs({ customerName, setCustomerName, phoneNumber, setPhoneNumber, email, setEmail }: Props) {
  return (
    <View style={s.card}>
      <Text style={s.sectionLabel}>CUSTOMER</Text>

      <View style={s.fieldRow}>
        <Text style={s.fieldIcon}>👤</Text>
        <Text style={s.fieldLabel}>NAME</Text>
      </View>
      <TextInput style={s.input} value={customerName} onChangeText={setCustomerName}
        placeholder="Thandi" placeholderTextColor={Colors.textLight} />

      <View style={[s.fieldRow, { marginTop: 12 }]}>
        <Text style={s.fieldIcon}>📞</Text>
        <Text style={s.fieldLabel}>PHONE</Text>
      </View>
      <TextInput style={s.input} value={phoneNumber} onChangeText={setPhoneNumber}
        placeholder="0712345678" placeholderTextColor={Colors.textLight} keyboardType="phone-pad" />

      <View style={[s.fieldRow, { marginTop: 12 }]}>
        <Text style={s.fieldIcon}>✉️</Text>
        <Text style={s.fieldLabel}>EMAIL (OPTIONAL)</Text>
      </View>
      <TextInput style={s.input} value={email} onChangeText={setEmail}
        placeholder="thandi@example.com" placeholderTextColor={Colors.textLight}
        keyboardType="email-address" autoCapitalize="none" />
    </View>
  );
}

const s = StyleSheet.create({
  card:         { backgroundColor: Colors.surface, marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.0, marginBottom: 14, textTransform: 'uppercase' },
  fieldRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fieldIcon:    { fontSize: 13 },
  fieldLabel:   { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  input:        { backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 14, fontSize: 16, color: Colors.text, lineHeight: 22 },
});
