import { useState, useEffect, useRef, useCallback } from 'react';
import { useOrderForm } from '@/hooks/useOrderForm';
import { useEngagement } from '@/hooks/useEngagement';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
  Share, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getProfile, addRecent, getRecent, fetchAndMergeRecent, clearRecent, incrementTotalSent, getLastMilestone, setLastMilestone, getLastOpen, setLastOpen, getWeekReportDismissed, getDraft, clearDraft, getLastCourier, getGuestSent, incrementGuestSent, setWasGuest, type BusinessProfile, type RecentEntry } from '@/lib/storage';
import { openWhatsApp, openSMS, openEmail } from '@/lib/deep-links';
import { captureEvent, identifyUser } from '@/lib/analytics';
import Confetti from '@/components/Confetti';
import RecentList from '@/components/RecentList';
import OrderPaste from '@/components/OrderPaste';
import CustomerInputs from '@/components/CustomerInputs';
import EngagementCards from '@/components/EngagementCards';
import StatusPicker from '@/components/StatusPicker';
import MessageEditor from '@/components/MessageEditor';
import { Colors } from '@/constants/colors';
import { getGreeting } from '@/lib/format';
import { getForgottenCustomers, getWeekKey, getLastWeekSummary } from '@/lib/engagement';
import { COURIERS, STATUS_BADGES, type Tone, type Channel } from '@/lib/status-config';
import { GUEST_FREE_LIMIT } from '@shared/types';

export default function MainScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [profile, setProfile]   = useState<BusinessProfile | null>(null);
  const [greeting, setGreeting] = useState('');
  const generateControllerRef   = useRef<AbortController | null>(null);

  // Abort any in-flight generate request when the screen unmounts
  useEffect(() => {
    return () => { generateControllerRef.current?.abort(); };
  }, []);

  const {
    orderText, setOrderText,
    extracting, setExtracting,
    customerName, setCustomerName,
    phoneNumber, setPhoneNumber,
    email, setEmail,
    courier, setCourier,
    otherCourierName, setOtherCourierName,
    waybill, setWaybill,
    status, setStatus,
    receivedNote, setReceivedNote,
    delayReason, setDelayReason,
    dispatchDate, setDispatchDate,
    readyNote, setReadyNote,
    preOrderNote, setPreOrderNote,
    serviceNote, setServiceNote,
    appointmentTime, setAppointmentTime,
    tone, setTone,
    message, setMessage,
    orderItems, setOrderItems,
    generating, setGenerating,
    clearStatusNotes,
    resetForm,
    resetOrderFields,
    loadDraft,
  } = useOrderForm();

  const {
    todayCount, setTodayCount,
    showConfetti, setShowConfetti,
    milestone, setMilestone,
    lastEntry, setLastEntry,
    forgotten, setForgotten,
    weekSummary, setWeekSummary,
    showWeekCard, setShowWeekCard,
    hoursAway, setHoursAway,
    showWelcomeBack, setShowWelcomeBack,
    showRecent, setShowRecent,
    recentList, setRecentList,
    recentFilter, setRecentFilter,
    filteredRecent,
    expandedKey, setExpandedKey,
    searchQuery, setSearchQuery,
    frustration,
    isGuest, setIsGuest,
    guestBannerDismissed, setGuestBannerDismissed,
    guestSent, setGuestSent,
    showGuestGate, setShowGuestGate,
  } = useEngagement({ phoneNumber });

  // Bridge: auto-set tone to apologetic when frustration is detected
  const toneAutoSet = useRef(false);
  useEffect(() => {
    if (frustration.level !== 'none' && !toneAutoSet.current) {
      setTone('apologetic');
      toneAutoSet.current = true;
    }
    if (frustration.level === 'none') toneAutoSet.current = false;
  }, [frustration.level]);

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

      // Independent reads — batch instead of awaiting one at a time on cold start.
      const todayDate = new Date();
      const isMonday = todayDate.getDay() === 1;
      const [recent, lastOpen, draft, lastCourier, weekDismissed] = await Promise.all([
        fetchAndMergeRecent(),
        getLastOpen(),
        getDraft(),
        getLastCourier(),
        isMonday ? getWeekReportDismissed() : Promise.resolve(null),
      ]);
      setLastOpen();

      const today = todayDate.toDateString();
      setRecentList(recent);
      setTodayCount(recent.filter(e => new Date(e.timestamp).toDateString() === today).length);
      setLastEntry(recent[0] ?? null);
      setForgotten(getForgottenCustomers(recent));

      // Session tracking
      const hoursSince = lastOpen ? Math.floor((Date.now() - lastOpen) / 3600000) : 0;
      if (hoursSince >= 48) {
        setHoursAway(Math.floor(hoursSince / 24));
        setShowWelcomeBack(true);
      }

      // Weekly report card — show on Mondays only
      if (isMonday) {
        const weekKey = getWeekKey(todayDate);
        if (weekDismissed !== weekKey) {
          const summary = getLastWeekSummary(recent);
          if (summary) { setWeekSummary(summary); setShowWeekCard(true); }
        }
      }

      // Restore in-progress draft, or fall back to last-used courier
      if (draft) {
        loadDraft(draft);
      } else if (lastCourier) {
        setCourier(lastCourier);
      }
    })();
  }, []);

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
      if (data.items) setOrderItems(data.items);
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
    if (isGuest && guestSent >= GUEST_FREE_LIMIT) {
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
    generateControllerRef.current = controller;
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
          orderItems,
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

    // Open the channel first — only count after the send fires
    let opened = true;
    if      (channel === 'whatsapp') opened = await openWhatsApp(phoneNumber, message);
    else if (channel === 'sms')      opened = await openSMS(phoneNumber, message);
    else if (channel === 'email')    opened = await openEmail(email, profile?.businessName ?? '', message);
    else                             await Share.share({ message });

    if (!opened) {
      Alert.alert('Could not open app', `No ${channel === 'sms' ? 'messaging' : 'email'} app is available on this device.`);
      return;
    }

    await addRecent({
      customerName: customerName.trim(),
      phoneNumber:  phoneNumber.trim(),
      email:        email.trim() || undefined,
      status:       status ?? '',
      delayReason:  status === 'delay' ? delayReason : null,
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
      if (newGuestSent >= GUEST_FREE_LIMIT) setShowGuestGate(true);
    }
    getRecent().then(r => { setLastEntry(r[0] ?? null); setForgotten(getForgottenCustomers(r)); });

    // milestone confetti at 10, 50, 100
    const MILESTONES = [10, 50, 100];
    const lastMs = await getLastMilestone();
    const hit = MILESTONES.filter(m => m > lastMs && newTotal >= m).pop();
    if (hit) { await setLastMilestone(hit); setMilestone(hit); setShowConfetti(true); }

    captureEvent('message_sent', { channel, status: status ?? '' });
  };

  const handleClear = () => {
    resetForm();
    clearDraft();
  };

  const handleRecentTap = (key: string) => {
    setExpandedKey(prev => prev === key ? null : key);
  };

  const handleUseContact = (entry: RecentEntry) => {
    // Pre-fill contact details, clear all order-specific fields so the user starts fresh
    setCustomerName(entry.customerName);
    setPhoneNumber(entry.phoneNumber);
    setEmail(entry.email ?? '');
    resetOrderFields();
    clearDraft();
    setShowRecent(false);
    setSearchQuery('');
    setExpandedKey(null);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 150);
  };

  const handleRecentSend = async (entry: RecentEntry, channel: Channel) => {
    let opened = true;
    if      (channel === 'whatsapp')             opened = await openWhatsApp(entry.phoneNumber, entry.message);
    else if (channel === 'sms')                  opened = await openSMS(entry.phoneNumber, entry.message);
    else if (channel === 'email' && entry.email) opened = await openEmail(entry.email, profile?.businessName ?? '', entry.message);
    else                                          await Share.share({ message: entry.message });

    if (!opened) {
      Alert.alert('Could not open app', `No ${channel === 'sms' ? 'messaging' : 'email'} app is available on this device.`);
    }
  };

  const handleClearHistory = () => {
    Alert.alert('Clear History', 'Remove all recent messages?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await clearRecent(); setRecentList([]); } },
    ]);
  };

  const handleSelectForgotten = useCallback((name: string, phone: string, email: string) => {
    setCustomerName(name);
    setPhoneNumber(phone);
    setEmail(email);
  }, [setCustomerName, setPhoneNumber, setEmail]);

  const handleGuestAuth = async () => {
    await setWasGuest(false);
    await supabase.auth.signOut();
    router.replace('/(auth)');
  };

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
      <RecentList
        hero={Hero}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        recentFilter={recentFilter}
        setRecentFilter={setRecentFilter}
        recentList={recentList}
        setRecentList={setRecentList}
        filteredRecent={filteredRecent}
        expandedKey={expandedKey}
        setExpandedKey={setExpandedKey}
        setShowRecent={setShowRecent}
        handleRecentTap={handleRecentTap}
        handleUseContact={handleUseContact}
        handleRecentSend={handleRecentSend}
        handleClearHistory={handleClearHistory}
        profile={profile}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {Hero}

        <EngagementCards
          showGuestGate={showGuestGate}
          isGuest={isGuest}
          guestSent={guestSent}
          guestBannerDismissed={guestBannerDismissed}
          setGuestBannerDismissed={setGuestBannerDismissed}
          onGuestAuth={handleGuestAuth}
          todayCount={todayCount}
          showWeekCard={showWeekCard}
          setShowWeekCard={setShowWeekCard}
          weekSummary={weekSummary}
          showWelcomeBack={showWelcomeBack}
          setShowWelcomeBack={setShowWelcomeBack}
          hoursAway={hoursAway}
          forgotten={forgotten}
          lastEntry={lastEntry}
          profile={profile}
          onSelectForgotten={handleSelectForgotten}
        />

        <OrderPaste
          businessType={profile?.businessType as 'product' | 'service' | undefined}
          orderText={orderText}
          setOrderText={setOrderText}
          extracting={extracting}
          onExtract={handleExtract}
        />

        <CustomerInputs
          customerName={customerName}
          setCustomerName={setCustomerName}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          email={email}
          setEmail={setEmail}
        />

        <StatusPicker
          status={status}
          onStatusPress={handleStatusPress}
          profile={profile}
          receivedNote={receivedNote}
          setReceivedNote={setReceivedNote}
          delayReason={delayReason}
          setDelayReason={setDelayReason}
          dispatchDate={dispatchDate}
          setDispatchDate={setDispatchDate}
          readyNote={readyNote}
          setReadyNote={setReadyNote}
          preOrderNote={preOrderNote}
          setPreOrderNote={setPreOrderNote}
          serviceNote={serviceNote}
          setServiceNote={setServiceNote}
          appointmentTime={appointmentTime}
          setAppointmentTime={setAppointmentTime}
          courier={courier}
          setCourier={setCourier}
          otherCourierName={otherCourierName}
          setOtherCourierName={setOtherCourierName}
          waybill={waybill}
          setWaybill={setWaybill}
        />

        <MessageEditor
          tone={tone}
          setTone={setTone}
          profile={profile}
          message={message}
          setMessage={setMessage}
          generating={generating}
          email={email}
          frustration={frustration}
          onGenerate={handleGenerate}
          onSend={handleSend}
          onClear={handleClear}
        />

        <View style={{ height: 80 }} />
      </ScrollView>
      <Confetti visible={showConfetti} onDone={() => setShowConfetti(false)} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },

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
});
