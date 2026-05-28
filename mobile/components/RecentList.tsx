import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import type { JSX } from 'react';
import { Colors } from '@/constants/colors';
import { relativeTime } from '@/lib/format';
import { STATUS_BADGES, PRODUCT_FILTERS, SERVICE_FILTERS, FILTER_LABELS, CHANNEL_ICONS, type Channel } from '@/lib/status-config';
import type { RecentEntry } from '@/lib/storage';
import type { BusinessProfile } from '@/lib/storage';

interface Props {
  hero:              JSX.Element;
  searchQuery:       string;
  setSearchQuery:    (v: string) => void;
  recentFilter:      string;
  setRecentFilter:   (v: string) => void;
  recentList:        RecentEntry[];
  setRecentList:     (v: RecentEntry[]) => void;
  filteredRecent:    RecentEntry[];
  expandedIndex:     number | null;
  setExpandedIndex:  (v: number | null) => void;
  setShowRecent:     (v: boolean) => void;
  handleRecentTap:   (i: number) => void;
  handleUseContact:  (entry: RecentEntry) => void;
  handleRecentSend:  (entry: RecentEntry, channel: Channel) => void;
  handleClearHistory:() => void;
  profile:           BusinessProfile | null;
}

export default function RecentList({
  hero, searchQuery, setSearchQuery, recentFilter, setRecentFilter,
  recentList, filteredRecent, expandedIndex, setShowRecent,
  handleRecentTap, handleUseContact, handleRecentSend, handleClearHistory,
  profile,
}: Props) {
  // Local input value updates instantly; debounced value drives the filter
  const [inputValue, setInputValue] = useState(searchQuery);
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(inputValue), 200);
    return () => clearTimeout(t);
  }, [inputValue]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {hero}

        <TouchableOpacity onPress={() => setShowRecent(false)} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <View style={s.searchRow}>
          <TextInput
            style={s.searchInput}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Search by name or number…"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterContent} style={s.filterScroll}>
          {(profile?.businessType === 'service' ? SERVICE_FILTERS : PRODUCT_FILTERS).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterPill, recentFilter === f && s.filterPillActive]}
              onPress={() => setRecentFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[s.filterPillText, recentFilter === f && s.filterPillTextActive]}>{FILTER_LABELS[f]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredRecent.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyText}>
              {searchQuery.trim() ? 'No results found.' : 'No messages yet'}
            </Text>
            {!searchQuery.trim() && (
              <TouchableOpacity onPress={() => setShowRecent(false)} style={s.emptyBtn}>
                <Text style={s.emptyBtnText}>Send your first message</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={s.recentList}>
            {filteredRecent.map((entry, i) => {
              const badge    = STATUS_BADGES[entry.status];
              const expanded = expandedIndex === i;
              const preview  = entry.message.replace(/\n/g, ' ').slice(0, 72);
              if (expanded) {
                return (
                  <View key={i} style={s.recentCard}>
                    <TouchableOpacity onPress={() => handleRecentTap(i)} activeOpacity={0.85}>
                      <View style={s.recentCardTop}>
                        <Text style={s.recentName}>{entry.customerName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {badge && (
                            <View style={[s.badge, { backgroundColor: badge.color + '20' }]}>
                              <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
                            </View>
                          )}
                          <Text style={s.recentTime}>{relativeTime(entry.timestamp)}</Text>
                        </View>
                      </View>
                      <View style={s.recentCardMeta}>
                        <Text style={s.recentPhone}>{entry.phoneNumber}</Text>
                        <Text style={s.channelIcon}>{CHANNEL_ICONS[entry.channel] ?? '📋'}</Text>
                      </View>
                    </TouchableOpacity>
                    <Text style={s.recentFullMessage}>{entry.message}</Text>
                    <View style={s.recentSendRow}>
                      <TouchableOpacity style={[s.recentSendBtn, { backgroundColor: Colors.whatsapp }]} onPress={() => handleRecentSend(entry, 'whatsapp')} activeOpacity={0.85}>
                        <Text style={s.recentSendBtnText} numberOfLines={1}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.recentSendBtn, { backgroundColor: Colors.sms }]} onPress={() => handleRecentSend(entry, 'sms')} activeOpacity={0.85}>
                        <Text style={s.recentSendBtnText} numberOfLines={1}>SMS</Text>
                      </TouchableOpacity>
                      {!!entry.email && (
                        <TouchableOpacity style={[s.recentSendBtn, { backgroundColor: Colors.email }]} onPress={() => handleRecentSend(entry, 'email')} activeOpacity={0.85}>
                          <Text style={s.recentSendBtnText} numberOfLines={1}>Email</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[s.recentSendBtn, { backgroundColor: Colors.textMuted }]} onPress={() => handleRecentSend(entry, 'copy')} activeOpacity={0.85}>
                        <Text style={s.recentSendBtnText} numberOfLines={1}>Copy</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => handleUseContact(entry)} style={s.useContactBtn}>
                      <Text style={s.useContactText}>Use this contact for a new message →</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
              return (
                <TouchableOpacity key={i} style={s.recentCard} onPress={() => handleRecentTap(i)} activeOpacity={0.85}>
                  <View style={s.recentCardTop}>
                    <Text style={s.recentName}>{entry.customerName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {badge && (
                        <View style={[s.badge, { backgroundColor: badge.color + '20' }]}>
                          <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                      )}
                      <Text style={s.recentTime}>{relativeTime(entry.timestamp)}</Text>
                    </View>
                  </View>
                  <View style={s.recentCardMeta}>
                    <Text style={s.recentPhone}>{entry.phoneNumber}</Text>
                    <Text style={s.channelIcon}>{CHANNEL_ICONS[entry.channel] ?? '📋'}</Text>
                  </View>
                  <Text style={s.recentPreview} numberOfLines={2}>{preview}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {recentList.length > 0 && (
          <TouchableOpacity onPress={handleClearHistory} style={s.clearHistoryBtn}>
            <Text style={s.clearHistoryText}>Clear History</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },

  backBtn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backBtnText: { fontSize: 15, fontWeight: '600', color: Colors.primary },

  searchRow:   { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  searchInput: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },

  filterScroll:         { marginTop: 8 },
  filterContent:        { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  filterPill:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterPillActive:     { borderColor: Colors.primary, backgroundColor: Colors.primary },
  filterPillText:       { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  filterPillTextActive: { color: '#fff' },

  emptyState:   { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyText:    { fontSize: 15, color: Colors.textMuted, fontWeight: '400', lineHeight: 22, marginBottom: 20 },
  emptyBtn:     { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.1 },

  recentList:        { paddingHorizontal: 16, marginTop: 12, gap: 10 },
  recentCard:        { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  recentCardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  recentName:        { fontSize: 15, fontWeight: '700', color: Colors.text, letterSpacing: -0.1 },
  badge:             { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText:         { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  recentTime:        { fontSize: 12, fontWeight: '500', color: Colors.textLight },
  recentCardMeta:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  recentPhone:       { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  channelIcon:       { fontSize: 14 },
  recentPreview:     { fontSize: 13, fontWeight: '400', color: Colors.textMuted, fontStyle: 'italic', lineHeight: 20 },
  recentFullMessage: { fontSize: 15, color: Colors.text, lineHeight: 24, marginTop: 10, padding: 14, backgroundColor: Colors.background, borderRadius: 12 },
  recentSendRow:     { flexDirection: 'row', gap: 6, marginTop: 12 },
  recentSendBtn:     { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  recentSendBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  useContactBtn:     { marginTop: 10, alignItems: 'center', paddingVertical: 6 },
  useContactText:    { fontSize: 13, color: Colors.primary, fontWeight: '600', letterSpacing: 0.1 },

  clearHistoryBtn:  { alignItems: 'center', padding: 20, marginTop: 8 },
  clearHistoryText: { color: Colors.error, fontSize: 13, fontWeight: '600' },
});
