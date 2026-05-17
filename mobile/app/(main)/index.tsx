import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
  Share, Alert, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getProfile, addRecent, getRecent, fetchAndMergeRecent, clearRecent, incrementTotalSent, getLastMilestone, setLastMilestone, getLastOpen, setLastOpen, getWeekReportDismissed, setWeekReportDismissed, getDraft, saveDraft, clearDraft, getLastCourier, saveLastCourier, type BusinessProfile, type RecentEntry, type FormDraft } from '@/lib/storage';
import { openWhatsApp, openSMS, openEmail } from '@/lib/deep-links';
import StatusNotePicker from '@/components/StatusNotePicker';
import Confetti from '@/components/Confetti';
import { Colors } from '@/constants/colors';

interface ForgottenCustomer {
  customerName: string;
  phoneNumber:  string;
  email?:       string;
  lastStatus:   string;
  hoursAgo:     number;
}

function getForgottenCustomers(recent: RecentEntry[]): ForgottenCustomer[] {
  const PENDING = ['received', 'delay', 'pre-order'];
  const byPhone: Record<string, RecentEntry> = {};
  for (const e of recent) {
    if (!byPhone[e.phoneNumber] || new Date(e.timestamp) > new Date(byPhone[e.phoneNumber].timestamp))
      byPhone[e.phoneNumber] = e;
  }
  const now = Date.now();
  return Object.values(byPhone)
    .filter(e => PENDING.includes(e.status))
    .map(e => ({
      customerName: e.customerName,
      phoneNumber:  e.phoneNumber,
      email:        e.email,
      lastStatus:   e.status,
      hoursAgo:     Math.floor((now - new Date(e.timestamp).getTime()) / 3600000),
    }))
    .filter(e => e.hoursAgo >= 24)
    .sort((a, b) => b.hoursAgo - a.hoursAgo);
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
}

interface WeekSummary { updates: number; customers: number; bestDay: string; }

function getLastWeekSummary(recent: RecentEntry[]): WeekSummary | null {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfThisWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

  const entries = recent.filter(e => {
    const t = new Date(e.timestamp);
    return t >= startOfLastWeek && t < startOfThisWeek;
  });
  if (entries.length === 0) return null;

  const uniqueCustomers = new Set(entries.map(e => e.phoneNumber)).size;
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const countsByDay: Record<number, number> = {};
  entries.forEach(e => {
    const day = new Date(e.timestamp).getDay();
    countsByDay[day] = (countsByDay[day] ?? 0) + 1;
  });
  const bestDayNum = parseInt(Object.entries(countsByDay).sort((a, b) => b[1] - a[1])[0][0]);
  return { updates: entries.length, customers: uniqueCustomers, bestDay: dayNames[bestDayNum] };
}

const RECEIVED_OPTIONS = [
  { id: 'Order received and being carefully packed for you',   icon: '✅', label: 'Received & packing now' },
  { id: 'Just need you to confirm your delivery address',      icon: '📍', label: 'Need delivery address' },
  { id: 'Waiting for your payment to clear before we process', icon: '💳', label: 'Awaiting payment' },
];
const DELAY_OPTIONS = [
  { id: 'The courier is running a little behind — your order is still on its way', icon: '🚚', label: 'Courier running a little late' },
  { id: 'We are waiting for stock to arrive before we can send yours out',          icon: '📦', label: 'Waiting on stock to arrive' },
  { id: 'We have had a high demand of orders and need just a bit more time',        icon: '⚡',  label: 'High demand, need extra time' },
];
const DISPATCH_OPTIONS = [
  { id: 'already on its way to you',              icon: '✅',  label: 'Already on its way' },
  { id: 'going out to you today',                 icon: '📬',  label: 'Going out today' },
  { id: 'going out to you tomorrow',              icon: '📅',  label: 'Going out tomorrow' },
  { id: 'going out to you later this week',       icon: '🗓️', label: 'Going out this week' },
  { id: 'split into multiple parcels, all on the way', icon: '📦', label: 'Split into multiple parcels' },
];
const READY_OPTIONS = [
  { id: 'Ready and waiting for you to collect',               icon: '🏪', label: 'Ready for collection now' },
  { id: 'Will be ready for you to collect from tomorrow',     icon: '📅', label: 'Ready from tomorrow' },
  { id: 'Ready and we would love you to collect it soon',     icon: '⚠️',  label: 'Please collect soon' },
];
const PREORDER_OPTIONS = [
  { id: 'Pre-order is locked in and we are waiting for stock to arrive', icon: '🚢', label: 'Locked in, waiting on stock' },
  { id: 'Pre-order confirmed and will be ready in 2 to 3 weeks',         icon: '📅', label: 'Ready in 2–3 weeks' },
  { id: 'Pre-order confirmed and will be ready in 4 to 6 weeks',         icon: '🗓️', label: 'Ready in 4–6 weeks' },
];

const COURIERS = [
  { name: 'The Courier Guy', deliveryTime: '3-5 working days' },
  { name: 'Pep',             deliveryTime: '7-9 working days' },
  { name: 'PostNet',         deliveryTime: '5-7 working days' },
];

const STATUSES = [
  { id: 'received',   label: 'Received',   emoji: '📦', color: Colors.received },
  { id: 'delay',      label: 'Delay',       emoji: '⏳', color: Colors.delay },
  { id: 'dispatched', label: 'Dispatching', emoji: '🚚', color: Colors.dispatched },
  { id: 'ready',      label: 'Ready',       emoji: '📍', color: Colors.ready },
] as const;

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  received:    { label: 'Received',   color: Colors.received },
  delay:       { label: 'Delayed',    color: Colors.delay },
  dispatched:  { label: 'Dispatched', color: Colors.dispatched },
  ready:       { label: 'Ready',      color: Colors.ready },
  'pre-order': { label: 'Pre-order',  color: Colors.accent },
};

const RECENT_FILTERS = ['all', 'received', 'delay', 'dispatched', 'ready', 'pre-order'] as const;
const FILTER_LABELS: Record<string, string> = {
  all: 'All', received: 'Received', delay: 'Delayed',
  dispatched: 'Dispatched', ready: 'Ready', 'pre-order': 'Pre-order',
};
const CHANNEL_ICONS: Record<string, string> = { whatsapp: '💬', sms: '📱', email: '✉️', copy: '📋' };

type Tone    = 'friendly' | 'professional' | 'apologetic';
type Channel = 'whatsapp' | 'sms' | 'email' | 'copy';

function getGreeting(name: string): string {
  const h    = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${time}, ${name.split(' ')[0]} 👋`;
}

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type FrustrationLevel = 'none' | 'moderate' | 'high';
interface FrustrationResult {
  level:   FrustrationLevel;
  signals: string[];
  context: string; // sent to AI
}

function detectFrustration(phone: string, recent: RecentEntry[]): FrustrationResult {
  const history = recent
    .filter(e => e.phoneNumber === phone)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (history.length === 0) return { level: 'none', signals: [], context: '' };

  let score = 0;
  const signals: string[] = [];
  const now  = Date.now();
  const latest = history[0];
  const oldest = history[history.length - 1];
  const delays = history.filter(e => e.status === 'delay');
  const hoursSinceLatest = (now - new Date(latest.timestamp).getTime()) / 3600000;
  const hoursSinceFirst  = (now - new Date(oldest.timestamp).getTime()) / 3600000;
  const pendingStatuses  = ['received', 'delay', 'pre-order'];

  if (delays.length >= 3) { score += 50; signals.push(`${delays.length} delay updates`); }
  else if (delays.length === 2) { score += 35; signals.push('2 delay updates'); }
  else if (delays.length === 1) { score += 15; signals.push('1 delay update'); }

  if (history.length >= 5) { score += 20; signals.push(`${history.length} messages sent`); }
  else if (history.length >= 3) { score += 10; signals.push(`${history.length} messages sent`); }

  if (pendingStatuses.includes(latest.status) && hoursSinceLatest >= 72) {
    score += 25; signals.push('waiting 3+ days');
  } else if (pendingStatuses.includes(latest.status) && hoursSinceLatest >= 48) {
    score += 15; signals.push('waiting 2+ days');
  }

  if (hoursSinceFirst >= 168) { score += 15; signals.push('order 7+ days old'); }

  if (latest.status === 'delay') { score += 10; }

  const level: FrustrationLevel = score >= 55 ? 'high' : score >= 25 ? 'moderate' : 'none';

  const context = level === 'high'
    ? `This customer has been waiting a long time and received multiple delay updates (${signals.join(', ')}). They may be frustrated or anxious. Be genuinely empathetic, acknowledge their patience explicitly, and make them feel like a priority — this is a trust-repair moment.`
    : level === 'moderate'
    ? `This customer may be experiencing some frustration (${signals.join(', ')}). Be warmer and more reassuring than usual.`
    : '';

  return { level, signals, context };
}

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

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      if (!p) { router.replace('/(setup)'); return; }
      setProfile(p);
      setGreeting(getGreeting(p.businessName || 'there'));

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
      saveDraft({ customerName, phoneNumber, email, status, receivedNote, delayReason, dispatchDate, readyNote, preOrderNote, tone, courier, otherCourierName, waybill, message });
    }, 400);
    return () => clearTimeout(t);
  }, [customerName, phoneNumber, email, status, receivedNote, delayReason, dispatchDate, readyNote, preOrderNote, tone, courier, otherCourierName, waybill, message]);

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
  };

  const handleStatusPress = (id: string) => {
    setStatus(id);
    clearStatusNotes();
    if (id === 'delay' || id === 'pre-order') setTone('apologetic');
    else if (id === 'received' || id === 'ready') setTone('friendly');
  };

  const handleExtract = async () => {
    if (!orderText.trim()) return;
    setExtracting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res  = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/extract-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ orderText }),
      });
      const data = await res.json();
      if (data.name)  setCustomerName(data.name);
      if (data.phone) setPhoneNumber(data.phone);
      if (data.email) setEmail(data.email);
      setOrderText('');
    } catch { Alert.alert('Error', 'Could not extract order details.'); }
    finally  { setExtracting(false); }
  };

  const selectedCourier = COURIERS.find(c => c.name === courier);
  const effectiveCourierName = courier === 'other' ? (otherCourierName.trim() || null) : (selectedCourier?.name ?? null);

  const handleGenerate = async () => {
    if (!customerName.trim() || !phoneNumber.trim() || !status) {
      Alert.alert('Missing info', 'Enter a name, phone number, and pick a status.');
      return;
    }
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res  = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          customerName:        customerName.trim(),
          status,
          tone,
          businessName:        profile?.businessName ?? '',
          receivedNote,
          dispatchDate,
          courierName:         effectiveCourierName,
          courierDeliveryTime: selectedCourier?.deliveryTime ?? null,
          waybillNumber:       waybill.trim() || null,
          delayReason,
          readyNote,
          preOrderNote,
          pickupAddress:      status === 'ready' ? (profile?.pickupAddress || null) : null,
          businessHours:      status === 'ready' ? (profile?.businessHours || null) : null,
          frustrationContext: frustration.context || null,
        }),
      });
      const data = await res.json();
      setMessage(data.message ?? '');
    } catch { Alert.alert('Error', 'Could not generate message. Check your connection.'); }
    finally  { setGenerating(false); }
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
    getRecent().then(r => { setLastEntry(r[0] ?? null); setForgotten(getForgottenCustomers(r)); });

    // milestone confetti at 10, 50, 100
    const MILESTONES = [10, 50, 100];
    const lastMs = await getLastMilestone();
    const hit = MILESTONES.filter(m => m > lastMs && newTotal >= m).pop();
    if (hit) { await setLastMilestone(hit); setMilestone(hit); setShowConfetti(true); }

    if      (channel === 'whatsapp') openWhatsApp(phoneNumber, message);
    else if (channel === 'sms')      openSMS(phoneNumber, message);
    else if (channel === 'email')    openEmail(email, profile?.businessName ?? '', message);
    else                             await Share.share({ message });
  };

  const handleClear = () => {
    setOrderText(''); setCustomerName(''); setPhoneNumber(''); setEmail('');
    setCourier(null); setOtherCourierName(''); setWaybill(''); setStatus(null); setMessage(''); setTone('friendly');
    clearStatusNotes();
    clearDraft();
  };

  const handleRecentTap = (index: number) => {
    setExpandedIndex(prev => prev === index ? null : index);
  };

  const handleUseContact = (entry: RecentEntry) => {
    setCustomerName(entry.customerName);
    setPhoneNumber(entry.phoneNumber);
    setEmail(entry.email ?? '');
    if (entry.courier) setCourier(entry.courier);
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
            {RECENT_FILTERS.map(f => (
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

                    {expanded ? (
                      <>
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
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); handleUseContact(entry); }}
                          style={s.useContactBtn}
                        >
                          <Text style={s.useContactText}>Use this contact for a new message →</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={s.recentPreview} numberOfLines={2}>{preview}</Text>
                    )}
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

        {/* Paste Order */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>PASTE ORDER</Text>
          <TextInput
            style={s.pasteInput}
            value={orderText}
            onChangeText={setOrderText}
            multiline
            placeholder={"Paste the full order here — name, phone, email, items...\n\nThe app will extract everything automatically."}
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

        {/* Courier */}
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

        {/* Status */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>STATUS</Text>
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
        </View>

        {/* Status note pickers */}
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

        {/* Tone */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>TONE</Text>
          <View style={s.toneRow}>
            {(['friendly', 'professional', 'apologetic'] as Tone[]).map(t => (
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
