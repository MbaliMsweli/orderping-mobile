import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { getNoteHistory, addNoteHistory } from '@/lib/storage';
import { Colors } from '@/constants/colors';

interface Option {
  id: string;
  icon: string;
  label: string;
}

interface Props {
  heading: string;
  options: Option[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  activeColor: string;
  customPlaceholder?: string;
  statusKey: string;
}

export default function StatusNotePicker({
  heading, options, selected, onSelect, activeColor, customPlaceholder, statusKey,
}: Props) {
  const [history, setHistory] = useState<string[]>([]);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');

  const presetIds = options.map(o => o.id);

  useEffect(() => {
    getNoteHistory(statusKey).then(h => setHistory(h.filter(n => !presetIds.includes(n))));
  }, [statusKey]);

  const isCustomSelected = selected !== null && !presetIds.includes(selected);

  const handleCustomChange = (text: string) => {
    setCustomText(text);
    onSelect(text.trim() ? text : null);
  };

  const handleCustomBlur = () => {
    const note = customText.trim();
    if (!note) return;
    addNoteHistory(statusKey, note);
    setHistory(prev => [note, ...prev.filter(n => n !== note)].slice(0, 3));
  };

  const handleHistoryTap = (note: string) => {
    if (selected === note) {
      onSelect(null);
      setCustomText('');
      setCustomMode(false);
    } else {
      setCustomText(note);
      setCustomMode(true);
      onSelect(note);
    }
  };

  const handleToggleCustom = () => {
    if (customMode) {
      setCustomMode(false);
      setCustomText('');
      if (isCustomSelected) onSelect(null);
    } else {
      setCustomMode(true);
    }
  };

  return (
    <View style={s.card}>
      <Text style={s.heading}>{heading}</Text>

      <View style={s.optionList}>
        {options.map(opt => {
          const active = selected === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[s.option, active && { borderColor: activeColor, backgroundColor: activeColor + '15' }]}
              onPress={() => {
                if (active) { onSelect(null); }
                else { onSelect(opt.id); setCustomMode(false); setCustomText(''); }
              }}
              activeOpacity={0.8}
            >
              <Text style={s.optionIcon}>{opt.icon}</Text>
              <Text style={[s.optionLabel, active && { color: activeColor, fontWeight: '700' }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {history.length > 0 && (
        <View style={s.historyWrap}>
          {history.map((note, i) => {
            const active = selected === note;
            return (
              <TouchableOpacity
                key={i}
                style={[s.historyItem, active && { borderColor: activeColor, backgroundColor: activeColor + '12' }]}
                onPress={() => handleHistoryTap(note)}
                activeOpacity={0.8}
              >
                <Text style={s.historyIcon}>↩️</Text>
                <Text style={[s.historyLabel, active && { color: activeColor }]} numberOfLines={1}>{note}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={s.customToggle} onPress={handleToggleCustom} activeOpacity={0.8}>
        <Text style={[s.customToggleText, customMode && { color: activeColor }]}>
          {customMode ? '✕  Hide' : '✏️  Write your own...'}
        </Text>
      </TouchableOpacity>

      {customMode && (
        <View>
          <TextInput
            style={[s.customInput, isCustomSelected && { borderColor: activeColor }]}
            value={customText}
            onChangeText={handleCustomChange}
            onBlur={handleCustomBlur}
            placeholder={customPlaceholder ?? 'Add a note...'}
            placeholderTextColor={Colors.textLight}
            maxLength={120}
            autoFocus
          />
          <Text style={s.customHint}>{customText.length}/120 · saves for next time</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card:           { backgroundColor: Colors.surface, marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  heading:        { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase' },
  optionList:     { gap: 8, marginBottom: 4 },
  option:         { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, padding: 12, backgroundColor: Colors.background },
  optionIcon:     { fontSize: 18 },
  optionLabel:    { fontSize: 14, fontWeight: '500', color: Colors.text, flex: 1 },
  historyWrap:    { gap: 6, marginTop: 8 },
  historyItem:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.background },
  historyIcon:    { fontSize: 14 },
  historyLabel:   { fontSize: 13, color: Colors.textMuted, flex: 1 },
  customToggle:   { marginTop: 10, paddingVertical: 6 },
  customToggleText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  customInput:    { backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: Colors.text, marginTop: 8 },
  customHint:     { fontSize: 11, color: Colors.textLight, marginTop: 4, textAlign: 'right' },
});
