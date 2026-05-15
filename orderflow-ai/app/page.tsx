'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import CustomerInput, { type Recipient, type CustomerInputHandle } from '@/components/CustomerInput';
import StatusSelector from '@/components/StatusSelector';
import DelayPicker, { DELAY_PRESET_IDS } from '@/components/DelayPicker';
import ReceivedPicker, { RECEIVED_PRESET_IDS } from '@/components/ReceivedPicker';
import ReadyPicker, { READY_PRESET_IDS } from '@/components/ReadyPicker';
import PreOrderPicker, { PREORDER_PRESET_IDS } from '@/components/PreOrderPicker';
import DispatchDatePicker, { DISPATCH_PRESET_IDS } from '@/components/DispatchDatePicker';
import CourierPaste, { type CourierId, resolveCourier } from '@/components/CourierPaste';
import ToneSelector from '@/components/ToneSelector';
import MessageEditor from '@/components/MessageEditor';
import SendButtons from '@/components/SendButtons';
import RecentList from '@/components/RecentList';
import Confetti from '@/components/Confetti';
import {
  getProfile, fetchProfileFromSupabase, syncProfileToSupabase,
  addRecent, getRecent, getLastCourier, saveLastCourier, addNoteHistory,
  incrementTotalSent, getLastMilestone, setLastMilestone,
  getLastOpen, setLastOpen, getWeekReportDismissed, setWeekReportDismissed,
  getDraft, saveDraft, clearDraft, fetchAndMergeRecent,
} from '@/lib/storage';
import type { BusinessProfile, RecentEntry } from '@/lib/storage';
import { buildWhatsAppLink, buildSMSLink, buildEmailLink } from '@/lib/deep-links';
import { supabase } from '@/lib/supabase';

type Status = 'received' | 'delay' | 'dispatched' | 'ready' | 'pre-order' | null;
type Tone = 'friendly' | 'professional' | 'apologetic';
type Channel = 'whatsapp' | 'sms' | 'email' | 'copy';

interface WeekSummary {
  updates: number;
  customers: number;
  bestDay: string;
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
}

function getLastWeekSummary(recent: RecentEntry[]): WeekSummary | null {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfThisWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

  const lastWeekEntries = recent.filter(e => {
    const t = new Date(e.timestamp);
    return t >= startOfLastWeek && t < startOfThisWeek;
  });
  if (lastWeekEntries.length === 0) return null;

  const uniqueCustomers = new Set(lastWeekEntries.map(e => e.phoneNumber)).size;
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const countsByDay: Record<number, number> = {};
  lastWeekEntries.forEach(e => {
    const day = new Date(e.timestamp).getDay();
    countsByDay[day] = (countsByDay[day] ?? 0) + 1;
  });
  const bestDayNum = parseInt(Object.entries(countsByDay).sort((a, b) => b[1] - a[1])[0][0]);
  return { updates: lastWeekEntries.length, customers: uniqueCustomers, bestDay: DAY_NAMES[bestDayNum] };
}

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const STATUS_LABELS: Record<string, string> = {
  received: 'Received', delay: 'Delayed', dispatched: 'Dispatched',
  ready: 'Ready', 'pre-order': 'Pre-order',
};

function getForgottenCustomers(recent: RecentEntry[]): RecentEntry[] {
  const PENDING = ['received', 'delay', 'pre-order'];
  const now = Date.now();
  const seen = new Map<string, RecentEntry>();
  for (const e of recent) {
    if (!seen.has(e.phoneNumber)) seen.set(e.phoneNumber, e);
  }
  return Array.from(seen.values()).filter(e =>
    PENDING.includes(e.status) && now - new Date(e.timestamp).getTime() > 24 * 3600 * 1000
  );
}

const MILESTONES = [10, 25, 50, 100, 200, 500];

type FrustrationLevel = 'none' | 'moderate' | 'high';
interface FrustrationResult { level: FrustrationLevel; signals: string[]; context: string; }

function detectFrustration(phone: string, recent: RecentEntry[]): FrustrationResult {
  const history = recent
    .filter(e => e.phoneNumber === phone)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (history.length === 0) return { level: 'none', signals: [], context: '' };

  let score = 0;
  const signals: string[] = [];
  const now = Date.now();
  const latest = history[0];
  const oldest = history[history.length - 1];
  const delays = history.filter(e => e.status === 'delay');
  const hoursSinceLatest = (now - new Date(latest.timestamp).getTime()) / 3600000;
  const hoursSinceFirst  = (now - new Date(oldest.timestamp).getTime()) / 3600000;
  const pendingStatuses  = ['received', 'delay', 'pre-order'];

  if (delays.length >= 3)      { score += 50; signals.push(`${delays.length} delay updates`); }
  else if (delays.length === 2){ score += 35; signals.push('2 delay updates'); }
  else if (delays.length === 1){ score += 15; signals.push('1 delay update'); }

  if (history.length >= 5)     { score += 20; signals.push(`${history.length} messages sent`); }
  else if (history.length >= 3){ score += 10; signals.push(`${history.length} messages sent`); }

  if (pendingStatuses.includes(latest.status) && hoursSinceLatest >= 72)
    { score += 25; signals.push('waiting 3+ days'); }
  else if (pendingStatuses.includes(latest.status) && hoursSinceLatest >= 48)
    { score += 15; signals.push('waiting 2+ days'); }

  if (hoursSinceFirst >= 168) { score += 15; signals.push('order 7+ days old'); }
  if (latest.status === 'delay') score += 10;

  const level: FrustrationLevel = score >= 55 ? 'high' : score >= 25 ? 'moderate' : 'none';
  const context = level === 'high'
    ? `This customer has been waiting a long time and received multiple delay updates (${signals.join(', ')}). They may be frustrated or anxious. Be genuinely empathetic, acknowledge their patience explicitly, and make them feel like a priority — this is a trust-repair moment.`
    : level === 'moderate'
    ? `This customer may be experiencing some frustration (${signals.join(', ')}). Be warmer and more reassuring than usual.`
    : '';

  return { level, signals, context };
}

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  // Recipients
  const [recipients, setRecipients] = useState<Recipient[]>([{ name: '', phone: '', email: '', courier: null, customCourierName: '', waybill: '' }]);

  // Order paste & extraction
  const [orderText, setOrderText] = useState('');
  const [orderItems, setOrderItems] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');

  // Order details
  const [selectedStatus, setSelectedStatus] = useState<Status>(null);
  const [receivedNote, setReceivedNote] = useState<string | null>(null);
  const [delayReason, setDelayReason] = useState<string | null>(null);
  const [dispatchDate, setDispatchDate] = useState<string | null>(null);
  const [readyNote, setReadyNote] = useState<string | null>(null);
  const [preOrderNote, setPreOrderNote] = useState<string | null>(null);

  // Message
  const [selectedTone, setSelectedTone] = useState<Tone>('friendly');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [errors, setErrors] = useState<{
    recipients: Array<{ name?: string; phone?: string }>;
    status?: string;
  }>({ recipients: [{}] });

  // Recent
  const [showRecent, setShowRecent] = useState(false);
  const [recentKey, setRecentKey] = useState(0);

  // Engagement
  const [todayCount, setTodayCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastEntry, setLastEntry] = useState<RecentEntry | null>(null);
  const [forgotten, setForgotten] = useState<RecentEntry[]>([]);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [weekSummary, setWeekSummary] = useState<WeekSummary | null>(null);
  const [showWeekCard, setShowWeekCard] = useState(false);
  const [hoursAway, setHoursAway] = useState(0);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [recentList, setRecentList] = useState<RecentEntry[]>([]);
  const [frustration, setFrustration] = useState<FrustrationResult>({ level: 'none', signals: [], context: '' });
  const toneAutoSet = useRef(false);

  const messageRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const customerInputRef = useRef<CustomerInputHandle>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/auth'); return; }
      let p = getProfile();
      if (!p) {
        p = await fetchProfileFromSupabase();
      } else {
        syncProfileToSupabase(p);
      }
      if (!p) { router.replace('/setup'); return; }
      setProfile(p);

      // Restore in-progress draft, or fall back to last-used courier
      const draft = getDraft();
      if (draft) {
        setRecipients([{
          name: draft.name,
          phone: draft.phone,
          email: draft.email,
          courier: (draft.courier as CourierId) ?? null,
          customCourierName: draft.customCourierName,
          waybill: draft.waybill,
        }]);
        if (draft.status)      setSelectedStatus(draft.status as Status);
        if (draft.receivedNote) setReceivedNote(draft.receivedNote);
        if (draft.delayReason)  setDelayReason(draft.delayReason);
        if (draft.dispatchDate) setDispatchDate(draft.dispatchDate);
        if (draft.readyNote)    setReadyNote(draft.readyNote);
        if (draft.preOrderNote) setPreOrderNote(draft.preOrderNote);
        if (draft.tone)         setSelectedTone(draft.tone as Tone);
        if (draft.message)      setGeneratedMessage(draft.message);
        if (draft.orderItems)   setOrderItems(draft.orderItems);
      } else {
        const lastCourier = getLastCourier();
        if (lastCourier) {
          setRecipients([{ name: '', phone: '', email: '', courier: lastCourier as CourierId, customCourierName: '', waybill: '' }]);
        }
      }

      // Today count + forgotten customers + last entry (merged with Supabase)
      const recent = await fetchAndMergeRecent();
      const todayStr = new Date().toDateString();
      setTodayCount(recent.filter(e => new Date(e.timestamp).toDateString() === todayStr).length);
      setLastEntry(recent[0] ?? null);
      setForgotten(getForgottenCustomers(recent));
      setRecentList(recent);

      // Session tracking
      const lastOpen = getLastOpen();
      setLastOpen();
      const hoursSince = lastOpen ? Math.floor((Date.now() - lastOpen) / 3600000) : 0;
      if (hoursSince >= 48) {
        setHoursAway(Math.floor(hoursSince / 24));
        setShowWelcomeBack(true);
      }

      // Weekly report card — Mondays only
      const now = new Date();
      if (now.getDay() === 1) {
        const weekKey = getWeekKey(now);
        if (getWeekReportDismissed() !== weekKey) {
          const summary = getLastWeekSummary(recent);
          if (summary) { setWeekSummary(summary); setShowWeekCard(true); }
        }
      }
    });
  }, [router]);

  useEffect(() => {
    if (selectedStatus === 'delay' || selectedStatus === 'pre-order') {
      setSelectedTone('apologetic');
    } else if (selectedStatus === 'received' || selectedStatus === 'ready') {
      setSelectedTone('friendly');
    }
  }, [selectedStatus]);

  useEffect(() => {
    const phone = recipients[0]?.phone?.trim() ?? '';
    if (!phone || recentList.length === 0) {
      setFrustration({ level: 'none', signals: [], context: '' });
      toneAutoSet.current = false;
      return;
    }
    const result = detectFrustration(phone, recentList);
    setFrustration(result);
    if (result.level !== 'none' && !toneAutoSet.current) {
      setSelectedTone('apologetic');
      toneAutoSet.current = true;
    }
    if (result.level === 'none') toneAutoSet.current = false;
  }, [recipients[0]?.phone, recentList]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save form as draft (debounced 400ms) — cleared on "Clear & Start New"
  useEffect(() => {
    const r0 = recipients[0];
    if (!r0?.name && !r0?.phone && !selectedStatus && !generatedMessage) return;
    const t = setTimeout(() => {
      saveDraft({
        name:             r0?.name ?? '',
        phone:            r0?.phone ?? '',
        email:            r0?.email ?? '',
        status:           selectedStatus,
        receivedNote,
        delayReason,
        dispatchDate,
        readyNote,
        preOrderNote,
        tone:             selectedTone,
        courier:          r0?.courier ?? null,
        customCourierName: r0?.customCourierName ?? '',
        waybill:          r0?.waybill ?? '',
        message:          generatedMessage,
        orderItems,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [recipients, selectedStatus, receivedNote, delayReason, dispatchDate, readyNote, preOrderNote, selectedTone, generatedMessage, orderItems]);

  const updateRecipient = (index: number, field: 'name' | 'phone' | 'email' | 'customCourierName' | 'waybill', value: string) => {
    setRecipients((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
    if (field === 'name' || field === 'phone') {
      setErrors((e) => {
        const updated = [...e.recipients];
        updated[index] = { ...updated[index], [field]: undefined };
        return { ...e, recipients: updated };
      });
    }
  };

  const updateRecipientCourier = (index: number, courier: CourierId | null) => {
    setRecipients((prev) => prev.map((r, i) => i === index ? { ...r, courier } : r));
  };

  const handleExtract = async () => {
    if (!orderText.trim()) return;
    setIsExtracting(true);
    setExtractError('');
    try {
      const { data: { session: sess } } = await supabase.auth.getSession();
      const res = await fetch('/api/extract-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sess?.access_token ?? ''}`,
        },
        body: JSON.stringify({ orderText }),
      });
      if (!res.ok) throw new Error('Extraction failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecipients([{
        name: data.name ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        courier: null, customCourierName: '', waybill: '',
      }]);
      setOrderItems(data.items ?? '');
      setOrderText('');
      setErrors({ recipients: [{}] });
    } catch (err) {
      setExtractError((err as Error).message || 'Could not extract order details');
    } finally {
      setIsExtracting(false);
    }
  };

  const clearStatusNotes = () => {
    setReceivedNote(null);
    setDelayReason(null);
    setDispatchDate(null);
    setReadyNote(null);
    setPreOrderNote(null);
  };

  const validate = () => {
    const recipientErrs = recipients.map((r) => {
      const e: { name?: string; phone?: string } = {};
      if (!r.name.trim()) e.name = 'Add a name';
      if (!r.phone.trim()) e.phone = 'Add a phone number';
      return e;
    });
    const statusErr = !selectedStatus ? 'Pick a status' : undefined;
    setErrors({ recipients: recipientErrs, status: statusErr });
    return !recipientErrs.some((e) => e.name || e.phone) && !statusErr;
  };

  const handleGenerate = async () => {
    setGenerateError('');
    if (!validate() || !profile) return;
    setIsGenerating(true);
    setGeneratedMessage('');

    try {
      const r0 = recipients[0];
      const { name: courierName, deliveryTime: courierDeliveryTime } = resolveCourier(
        r0?.courier ?? null,
        r0?.customCourierName ?? ''
      );

      const { data: { session: genSess } } = await supabase.auth.getSession();
      const res = await fetch('/api/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${genSess?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          customerName: r0?.name.trim() ?? '',
          status: selectedStatus,
          receivedNote,
          dispatchDate: dispatchDate || null,
          courierName,
          courierDeliveryTime,
          waybillNumber: r0?.waybill?.trim() || null,
          courierMessage: null,
          delayReason,
          readyNote,
          preOrderNote,
          orderItems: orderItems || null,
          tone: selectedTone,
          businessName: profile.businessName,
          pickupAddress: profile.pickupAddress || null,
          businessHours: profile.businessHours || null,
          frustrationContext: frustration.context || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      if (data.message) {
        setGeneratedMessage(data.message);
        setTimeout(() => messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

        if (selectedStatus === 'delay' && delayReason && !DELAY_PRESET_IDS.includes(delayReason))
          addNoteHistory('delay', delayReason);
        if (selectedStatus === 'received' && receivedNote && !RECEIVED_PRESET_IDS.includes(receivedNote))
          addNoteHistory('received', receivedNote);
        if (selectedStatus === 'ready' && readyNote && !READY_PRESET_IDS.includes(readyNote))
          addNoteHistory('ready', readyNote);
        if (selectedStatus === 'pre-order' && preOrderNote && !PREORDER_PRESET_IDS.includes(preOrderNote))
          addNoteHistory('pre-order', preOrderNote);
        if (selectedStatus === 'dispatched' && dispatchDate && !DISPATCH_PRESET_IDS.includes(dispatchDate))
          addNoteHistory('dispatched', dispatchDate);
      } else {
        throw new Error('No message returned. Try again.');
      }
    } catch (err) {
      setGenerateError((err as Error).message || 'Something went wrong. Try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = useCallback((channel: Channel, recipient: Recipient) => {
    if (!generatedMessage || !profile) return;

    const message = generatedMessage;

    addRecent({
      customerName: recipient.name.trim(),
      phoneNumber: recipient.phone.trim(),
      email: recipient.email.trim() || undefined,
      status: selectedStatus || '',
      delayReason,
      courier: recipient.courier ?? null,
      channel,
      message,
      timestamp: new Date().toISOString(),
    });
    if (recipient.courier) saveLastCourier(recipient.courier);
    setRecentKey((k) => k + 1);

    // Refresh last entry + forgotten + recent list for frustration detection
    const updated = getRecent();
    setLastEntry(updated[0] ?? null);
    setForgotten(getForgottenCustomers(updated));
    setRecentList(updated);

    // Milestone tracking
    const count = incrementTotalSent();
    const last = getLastMilestone();
    const hit = MILESTONES.find(m => count >= m && last < m);
    if (hit) { setLastMilestone(hit); setShowConfetti(true); }
    setTodayCount(prev => prev + 1);

    if (channel === 'whatsapp') {
      window.open(buildWhatsAppLink(recipient.phone.trim(), message), '_blank');
    } else if (channel === 'sms') {
      window.open(buildSMSLink(recipient.phone.trim(), message));
    } else if (channel === 'email') {
      window.open(buildEmailLink(recipient.email.trim(), profile.businessName, message));
    } else {
      navigator.clipboard.writeText(message).catch(() => {});
    }
  }, [generatedMessage, selectedStatus, delayReason, profile]);

  const handleClear = () => {
    setRecipients([{ name: '', phone: '', email: '', courier: null, customCourierName: '', waybill: '' }]);
    setSelectedStatus(null);
    clearStatusNotes();
    setSelectedTone('friendly');
    setGeneratedMessage('');
    setOrderText('');
    setOrderItems('');
    setExtractError('');
    setGenerateError('');
    setErrors({ recipients: [{}] });
    clearDraft();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRecentSelect = (name: string, phone: string, email: string, courier?: string | null) => {
    setRecipients([{ name, phone, email: email ?? '', courier: (courier as CourierId) ?? null, customCourierName: '', waybill: '' }]);
    setSelectedStatus(null);
    clearStatusNotes();
    setGeneratedMessage('');
    setErrors({ recipients: [{}] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!profile) return null;

  return (
    <div style={{ background: 'var(--background)', minHeight: '100dvh' }}>
      <Confetti visible={showConfetti} onDone={() => setShowConfetti(false)} />
      <Header
        onSettingsClick={() => router.push('/setup')}
        onRecentClick={() => setShowRecent(v => !v)}
        showRecent={showRecent}
        businessName={profile.businessName}
      />

      <main ref={formRef} style={{
        maxWidth: 'var(--max-width)', margin: '0 auto',
        padding: 'var(--space-4)', paddingBottom: 80,
        display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
      }}>

        {/* ── Stats card — always at top ── */}
        <div style={{
          background: 'linear-gradient(135deg, #EEF4FF 0%, #F8FAFF 100%)',
          borderRadius: 16,
          border: '1.5px solid #BFDBFE',
          padding: '18px 20px', marginBottom: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(26,110,245,0.08)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{
              margin: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: '2.5rem', fontWeight: 800,
              color: 'var(--primary)', fontFamily: 'var(--font-display)', lineHeight: 1,
            }}>
              {todayCount}
              <span style={{ fontSize: '1.5rem' }}>📈</span>
            </p>
            <p style={{
              margin: '6px 0 0', fontSize: '0.75rem', color: '#1A6EF5',
              fontWeight: 700, fontFamily: 'var(--font-body)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              customers informed today
            </p>
          </div>
        </div>

        {/* Welcome back card */}
        {showWelcomeBack && (
          <div style={{
            background: '#F0FDF4', border: '1.5px solid #BBF7D0',
            borderRadius: 16, padding: 16, position: 'relative',
          }}>
            <button
              onClick={() => setShowWelcomeBack(false)}
              style={{
                position: 'absolute', top: 10, right: 12,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, color: 'var(--text-muted)', lineHeight: 1, padding: 2,
              }}
            >✕</button>
            <p style={{
              margin: '0 0 4px', fontSize: '1rem', fontWeight: 700,
              color: '#166534', fontFamily: 'var(--font-display)',
            }}>
              👋 Welcome back{profile.businessName ? `, ${profile.businessName.split(' ')[0]}` : ''}!
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#15803D', fontFamily: 'var(--font-body)' }}>
              You&apos;ve been away {hoursAway} day{hoursAway !== 1 ? 's' : ''}.
              {forgotten.length > 0 && (
                <> {forgotten.length} customer{forgotten.length !== 1 ? 's' : ''} may need an update.</>
              )}
            </p>
          </div>
        )}

        {/* Weekly report card — Mondays only */}
        {showWeekCard && weekSummary && (
          <div style={{
            background: '#EFF6FF', border: '1.5px solid #BFDBFE',
            borderRadius: 16, padding: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{
                fontSize: '0.9375rem', fontWeight: 700,
                color: '#1E40AF', fontFamily: 'var(--font-display)',
              }}>
                📊 Last week
              </span>
              <button
                onClick={() => { setShowWeekCard(false); setWeekReportDismissed(getWeekKey(new Date())); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 18, color: 'var(--text-muted)', lineHeight: 1, padding: 2,
                }}
              >✕</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              {([
                { num: weekSummary.updates, label: 'updates' },
                { num: weekSummary.customers, label: 'customers' },
                { num: weekSummary.bestDay.slice(0, 3), label: 'best day' },
              ] as const).map(({ num, label }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <p style={{
                    margin: 0, fontSize: '1.75rem', fontWeight: 800,
                    color: 'var(--primary)', fontFamily: 'var(--font-display)',
                  }}>
                    {num}
                  </p>
                  <p style={{
                    margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)',
                    fontWeight: 600, fontFamily: 'var(--font-body)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All good card — shown when there are no forgotten customers but at least one message sent */}
        {lastEntry && forgotten.length === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
            border: '1.5px solid #BBF7D0',
            borderRadius: 16, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 2px 12px rgba(34,197,94,0.08)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#DCFCE7', border: '1.5px solid #86EFAC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: '1.125rem', fontWeight: 700, color: '#166534',
            }}>
              ✓
            </div>
            <div>
              <p style={{
                margin: 0, fontSize: '0.9375rem', fontWeight: 700,
                color: '#166534', fontFamily: 'var(--font-display)',
              }}>
                All customers have been informed.
              </p>
              <p style={{
                margin: '2px 0 0', fontSize: '0.8125rem',
                color: '#15803D', fontFamily: 'var(--font-body)', fontWeight: 400,
              }}>
                Last: {lastEntry.customerName} · {STATUS_LABELS[lastEntry.status] ?? lastEntry.status} · {relativeTime(lastEntry.timestamp)}
              </p>
            </div>
          </div>
        )}

        {/* Reminder card — forgotten customers with clickable rows */}
        {lastEntry && forgotten.length > 0 && !reminderDismissed && (
          <div style={{
            background: '#FFFBEB', border: '1.5px solid #FDE68A',
            borderRadius: 16, padding: '12px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
              <p style={{
                margin: 0, fontSize: '0.8125rem', fontWeight: 500,
                color: '#92400E', fontFamily: 'var(--font-body)', flex: 1,
              }}>
                Last update: <strong>{lastEntry.customerName}</strong>{' '}
                <span style={{ color: '#B45309' }}>
                  ({STATUS_LABELS[lastEntry.status] ?? lastEntry.status} · {relativeTime(lastEntry.timestamp)})
                </span>
              </p>
              <button
                onClick={() => setReminderDismissed(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#B45309', fontSize: '1rem', lineHeight: 1,
                  padding: '0 0 0 8px', opacity: 0.7, flexShrink: 0,
                }}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
            <p style={{
              margin: '0 0 10px', fontSize: '0.875rem', fontWeight: 700,
              color: '#92400E', fontFamily: 'var(--font-display)',
            }}>
              Are you sure you&apos;re not missing anyone? 👀
            </p>
            {forgotten.map((c, i) => (
              <button
                key={i}
                onClick={() => {
                  setRecipients([{ name: c.customerName, phone: c.phoneNumber, email: c.email ?? '', courier: null, customCourierName: '', waybill: '' }]);
                  setErrors({ recipients: [{}] });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.6)', border: '1px solid #FDE68A',
                  borderRadius: 10, padding: '10px 12px', marginBottom: 6,
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#92400E', fontFamily: 'var(--font-display)' }}>
                    {c.customerName}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#B45309', fontFamily: 'var(--font-body)' }}>
                    {STATUS_LABELS[c.status] ?? c.status} · {relativeTime(c.timestamp)}
                  </p>
                </div>
                <span style={{ color: '#B45309', fontSize: '1rem' }}>→</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Recent panel (full view, replaces form) ── */}
        {showRecent && (
          <div style={{ marginTop: 8 }}>
            <RecentList key={recentKey} onSelect={handleRecentSelect} businessName={profile.businessName} />
          </div>
        )}

        {/* ── Main form ── */}
        {!showRecent && <>

        {/* Order paste section */}
        <div style={{
          background: 'var(--surface)', borderRadius: 20,
          border: '1.5px solid var(--border)',
          padding: 'var(--space-4)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          marginBottom: 'var(--space-2)',
        }}>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 700,
            color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.06em', margin: '0 0 8px',
          }}>
            Paste Order
          </p>
          <textarea
            value={orderText}
            onChange={(e) => setOrderText(e.target.value)}
            placeholder={"Paste the full order here — name, phone, email, items...\n\nThe app will extract everything automatically."}
            rows={4}
            style={{
              width: '100%', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '12px var(--space-4)',
              background: 'var(--background)', fontFamily: 'var(--font-body)',
              fontSize: '0.9375rem', color: 'var(--text)', resize: 'none',
              outline: 'none', lineHeight: 1.6,
            }}
          />
          {extractError && (
            <p style={{ marginTop: 6, fontSize: '0.8125rem', color: 'var(--error)', fontFamily: 'var(--font-body)' }}>
              {extractError}
            </p>
          )}
          <button
            type="button"
            onClick={handleExtract}
            disabled={isExtracting || !orderText.trim()}
            style={{
              marginTop: 10, width: '100%', padding: '13px',
              borderRadius: 'var(--radius-xl)', border: 'none',
              background: isExtracting || !orderText.trim() ? 'var(--border)' : 'var(--primary)',
              color: isExtracting || !orderText.trim() ? 'var(--text-muted)' : 'white',
              cursor: isExtracting || !orderText.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700,
              minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all var(--transition-fast)',
            }}
          >
            {isExtracting ? <><Loader2 size={16} className="animate-spin" /> Extracting...</> : '⚡ Extract Details'}
          </button>
        </div>

        {/* Extracted items badge */}
        {orderItems && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px var(--space-4)',
            background: 'var(--primary-soft)',
            borderRadius: 'var(--radius-xl)',
            border: '1.5px solid var(--primary-light)',
          }}>
            <span style={{ fontSize: '1rem' }}>🛍️</span>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '0.875rem',
              fontWeight: 600, color: 'var(--primary)', flex: 1,
            }}>
              {orderItems}
            </span>
            <button
              type="button"
              onClick={() => setOrderItems('')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1, padding: 2,
              }}
            >
              ×
            </button>
          </div>
        )}

        <CustomerInput
          ref={customerInputRef}
          recipients={recipients}
          onUpdate={updateRecipient}
          onCourierChange={updateRecipientCourier}
          errors={errors.recipients}
          showCourier={false}
        />

        {/* Mood detection card */}
        {frustration.level !== 'none' && (
          <div style={{
            background: frustration.level === 'high' ? '#FFF7ED' : '#FFFBEB',
            border: `1.5px solid ${frustration.level === 'high' ? '#FED7AA' : '#FDE68A'}`,
            borderRadius: 16, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,0,0,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', flexShrink: 0,
              }}>
                {frustration.level === 'high' ? '⚠️' : '🔍'}
              </div>
              <div>
                <p style={{
                  margin: 0, fontSize: '0.8125rem', fontWeight: 700,
                  color: frustration.level === 'high' ? '#78350F' : '#92400E',
                  fontFamily: 'var(--font-display)',
                }}>
                  {frustration.level === 'high' ? 'Customer may be frustrated' : 'Customer needs extra care'}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#B45309', fontFamily: 'var(--font-body)' }}>
                  Tone auto-set to Apologetic
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {frustration.signals.map((sig, i) => (
                <span key={i} style={{
                  padding: '3px 10px', borderRadius: 20,
                  background: frustration.level === 'high' ? '#FFEDD5' : '#FEF3C7',
                  border: `1px solid ${frustration.level === 'high' ? '#FED7AA' : '#FDE68A'}`,
                  fontSize: '0.6875rem', fontWeight: 600,
                  color: frustration.level === 'high' ? '#78350F' : '#92400E',
                  fontFamily: 'var(--font-body)',
                }}>
                  {sig}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Courier — always visible, separate card */}
        <div style={{
          background: 'var(--surface)', borderRadius: 20,
          border: '1.5px solid var(--border)',
          padding: 'var(--space-4)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 700,
            color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.06em', margin: '0 0 4px',
          }}>
            Courier
          </p>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 400,
            color: 'var(--text-light)', margin: '0 0 14px', lineHeight: 1.4,
          }}>
            Select the courier you&apos;re using for this order
          </p>
          <CourierPaste
            courier={recipients[0]?.courier ?? null}
            customCourierName={recipients[0]?.customCourierName ?? ''}
            waybill={recipients[0]?.waybill ?? ''}
            onCourierChange={(v) => updateRecipientCourier(0, v)}
            onCustomCourierChange={(v) => updateRecipient(0, 'customCourierName', v)}
            onWaybillChange={(v) => updateRecipient(0, 'waybill', v)}
          />
        </div>

        <StatusSelector
          selected={selectedStatus}
          onSelect={(s) => {
            setSelectedStatus(s);
            clearStatusNotes();
            setGeneratedMessage('');
            setErrors((e) => ({ ...e, status: undefined }));
          }}
          error={errors.status}
        />

        {selectedStatus === 'received' && (
          <ReceivedPicker selected={receivedNote} onSelect={setReceivedNote} />
        )}

        {selectedStatus === 'delay' && (
          <DelayPicker selected={delayReason} onSelect={setDelayReason} />
        )}

        {selectedStatus === 'dispatched' && (
          <DispatchDatePicker selected={dispatchDate} onSelect={setDispatchDate} />
        )}

        {selectedStatus === 'ready' && (
          <ReadyPicker selected={readyNote} onSelect={setReadyNote} />
        )}

        {selectedStatus === 'pre-order' && (
          <PreOrderPicker selected={preOrderNote} onSelect={setPreOrderNote} />
        )}

        <ToneSelector selected={selectedTone} onSelect={setSelectedTone} />

        <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{
            width: '100%', padding: '16px 24px',
            borderRadius: 20,
            border: 'none',
            background: isGenerating ? 'var(--primary-light)' : 'var(--primary)',
            color: 'white',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            minHeight: 72,
            transition: 'all 0.18s ease',
            boxShadow: isGenerating ? 'none' : '0 6px 24px rgba(26,86,232,0.38)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            opacity: isGenerating ? 0.75 : 1,
          }}
        >
          {isGenerating ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Loader2 size={20} className="animate-spin" />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>
                Writing update…
              </span>
            </div>
          ) : (
            <>
              <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>✨</span>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: '1.0625rem',
                fontWeight: 800, letterSpacing: '-0.02em',
              }}>
                Generate Customer Update
              </span>
            </>
          )}
        </button>

        {generateError && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--error-soft)',
            border: '1.5px solid var(--error)',
            fontFamily: 'var(--font-body)', fontSize: '0.9rem',
            color: 'var(--error)', fontWeight: 500,
          }}>
            {generateError}
          </div>
        )}

        {isGenerating && !generatedMessage && (
          <div className="skeleton" style={{ height: 200, marginTop: 4 }} />
        )}

        {generatedMessage && (
          <>
            <div ref={messageRef}>
              <MessageEditor
                message={generatedMessage}
                onChange={setGeneratedMessage}
                onRegenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            </div>
            <SendButtons
              recipients={recipients}
              onSend={handleSend}
              onClear={handleClear}
              hasMessage={!!generatedMessage}
            />
          </>
        )}

        </>}
      </main>
    </div>
  );
}
