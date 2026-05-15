import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface BusinessProfile {
  businessName: string;
  businessPhone: string;
  pickupAddress: string;
  businessHours: string;
}

export interface RecentEntry {
  customerName: string;
  phoneNumber: string;
  email?: string;
  status: string;
  delayReason?: string | null;
  courier?: string | null;
  channel: 'whatsapp' | 'sms' | 'email' | 'copy';
  message: string;
  timestamp: string;
}

const PROFILE_KEY  = 'orderping_profile';
const RECENT_KEY   = 'orderping_recent';
const MAX_RECENT   = 30;

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<BusinessProfile | null> {
  try {
    const data = await AsyncStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: BusinessProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function fetchProfileFromSupabase(): Promise<BusinessProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) return null;

    const profile: BusinessProfile = {
      businessName:  data.business_name  ?? '',
      businessPhone: data.business_phone ?? '',
      pickupAddress: data.pickup_address ?? '',
      businessHours: data.business_hours ?? '',
    };

    await saveProfile(profile);
    return profile;
  } catch {
    return null;
  }
}

export async function syncProfileToSupabase(profile: BusinessProfile): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').upsert({
      id:             user.id,
      business_name:  profile.businessName,
      business_phone: profile.businessPhone,
      pickup_address: profile.pickupAddress,
      business_hours: profile.businessHours,
      updated_at:     new Date().toISOString(),
    });
  } catch {}
}

// ── Recent ───────────────────────────────────────────────────────────────────

export async function getRecent(): Promise<RecentEntry[]> {
  try {
    const data = await AsyncStorage.getItem(RECENT_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function mergeRecent(local: RecentEntry[], remote: RecentEntry[]): RecentEntry[] {
  const seen = new Set<string>();
  const merged: RecentEntry[] = [];
  for (const e of [...local, ...remote]) {
    const key = `${e.phoneNumber}|${e.timestamp}`;
    if (!seen.has(key)) { seen.add(key); merged.push(e); }
  }
  return merged
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MAX_RECENT);
}

export async function addRecent(entry: RecentEntry): Promise<void> {
  const recent = await getRecent();
  recent.unshift(entry);
  if (recent.length > MAX_RECENT) recent.splice(MAX_RECENT);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  syncRecentEntryToSupabase(entry);
}

export async function clearRecent(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_KEY);
  deleteAllRecentFromSupabase();
}

async function syncRecentEntryToSupabase(entry: RecentEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('recent_messages').upsert({
      user_id:       user.id,
      customer_name: entry.customerName,
      phone_number:  entry.phoneNumber,
      email:         entry.email ?? null,
      status:        entry.status,
      delay_reason:  entry.delayReason ?? null,
      courier:       entry.courier ?? null,
      channel:       entry.channel,
      message:       entry.message,
      sent_at:       entry.timestamp,
    }, { onConflict: 'user_id,phone_number,sent_at' });
  } catch {}
}

async function deleteAllRecentFromSupabase(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('recent_messages').delete().eq('user_id', user.id);
  } catch {}
}

export async function fetchAndMergeRecent(): Promise<RecentEntry[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return getRecent();
    const { data, error } = await supabase
      .from('recent_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(MAX_RECENT);
    if (error || !data) return getRecent();
    const remote: RecentEntry[] = data.map((r: Record<string, unknown>) => ({
      customerName: r.customer_name as string,
      phoneNumber:  r.phone_number as string,
      email:        (r.email as string | null) ?? undefined,
      status:       r.status as string,
      delayReason:  (r.delay_reason as string | null) ?? null,
      courier:      (r.courier as string | null) ?? null,
      channel:      r.channel as RecentEntry['channel'],
      message:      r.message as string,
      timestamp:    r.sent_at as string,
    }));
    const merged = mergeRecent(await getRecent(), remote);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return getRecent();
  }
}

// ── Note History ─────────────────────────────────────────────────────────────

const NOTE_HISTORY_KEY = 'orderping_note_history';

export async function getNoteHistory(statusKey: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTE_HISTORY_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return Array.isArray(all[statusKey]) ? all[statusKey] : [];
  } catch { return []; }
}

export async function addNoteHistory(statusKey: string, note: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(NOTE_HISTORY_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const existing: string[] = Array.isArray(all[statusKey]) ? all[statusKey] : [];
    const updated = [note, ...existing.filter(n => n !== note)].slice(0, 3);
    all[statusKey] = updated;
    await AsyncStorage.setItem(NOTE_HISTORY_KEY, JSON.stringify(all));
  } catch {}
}

// ── Stats ────────────────────────────────────────────────────────────────────

const TOTAL_SENT_KEY     = 'orderping_total_sent';
const LAST_MILESTONE_KEY = 'orderping_last_milestone';

export async function getTotalSent(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(TOTAL_SENT_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}

export async function incrementTotalSent(): Promise<number> {
  const next = (await getTotalSent()) + 1;
  await AsyncStorage.setItem(TOTAL_SENT_KEY, String(next));
  return next;
}

export async function getLastMilestone(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LAST_MILESTONE_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}

export async function setLastMilestone(n: number): Promise<void> {
  await AsyncStorage.setItem(LAST_MILESTONE_KEY, String(n));
}

// ── Session tracking ─────────────────────────────────────────────────────────

const LAST_OPEN_KEY   = 'orderping_last_open';
const WEEK_REPORT_KEY = 'orderping_week_report';

export async function getLastOpen(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LAST_OPEN_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}

export async function setLastOpen(): Promise<void> {
  await AsyncStorage.setItem(LAST_OPEN_KEY, String(Date.now()));
}

export async function getWeekReportDismissed(): Promise<string> {
  try { return (await AsyncStorage.getItem(WEEK_REPORT_KEY)) ?? ''; }
  catch { return ''; }
}

export async function setWeekReportDismissed(weekKey: string): Promise<void> {
  await AsyncStorage.setItem(WEEK_REPORT_KEY, weekKey);
}

// ── Draft ────────────────────────────────────────────────────────────────────

export interface FormDraft {
  customerName:     string;
  phoneNumber:      string;
  email:            string;
  status:           string | null;
  receivedNote:     string | null;
  delayReason:      string | null;
  dispatchDate:     string | null;
  readyNote:        string | null;
  preOrderNote:     string | null;
  tone:             string;
  courier:          string | null;
  otherCourierName: string;
  waybill:          string;
  message:          string;
}

const DRAFT_KEY        = 'orderping_draft';
const LAST_COURIER_KEY = 'orderping_last_courier';

export async function getDraft(): Promise<FormDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function saveDraft(draft: FormDraft): Promise<void> {
  try { await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
}

export async function clearDraft(): Promise<void> {
  try { await AsyncStorage.removeItem(DRAFT_KEY); } catch {}
}

export async function getLastCourier(): Promise<string | null> {
  try { return await AsyncStorage.getItem(LAST_COURIER_KEY); } catch { return null; }
}

export async function saveLastCourier(name: string): Promise<void> {
  try { await AsyncStorage.setItem(LAST_COURIER_KEY, name); } catch {}
}
