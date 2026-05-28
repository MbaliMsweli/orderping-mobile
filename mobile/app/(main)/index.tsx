import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
  Share, Alert, Animated, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getProfile, addRecent, getRecent, fetchAndMergeRecent, clearRecent, incrementTotalSent, getLastMilestone, setLastMilestone, getLastOpen, setLastOpen, getWeekReportDismissed, setWeekReportDismissed, getDraft, saveDraft, clearDraft, getLastCourier, saveLastCourier, getGuestSent, incrementGuestSent, setWasGuest, type BusinessProfile, type RecentEntry, type FormDraft } from '@/lib/storage';
import { openWhatsApp, openSMS, openEmail } from '@/lib/deep-links';
import { captureEvent, identifyUser } from '@/lib/analytics';
import StatusNotePicker from '@/components/StatusNotePicker';
import Confetti from '@/components/Confetti';
import { Colors } from '@/constants/colors';
import { getGreeting, relativeTime } from '@/lib/format';
import { getForgottenCustomers, getWeekKey, getLastWeekSummary, type ForgottenCustomer, type WeekSummary } from '@/lib/engagement';
import { detectFrustration, type FrustrationLevel, type FrustrationResult } from '@/lib/frustration';
import {
  RECEIVED_OPTIONS, DELAY_OPTIONS, DISPATCH_OPTIONS, READY_OPTIONS, PREORDER_OPTIONS,
  COURIERS, STATUSES, SERVICE_STATUSES,
  SERVICE_CONFIRMED_OPTIONS, SERVICE_ON_THE_WAY_OPTIONS, SERVICE_LATE_OPTIONS,
  SERVICE_ARRIVED_OPTIONS, SERVICE_COMPLETED_OPTIONS, SERVICE_RESCHEDULED_OPTIONS,
  SERVICE_PARTS_OPTIONS, SERVICE_FOLLOWUP_OPTIONS,
  STATUS_BADGES, PRODUCT_FILTERS, SERVICE_FILTERS, FILTER_LABELS, CHANNEL_ICONS,
  type Tone, type Channel,
} from '@/lib/status-config';

export default function MainScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [profile, setProfile]   = useState<BusinessProfile | null>(null);
  const [greeting, setGreeting] = useState('');

  // Paste
  const [orderText, setOrderText]   = useState('');
  const [extracting, setExtracting] = useState(false);

  // Customer
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber]   = useState('');
  const [email, setEmail]               = useState('');

  // Courier
  const [courier, setCourier]               = useState<string | null>(null);
  const [otherCourierName, setOtherCourierName] = useState('');
  const [waybill, setWaybill] = useState('');

  // Status + notes + tone + message
  const [status, setStatus]             = useState<string | null>(null);
  const [receivedNote, setReceivedNote] = useState<string | null>(null);
  const [delayReason, setDelayReason]   = useState<string | null>(null);
  const [dispatchDate, setDispatchDate] = useState<string | null>(null);
  const [readyNote, setReadyNote]       = useState<string | null>(null);
  const [preOrderNote, setPreOrderNote] = useState<string | null>(null);
  const [serviceNote, setServiceNote]   = useState<string | null>(null);
  const [appointmentTime, setAppointmentTime] = useState('');
  const [tone, setTone]                 = useState<Tone>('friendly');
  const [message, setMessage]           = useState('');
  const [generating, setGenerating]     = useState(false);

  // Stats + reminder
  const [todayCount, setTodayCount]         = useState(0);
  const [showConfetti, setShowConfetti]     = useState(false);
  const [milestone, setMilestone]           = useState<number | null>(null);
  const [lastEntry, setLastEntry]           = useState<RecentEntry | null>(null);
  const [forgotten, setForgotten]           = useState<ForgottenCustomer[]>([]);

  // Retention cards
  const [weekSummary, setWeekSummary]       = useState<WeekSummary | null>(null);
  const [showWeekCard, setShowWeekCard]     = useState(false);
  const [hoursAway, setHoursAway]           = useState(0);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  // Recent
  const [showRecent, setShowRecent]       = useState(false);
  const [recentList, setRecentList]       = useState<RecentEntry[]>([]);
  const [recentFilter, setRecentFilter]   = useState('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery]     = useState('');

  // Mood detection
  const [frustration, setFrustration] = useState<FrustrationResult>({ level: 'none', signals: [], context: '' });
  const toneAutoSet = useRef(false);

  // Guest mode
  const [isGuest, setIsGuest] = useState(false);
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false);
  const [guestSent, setGuestSent] = useState(0);
  const [showGuestGate, setShowGuestGate] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, { data: { user } }] = await Promise.all([
        getProfile(),
        supabase.auth.getUser(),
      ]);
      if (!p) { router.replace('/(setup)'); return; }
      setProfile(p);
      setGreeting(getGreeting(p.businessName || 'there'));
      const guest = user?.is_anonymous ?? false;
      setIsGuest(guest);
      if (guest) getGuestSent().then(setGuestSent);
      if (user) identifyUser(user.id, { businessType: p.businessType ?? 'product' });

      const recent = await fetchAndMergeRecent();
      const today = new Date().toDateString();
      setRecentList(recent);
      setTodayCount(recent.filter(e => new Date(e.timestamp).toDateString() === today).length);
      setLastEntry(recent[0] ?? null);
      setForgotten(getForgottenCustomers(recent));

      // Session tracking
      const lastOpen = await getLastOpen();
      await setLastOpen();
      const hoursSince = lastOpen ? Math.floor((Date.now() - lastOpen) / 3600000) : 0;
      if (hoursSince >= 48) {
        setHoursAway(Math.floor(hoursSince / 24));
        setShowWelcomeBack(true);
      }

      // Weekly report card — show on Mondays only
      const todayDate = new Date();
      if (todayDate.getDay() === 1) {
        const weekKey = getWeekKey(todayDate);
        const dismissed = await getWeekReportDismissed();
        if (dismissed !== weekKey) {
          const summary = getLastWeekSummary(recent);
          if (summary) { setWeekSummary(summary); setShowWeekCard(true); }
        }
      }

      // Restore in-progress draft, or fall back to last-used courier
      const draft = await getDraft();
      if (draft) {
        if (draft.customerName)     setCustomerName(draft.customerName);
        if (draft.phoneNumber)      setPhoneNumber(draft.phoneNumber);
        if (draft.email)            setEmail(draft.email);
        if (draft.status)           setStatus(draft.status);
        if (draft.receivedNote)     setReceivedNote(draft.receivedNote);
        if (draft.delayReason)      setDelayReason(draft.delayReason);
        if (draft.dispatchDate)     setDispatchDate(draft.dispatchDate);
        if (draft.readyNote)        setReadyNote(draft.readyNote);
        if (draft.preOrderNote)     setPreOrderNote(draft.preOrderNote);
        if (draft.serviceNote)      setServiceNote(draft.serviceNote);
        if (draft.appointmentTime)  setAppointmentTime(draft.appointmentTime);
        if (draft.tone)             setTone(draft.tone as Tone);
        if (draft.courier)          setCourier(draft.courier);
        if (draft.otherCourierName) setOtherCourierName(draft.otherCourierName);
        if (draft.waybill)          setWaybill(draft.waybill);
        if (draft.message)          setMessage(draft.message);
      } else {
        const lastCourier = await getLastCourier();
        if (lastCourier) setCourier(lastCourier);
      }
    })();
  }, []);

  useEffect(() => {
    if (!milestone) return;
    const msgs: Record<number, string> = {
      10:  "10 messages sent! You're on a roll 🚀",
      50:  "50 messages sent! Your customers love you 🏆",
      100: "100 messages! You're an OrderPing pro 🌟",
    };
    Alert.alert(`🎉 ${milestone} orders!`, msgs[milestone] ?? `${milestone} messages sent!`);
    setMilestone(null);
  }, [milestone]);

  useEffect(() => {
    if (showRecent) getRecent().then(setRecentList);
  }, [showRecent]);

  // Auto-save form as draft (debounced 400 ms) — cleared on "Clear & Start New"
  useEffect(() => {
    if (!customerName && !phoneNumber && !status && !message) return;
    const t = setTimeout(() => {
      saveDraft({ customerName, phoneNumber, email, status, receivedNote, delayReason, dispatchDate, readyNote, preOrderNote, serviceNote, appointmentTime, tone, courier, otherCourierName, waybill, message });
    }, 400);
    return () => clearTimeout(t);
  }, [customerName, phoneNumber, email, status, receivedNote, delayReason, dispatchDate, readyNote, preOrderNote, serviceNote, appointmentTime, tone, courier, otherCourierName, waybill, message]);

  // Remember the last courier used across sessions
  useEffect(() => {
    if (courier && courier !== 'other') saveLastCourier(courier);
  }, [courier]);

  // Customer mood detection — runs whenever phone number or history changes
  useEffect(() => {
    if (!phoneNumber.trim() || recentList.length === 0) {
      setFrustration({ level: 'none', signals: [], context: '' });
      toneAutoSet.current = false;
      return;
    }
    const result = detectFrustration(phoneNumber.trim(), recentList);
    setFrustration(result);
    if (result.level !== 'none' && !toneAutoSet.current) {
      setTone('apologetic');
      toneAutoSet.current = true;
    }
    if (result.level === 'none') toneAutoSet.current = false;
  }, [phoneNumber, recentList]);

  const clearStatusNotes = () => {
    setReceivedNote(null); setDelayReason(null);
    setDispatchDate(null); setReadyNote(null); setPreOrderNote(null);
    setServiceNote(null);
  };

  const handleStatusPress = (id: string) => {
    setStatus(id);
    clearStatusNotes();
    // Product tones
    if (id === 'delay' || id === 'pre-order') setTone('apologetic');
    else if (id === 'received' || id === 'ready') setTone('friendly');
    // Service tones
    else if (id === 'running-late' || id === 'rescheduled' || id === 'waiting-parts') setTone('apologetic');
    else if (id === 'on-the-way' || id === 'arrived') setTone('reassuring');
    else if (id === 'booking-confirmed' || id === 'completed' || id === 'follow-up') setTone('friendly');
  };

  const handleExtract = async () => {
    if (!orderText.trim()) return;
    setExtracting(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/extract-order`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body:   JSON.stringify({ orderText }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Server error' }));
        if (res.status === 401) {
          Alert.alert('Session expired', 'Please sign out and sign in again.');
          await supabase.auth.signOut();
          return;
        }
        if (res.status === 429) {
          Alert.alert('Slow down', 'Too many requests. Wait a moment and try again.');
          return;
        }
        Alert.alert('Error', err.error ?? 'Could not extract order details.');
        return;
      }
      const data = await res.json();
      if (data.name)  setCustomerName(data.name);
      if (data.phone) setPhoneNumber(data.phone);
      if (data.email) setEmail(data.email);
      setOrderText('');
    } catch (err: unknown) {
      clearTimeout(timeout);
      if ((err as Error).name === 'AbortError') {
        Alert.alert('Timed out', 'The request took too long. Check your connection.');
      } else {
        Alert.alert('Error', 'Could not extract order details. Check your connection.');
      }
    } finally { setExtracting(false); }
  };

  const selectedCourier = COURIERS.find(c => c.name === courier);
  const effectiveCourierName = courier === 'other' ? (otherCourierName.trim() || null) : (selectedCourier?.name ?? null);

  const handleGenerate = async () => {
    if (isGuest && guestSent >= 10) {
      setShowGuestGate(true);
      return;
    }
    if (!customerName.trim() || !phoneNumber.trim() || !status) {
      Alert.alert('Missing info', 'Enter a name, phone number, and pick a status.');
      return;
    }
    if (!profile?.businessDescription?.trim()) {
      Alert.alert('Profile incomplete', 'Please add a business description in your profile so messages match your business style.');
      return;
    }
    setGenerating(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          businessType:        profile?.businessType ?? 'product',
          customerName:        customerName.trim(),
          status,
          tone,
          businessName:        profile?.businessName ?? '',
          businessDescription: profile?.businessDescription ?? '',
          // Product-only fields
          receivedNote,
          dispatchDate,
          courierName:         (profile?.businessType ?? 'product') === 'product' ? effectiveCourierName : null,
          courierDeliveryTime: (profile?.businessType ?? 'product') === 'product' ? (selectedCourier?.deliveryTime ?? null) : null,
          waybillNumber:       (profile?.businessType ?? 'product') === 'product' ? (waybill.trim() || null) : null,
          delayReason,
          readyNote,
          preOrderNote,
          pickupAddress:      status === 'ready' ? (profile?.pickupAddress || null) : null,
          businessHours:      (status === 'ready' || status === 'booking-confirmed') ? (profile?.businessHours || null) : null,
          // Service-only fields
          appointmentTime:    appointmentTime.trim() || null,
          serviceNote,
          frustrationContext: frustration.context || null,
        }),
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Server error' }));
        if (res.status === 401) {
          Alert.alert('Session expired', 'Please sign out and sign in again.');
          await supabase.auth.signOut();
          return;
        }
        if (res.status === 429) {
          Alert.alert('Slow down', 'Too many requests. Wait a moment and try again.');
          return;
        }
        Alert.alert('Error', err.error ?? 'Could not generate message.');
        return;
      }
      const data = await res.json();
      if (data.message) {
        captureEvent('message_generated', {
          status,
          tone,
          businessType: profile?.businessType ?? 'product',
        });
      }
      setMessage(data.message ?? '');
    } catch (err: unknown) {
      clearTimeout(timeout);
      if ((err as Error).name === 'AbortError') {
        Alert.alert('Timed out', 'The request took too long. Check your connection.');
      } else {
        Alert.alert('Error', 'Could not generate message. Check your connection.');
      }
    } finally { setGenerating(false); }
  };

  const handleSend = async (channel: Channel) => {
    if (!message) return;
    await addRecent({
      customerName: customerName.trim(),
      phoneNumber:  phoneNumber.trim(),
      email:        email.trim() || undefined,
      status:       status ?? '',
      courier,
      channel,
      message,
      timestamp: new Date().toISOString(),
    });

    // stats
    const newTotal = await incrementTotalSent();
    setTodayCount(prev => prev + 1);

    // guest limit
    if (isGuest) {
      const newGuestSent = await incrementGuestSent();
      setGuestSent(newGuestSent);
      if (newGuestSent >= 10) setShowGuestGate(true);
    }
    getRecent().then(r => { setLastEntry(r[0] ?? null); setForgotten(getForgottenCustomers(r)); });

    // milestone confetti at 10, 50, 100
    const MILESTONES = [10, 50, 100];
    const lastMs = await getLastMilestone();
    const hit = MILESTONES.filter(m => m > lastMs && newTotal >= m).pop();
    if (hit) { await setLastMilestone(hit); setMilestone(hit); setShowConfetti(true); }

    captureEvent('message_sent', { channel, status: status ?? '' });

    if      (channel === 'whatsapp') openWhatsApp(phoneNumber, message);
    else if (channel === 'sms')      openSMS(phoneNumber, message);
    else if (channel === 'email')    openEmail(email, profile?.businessName ?? '', message);
    else                             await Share.share({ message });
  };

  const handleClear = () => {
    setOrderText(''); setCustomerName(''); setPhoneNumber(''); setEmail('');
    setCourier(null); setOtherCourierName(''); setWaybill('');
    setAppointmentTime(''); setStatus(null); setMessage(''); setTone('friendly');
    clearStatusNotes();
    clearDraft();
  };

  const handleRecentTap = (index: number) => {
    setExpandedIndex(prev => prev === index ? null : index);
  };

  const handleUseContact = (entry: RecentEntry) => {
    // Pre-fill contact details
    setCustomerName(entry.customerName);
    setPhoneNumber(entry.phoneNumber);
    setEmail(entry.email ?? '');
    // Clear all order-specific fields so the user starts fresh
    setOrderText('');
    setStatus(null);
    setReceivedNote(null); setDelayReason(null);
    setDispatchDate(null); setReadyNote(null); setPreOrderNote(null);
    setServiceNote(null); setAppointmentTime('');
    setCourier(null); setOtherCourierName(''); setWaybill('');
    setTone('friendly');
    setMessage('');
    clearDraft();
    setShowRecent(false);
    setSearchQuery('');
    setExpandedIndex(null);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 150);
  };

  const handleRecentSend = async (entry: RecentEntry, channel: Channel) => {
    if      (channel === 'whatsapp')            openWhatsApp(entry.phoneNumber, entry.message);
    else if (channel === 'sms')                 openSMS(entry.phoneNumber, entry.message);
    else if (channel === 'email' && entry.email) openEmail(entry.email, profile?.businessName ?? '', entry.message);
    else                                         await Share.share({ message: entry.message });
  };

  const handleClearHistory = () => {
    Alert.alert('Clear History', 'Remove all recent messages?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await clearRecent(); setRecentList([]); } },
    ]);
  };

  const filteredRecent = recentList.filter(e => {
    const matchesFilter = recentFilter === 'all' || e.status === recentFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || e.customerName.toLowerCase().includes(q) || e.phoneNumber.includes(q);
    return matchesFilter && matchesSearch;
  });

  const Hero = (
    <View style={s.hero}>
      <View style={s.heroTop}>
        <View>
          <Text style={s.logoText}>
            <Text style={s.logoOrder}>Order</Text>
            <Text style={s.logoPing}>Ping</Text>
          </Text>
          <Text style={s.tagline}>One click. Communicate. Connect.</Text>
        </View>
        <View style={s.heroActions}>
          <TouchableOpacity
            style={s.heroBtn}
            onPress={() => setShowRecent(v => !v)}
            activeOpacity={0.8}
          >
            <Text style={s.heroBtnText}>{showRecent ? '✕ Close' : '🕒 Recent'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(setup)')} style={s.heroBtn} activeOpacity={0.8}>
            <Text style={s.heroBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>
      {!!greeting && <Text style={s.greeting}>{greeting}</Text>}
      <Text style={s.heroSub}>{showRecent ? 'Recent messages' : 'Keep customers informed while they wait.'}</Text>
    </View>
  );

  if (showRecent) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {Hero}

          {/* Back button */}
          <TouchableOpacity onPress={() => setShowRecent(false)} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backBtnText}>← Back</Text>
          </TouchableOpacity>

          {/* Search */}
          <View style={s.searchRow}>
            <TextInput
              style={s.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or number…"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          {/* Filter pills */}
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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scrollRef} style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {Hero}

        {/* Guest gate modal */}
        <Modal visible={showGuestGate} transparent animationType="fade">
          <View style={s.gateOverlay}>
            <View style={s.gateCard}>
              <Text style={s.gateEmoji}>🔒</Text>
              <Text style={s.gateTitle}>You've used your 10 free updates</Text>
              <Text style={s.gateBody}>
                Sign up free to keep going — your data and history stay exactly as they are.
              </Text>
              <TouchableOpacity
                style={s.gateSignUp}
                onPress={async () => {
                  await setWasGuest(false);
                  await supabase.auth.signOut();
                  router.replace('/(auth)');
                }}
                activeOpacity={0.85}
              >
                <Text style={s.gateSignUpText}>Sign Up Free →</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.gateSignIn}
                onPress={async () => {
                  await setWasGuest(false);
                  await supabase.auth.signOut();
                  router.replace('/(auth)');
                }}
                activeOpacity={0.8}
              >
                <Text style={s.gateSignInText}>I already have an account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Guest banner — warning when approaching limit */}
        {isGuest && !guestBannerDismissed && (
          <View style={[s.guestBanner, guestSent >= 7 && s.guestBannerWarn]}>
            <View style={s.guestBannerBody}>
              {guestSent >= 7 ? (
                <Text style={[s.guestBannerText, s.guestBannerWarnText]}>
                  ⚠️ {10 - guestSent} free update{10 - guestSent !== 1 ? 's' : ''} left — sign up to keep going.
                </Text>
              ) : (
                <Text style={s.guestBannerText}>Guest mode — data saved on this device only.</Text>
              )}
              <TouchableOpacity onPress={async () => {
                await setWasGuest(false);
                await supabase.auth.signOut();
                router.replace('/(auth)');
              }}>
                <Text style={s.guestBannerLink}>Sign up →</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setGuestBannerDismissed(true)} style={s.guestBannerClose}>
              <Text style={s.weekCardDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <View style={s.statsCard}>
          <View style={s.statsRow}>
            <Text style={s.statsBigNum}>{todayCount}</Text>
            <Text style={s.statsTrend}>📈</Text>
          </View>
          <Text style={s.statsLabel}>customers informed today</Text>
        </View>

        {/* Weekly report card */}
        {showWeekCard && weekSummary && (
          <View style={s.weekCard}>
            <View style={s.weekCardHeader}>
              <Text style={s.weekCardTitle}>📊 Last week</Text>
              <TouchableOpacity onPress={async () => {
                setShowWeekCard(false);
                await setWeekReportDismissed(getWeekKey(new Date()));
              }}>
                <Text style={s.weekCardDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={s.weekCardStats}>
              <View style={s.weekStat}>
                <Text style={s.weekStatNum}>{weekSummary.updates}</Text>
                <Text style={s.weekStatLabel}>updates</Text>
              </View>
              <View style={s.weekStat}>
                <Text style={s.weekStatNum}>{weekSummary.customers}</Text>
                <Text style={s.weekStatLabel}>customers</Text>
              </View>
              <View style={s.weekStat}>
                <Text style={s.weekStatNum}>{weekSummary.bestDay.slice(0, 3)}</Text>
                <Text style={s.weekStatLabel}>best day</Text>
              </View>
            </View>
          </View>
        )}

        {/* Welcome back card */}
        {showWelcomeBack && (
          <View style={s.welcomeCard}>
            <TouchableOpacity style={s.welcomeClose} onPress={() => setShowWelcomeBack(false)}>
              <Text style={s.weekCardDismiss}>✕</Text>
            </TouchableOpacity>
            <Text style={s.welcomeTitle}>👋 Welcome back{profile?.businessName ? `, ${profile.businessName.split(' ')[0]}` : ''}!</Text>
            <Text style={s.welcomeSub}>You've been away {hoursAway} day{hoursAway !== 1 ? 's' : ''}.</Text>
            {forgotten.length > 0 && (
              <Text style={s.welcomePending}>{forgotten.length} customer{forgotten.length !== 1 ? 's' : ''} may need an update.</Text>
            )}
          </View>
        )}

        {/* Reminder */}
        {lastEntry && (
          forgotten.length > 0 ? (
            <View style={s.reminderCard}>
              <Text style={s.reminderLastLine}>
                Last update: <Text style={s.reminderLastName}>{lastEntry.customerName}</Text>
                {' '}<Text style={s.reminderLastMeta}>({STATUS_BADGES[lastEntry.status]?.label ?? lastEntry.status} · {relativeTime(lastEntry.timestamp)})</Text>
              </Text>
              <Text style={s.reminderQuestion}>Are you sure you're not missing anyone? 👀</Text>
              {forgotten.map((c, i) => (
                <TouchableOpacity
                  key={i}
                  style={s.reminderRow}
                  onPress={() => { setCustomerName(c.customerName); setPhoneNumber(c.phoneNumber); setEmail(c.email ?? ''); }}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.reminderName}>{c.customerName}</Text>
                    <Text style={s.reminderMeta}>
                      {STATUS_BADGES[c.lastStatus]?.label ?? c.lastStatus} · {c.hoursAgo < 48 ? `${c.hoursAgo}h ago` : `${Math.floor(c.hoursAgo / 24)}d ago`}
                    </Text>
                  </View>
                  <Text style={s.reminderArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={s.allGoodCard}>
              <View style={s.allGoodIconWrap}>
                <Text style={s.allGoodIconText}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.allGoodMain}>All customers have been informed.</Text>
                <Text style={s.allGoodSub}>
                  Last: {lastEntry.customerName} · {STATUS_BADGES[lastEntry.status]?.label ?? lastEntry.status} · {relativeTime(lastEntry.timestamp)}
                </Text>
              </View>
            </View>
          )
        )}

        {/* Paste Order / Booking */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>{profile?.businessType === 'service' ? 'PASTE BOOKING' : 'PASTE ORDER'}</Text>
          <TextInput
            style={s.pasteInput}
            value={orderText}
            onChangeText={setOrderText}
            multiline
            placeholder={profile?.businessType === 'service'
              ? 'Paste the booking here — name, phone, appointment details...\n\nThe app will extract everything automatically.'
              : 'Paste the full order here — name, phone, email, items...\n\nThe app will extract everything automatically.'}
            placeholderTextColor={Colors.textLight}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[s.extractBtn, orderText.trim() && s.extractBtnActive, (!orderText.trim() || extracting) && { opacity: 0.5 }]}
            onPress={handleExtract}
            disabled={!orderText.trim() || extracting}
            activeOpacity={0.85}
          >
            {extracting
              ? <ActivityIndicator color={orderText.trim() ? '#fff' : Colors.text} size="small" />
              : <Text style={[s.extractBtnText, orderText.trim() && s.extractBtnTextActive]}>⚡ Extract Details</Text>}
          </TouchableOpacity>
        </View>

        {/* Customer */}
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

        {/* Courier (product) / Appointment time (service) */}
        {(profile?.businessType ?? 'product') === 'product' ? (
          <View style={s.card}>
            <Text style={s.sectionLabel}>COURIER</Text>
            <Text style={s.cardHint}>Select the courier you're using for this order</Text>
            <View style={s.pillRow}>
              {COURIERS.map(c => (
                <TouchableOpacity
                  key={c.name}
                  style={[s.courierPill, courier === c.name && s.courierPillActive]}
                  onPress={() => setCourier(courier === c.name ? null : c.name)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.courierPillText, courier === c.name && s.courierPillTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.courierPill, courier === 'other' && s.courierPillActive]}
                onPress={() => setCourier(courier === 'other' ? null : 'other')}
                activeOpacity={0.8}
              >
                <Text style={[s.courierPillText, courier === 'other' && s.courierPillTextActive]}>Other</Text>
              </TouchableOpacity>
            </View>
            {courier === 'other' && (
              <TextInput
                style={[s.input, { marginTop: 12 }]}
                value={otherCourierName}
                onChangeText={setOtherCourierName}
                placeholder="Type courier name…"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            )}
            <TextInput
              style={[s.input, { marginTop: 12 }]}
              value={waybill}
              onChangeText={setWaybill}
              placeholder="Waybill / tracking number (optional)"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="characters"
            />
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.sectionLabel}>APPOINTMENT</Text>
            <Text style={s.cardHint}>When is the appointment? (optional)</Text>
            <TextInput
              style={s.input}
              value={appointmentTime}
              onChangeText={setAppointmentTime}
              placeholder="e.g. Tomorrow at 10:00 AM"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="words"
            />
          </View>
        )}

        {/* Status */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>STATUS</Text>
          {(profile?.businessType ?? 'product') === 'product' ? (
            <>
              <View style={s.statusGrid}>
                {STATUSES.map(st => {
                  const active = status === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[s.statusBtn, active && { borderColor: st.color, backgroundColor: st.color + '15' }]}
                      onPress={() => handleStatusPress(st.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.statusEmoji}>{st.emoji}</Text>
                      <Text style={[s.statusLabel, active && { color: st.color, fontWeight: '700' }]}>{st.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[s.preOrderBtn, status === 'pre-order' && s.preOrderBtnActive]}
                onPress={() => handleStatusPress('pre-order')}
                activeOpacity={0.8}
              >
                <Text style={s.preOrderEmoji}>🗓️</Text>
                <Text style={[s.preOrderLabel, status === 'pre-order' && { color: Colors.accent, fontWeight: '700' }]}>Pre-order</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={s.statusGrid}>
              {SERVICE_STATUSES.map(st => {
                const active = status === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[s.statusBtn, active && { borderColor: st.color, backgroundColor: st.color + '15' }]}
                    onPress={() => handleStatusPress(st.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.statusEmoji}>{st.emoji}</Text>
                    <Text style={[s.statusLabel, active && { color: st.color, fontWeight: '700' }]}>{st.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Status note pickers — product */}
        {status === 'received' && (
          <StatusNotePicker heading="What type of order?" options={RECEIVED_OPTIONS}
            selected={receivedNote} onSelect={setReceivedNote} activeColor="#8B5CF6"
            statusKey="received" customPlaceholder="e.g. pre-order, group buy..." />
        )}
        {status === 'delay' && (
          <StatusNotePicker heading="What's the delay?" options={DELAY_OPTIONS}
            selected={delayReason} onSelect={setDelayReason} activeColor="#FBBF24"
            statusKey="delay" customPlaceholder="e.g. customs hold, supplier..." />
        )}
        {status === 'dispatched' && (
          <StatusNotePicker heading="When dispatched?" options={DISPATCH_OPTIONS}
            selected={dispatchDate} onSelect={setDispatchDate} activeColor="#3B82F6"
            statusKey="dispatched" customPlaceholder="e.g. Monday, 15 May..." />
        )}
        {status === 'ready' && (
          <StatusNotePicker heading="Pickup detail" options={READY_OPTIONS}
            selected={readyNote} onSelect={setReadyNote} activeColor="#22C55E"
            statusKey="ready" customPlaceholder="e.g. ask for Thabo at counter..." />
        )}
        {status === 'pre-order' && (
          <StatusNotePicker heading="Pre-order detail" options={PREORDER_OPTIONS}
            selected={preOrderNote} onSelect={setPreOrderNote} activeColor="#6366F1"
            statusKey="pre-order" customPlaceholder="e.g. available end of month..." />
        )}

        {/* Status note pickers — service */}
        {status === 'booking-confirmed' && (
          <StatusNotePicker heading="Booking detail" options={SERVICE_CONFIRMED_OPTIONS}
            selected={serviceNote} onSelect={setServiceNote} activeColor="#2BA784"
            statusKey="booking-confirmed" customPlaceholder="e.g. bring your ID..." />
        )}
        {status === 'on-the-way' && (
          <StatusNotePicker heading="How far away?" options={SERVICE_ON_THE_WAY_OPTIONS}
            selected={serviceNote} onSelect={setServiceNote} activeColor="#3B82F6"
            statusKey="on-the-way" customPlaceholder="e.g. 30 minutes away..." />
        )}
        {status === 'running-late' && (
          <StatusNotePicker heading="Reason for delay?" options={SERVICE_LATE_OPTIONS}
            selected={serviceNote} onSelect={setServiceNote} activeColor="#E8A435"
            statusKey="running-late" customPlaceholder="e.g. stuck in load shedding..." />
        )}
        {status === 'arrived' && (
          <StatusNotePicker heading="On-site detail" options={SERVICE_ARRIVED_OPTIONS}
            selected={serviceNote} onSelect={setServiceNote} activeColor="#16A34A"
            statusKey="arrived" customPlaceholder="e.g. parking at gate..." />
        )}
        {status === 'completed' && (
          <StatusNotePicker heading="Job outcome" options={SERVICE_COMPLETED_OPTIONS}
            selected={serviceNote} onSelect={setServiceNote} activeColor="#8B5CF6"
            statusKey="completed" customPlaceholder="e.g. invoice sent..." />
        )}
        {status === 'rescheduled' && (
          <StatusNotePicker heading="Reason for reschedule" options={SERVICE_RESCHEDULED_OPTIONS}
            selected={serviceNote} onSelect={setServiceNote} activeColor="#6B7280"
            statusKey="rescheduled" customPlaceholder="e.g. new date is Monday..." />
        )}
        {status === 'waiting-parts' && (
          <StatusNotePicker heading="What are you waiting for?" options={SERVICE_PARTS_OPTIONS}
            selected={serviceNote} onSelect={setServiceNote} activeColor="#D4A843"
            statusKey="waiting-parts" customPlaceholder="e.g. part arrives Thursday..." />
        )}
        {status === 'follow-up' && (
          <StatusNotePicker heading="Follow-up reason" options={SERVICE_FOLLOWUP_OPTIONS}
            selected={serviceNote} onSelect={setServiceNote} activeColor="#EC4899"
            statusKey="follow-up" customPlaceholder="e.g. checking on the repair..." />
        )}

        {/* Tone */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>TONE</Text>
          <View style={s.toneRow}>
            {((profile?.businessType ?? 'product') === 'service'
              ? ['friendly', 'professional', 'apologetic', 'reassuring'] as Tone[]
              : ['friendly', 'professional', 'apologetic'] as Tone[]
            ).map(t => (
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
          onPress={handleGenerate}
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
              <TouchableOpacity style={[s.sendBtn, { backgroundColor: Colors.whatsapp }]} onPress={() => handleSend('whatsapp')} activeOpacity={0.85}>
                <Text style={s.sendBtnText} numberOfLines={1}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.sendBtn, { backgroundColor: Colors.sms }]} onPress={() => handleSend('sms')} activeOpacity={0.85}>
                <Text style={s.sendBtnText} numberOfLines={1}>SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sendBtn, { backgroundColor: Colors.email }]}
                onPress={() => {
                  if (!email.trim()) { Alert.alert('No email', 'Enter the customer\'s email address above.'); return; }
                  handleSend('email');
                }}
                activeOpacity={0.85}
              >
                <Text style={s.sendBtnText} numberOfLines={1}>Email</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.sendBtn, { backgroundColor: Colors.textMuted }]} onPress={() => handleSend('copy')} activeOpacity={0.85}>
                <Text style={s.sendBtnText} numberOfLines={1}>Copy</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleGenerate} style={s.regenerateBtn} disabled={generating}>
              <Text style={s.regenerateText}>↻  Regenerate</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Clear */}
        <TouchableOpacity onPress={handleClear} style={s.clearBtn} activeOpacity={0.8}>
          <Text style={s.clearBtnText}>↺  Clear & Start New</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
      <Confetti visible={showConfetti} onDone={() => setShowConfetti(false)} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },

  // Hero
  hero:        { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingTop: 72, paddingBottom: 28 },
  heroTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  logoText:    { fontSize: 26 },
  logoOrder:   { fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  logoPing:    { fontWeight: '800', color: '#FFFFFF' },
  tagline:     { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3, letterSpacing: 0.4, fontWeight: '500' },
  heroActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  heroBtn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  heroBtnText: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  greeting:    { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4, letterSpacing: -0.3 },
  heroSub:     { fontSize: 15, color: 'rgba(255,255,255,0.72)', fontWeight: '400', lineHeight: 22 },

  // Cards — unified radius + shadow
  card:         { backgroundColor: Colors.surface, marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.0, marginBottom: 14, textTransform: 'uppercase' },
  cardHint:     { fontSize: 13, color: Colors.textLight, fontWeight: '400', lineHeight: 20, marginTop: -8, marginBottom: 14 },

  // Paste
  pasteInput:           { backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 14, fontSize: 15, color: Colors.text, minHeight: 100, lineHeight: 24, marginBottom: 10 },
  extractBtn:           { backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 14, alignItems: 'center' },
  extractBtnActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  extractBtnText:       { fontSize: 15, fontWeight: '600', color: Colors.text, letterSpacing: 0.1 },
  extractBtnTextActive: { color: '#fff' },

  // Customer
  fieldRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fieldIcon:  { fontSize: 13 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8 },
  input:      { backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 14, fontSize: 16, color: Colors.text, lineHeight: 22 },

  // Courier pills
  pillRow:               { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  courierPill:           { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 50, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  courierPillActive:     { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  courierPillText:       { fontSize: 14, fontWeight: '500', color: Colors.text },
  courierPillTextActive: { color: Colors.primary, fontWeight: '700' },

  // Status
  statusGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  statusBtn:       { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 16, backgroundColor: Colors.background },
  statusEmoji:     { fontSize: 20 },
  statusLabel:     { fontSize: 15, fontWeight: '600', color: Colors.text, letterSpacing: 0.1 },
  preOrderBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 16, backgroundColor: Colors.background },
  preOrderBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '12' },
  preOrderEmoji:   { fontSize: 20 },
  preOrderLabel:   { fontSize: 15, fontWeight: '600', color: Colors.text, letterSpacing: 0.1 },

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
  generateBtnSub:      { display: 'none' },

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

  // Recent list
  backBtn:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backBtnText:   { fontSize: 15, fontWeight: '600', color: Colors.primary },
  searchRow:     { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  searchInput:   { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },
  filterScroll:  { marginTop: 8 },
  filterContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  filterPill:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterPillActive:   { borderColor: Colors.primary, backgroundColor: Colors.primary },
  filterPillText:     { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
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

  // Stats
  statsCard:   { backgroundColor: '#EEF4FF', marginHorizontal: 16, marginTop: 16, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 24, alignItems: 'center', borderWidth: 1, borderColor: '#C7D9FF' },
  statsRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statsBigNum: { fontSize: 48, fontWeight: '800', color: Colors.primary, lineHeight: 54, letterSpacing: -1 },
  statsTrend:  { fontSize: 26, marginTop: 2 },
  statsLabel:  { fontSize: 13, color: Colors.primary, fontWeight: '600', letterSpacing: 0.2, marginTop: 4, opacity: 0.7 },

  // Weekly report card
  guestBanner:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A', borderRadius: 14, marginHorizontal: 16, marginTop: 16, padding: 14 },
  guestBannerWarn:     { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' },
  guestBannerBody:     { flex: 1 },
  guestBannerText:     { fontSize: 13, color: '#92400E', marginBottom: 4 },
  guestBannerWarnText: { color: '#9A3412' },
  guestBannerLink:     { fontSize: 13, fontWeight: '700', color: '#D97706' },
  guestBannerClose:    { paddingLeft: 12 },
  // Gate modal
  gateOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  gateCard:      { backgroundColor: Colors.surface, borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', maxWidth: 340, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  gateEmoji:     { fontSize: 44, marginBottom: 16 },
  gateTitle:     { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 },
  gateBody:      { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  gateSignUp:    { width: '100%', backgroundColor: Colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 10, minHeight: 54, justifyContent: 'center', shadowColor: Colors.primary, shadowOpacity: 0.35, shadowRadius: 12, elevation: 4 },
  gateSignUpText:{ color: 'white', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  gateSignIn:    { width: '100%', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 16, padding: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  gateSignInText:{ fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  weekCard:        { backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 18, marginHorizontal: 16, marginTop: 16, padding: 18 },
  weekCardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  weekCardTitle:   { fontSize: 16, fontWeight: '700', color: '#1E40AF', letterSpacing: -0.1 },
  weekCardDismiss: { fontSize: 16, color: Colors.textMuted, paddingHorizontal: 4 },
  weekCardStats:   { flexDirection: 'row', justifyContent: 'space-around' },
  weekStat:        { alignItems: 'center' },
  weekStatNum:     { fontSize: 28, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5 },
  weekStatLabel:   { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginTop: 4, letterSpacing: 0.6 },

  // Welcome back card
  welcomeCard:    { backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#BBF7D0', borderRadius: 18, marginHorizontal: 16, marginTop: 16, padding: 18 },
  welcomeClose:   { position: 'absolute', top: 14, right: 14 },
  welcomeTitle:   { fontSize: 16, fontWeight: '700', color: '#166534', marginBottom: 4, letterSpacing: -0.1 },
  welcomeSub:     { fontSize: 14, fontWeight: '400', color: '#15803D', lineHeight: 21, marginBottom: 6 },
  welcomePending: { fontSize: 13, fontWeight: '600', color: '#166534' },

  reminderCard:     { backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#FED7AA', borderRadius: 18, marginHorizontal: 16, marginTop: 16, padding: 18 },
  reminderLastLine: { fontSize: 13, fontWeight: '400', color: '#92400E', marginBottom: 10, lineHeight: 20 },
  reminderLastName: { fontWeight: '700', color: '#78350F' },
  reminderLastMeta: { fontWeight: '400', color: '#B45309' },
  reminderQuestion: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 12 },
  reminderRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 8 },
  reminderName:     { fontSize: 14, fontWeight: '600', color: '#78350F' },
  reminderMeta:     { fontSize: 12, fontWeight: '500', color: '#B45309', marginTop: 2 },
  reminderArrow:    { fontSize: 16, color: '#B45309', fontWeight: '600' },

  // Mood detection card
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

  allGoodCard:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 20, marginHorizontal: 16, marginTop: 16, paddingVertical: 16, paddingHorizontal: 18, shadowColor: '#16A34A', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  allGoodIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#86EFAC', alignItems: 'center', justifyContent: 'center' },
  allGoodIconText: { fontSize: 18, color: '#16A34A', fontWeight: '800', lineHeight: 22 },
  allGoodMain:     { fontSize: 15, fontWeight: '600', color: '#15803D', marginBottom: 3, letterSpacing: -0.1 },
  allGoodSub:      { fontSize: 13, fontWeight: '400', color: Colors.textMuted, lineHeight: 18 },
});
