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

const PROFILE_KEY       = 'orderping_profile';
const RECENT_KEY        = 'orderping_recent';
const LAST_COURIER_KEY  = 'orderping_last_courier';
const NOTE_HISTORY_KEY  = 'orderping_note_history';
const MAX_RECENT        = 30;
const MAX_NOTE_HISTORY  = 3;

// ── Profile ──────────────────────────────────────────────────────────────────

export function getProfile(): BusinessProfile | null {
  try {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: BusinessProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// Fetch profile from Supabase and cache it in localStorage
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

    saveProfile(profile); // cache locally
    return profile;
  } catch {
    return null;
  }
}

// Upsert the profile to Supabase so it survives logout / new devices
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
  } catch {
    // non-fatal — localStorage copy is the fallback
  }
}

// ── Recent ───────────────────────────────────────────────────────────────────

export function getRecent(): RecentEntry[] {
  try {
    const data = localStorage.getItem(RECENT_KEY);
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

export function addRecent(entry: RecentEntry): void {
  const recent = getRecent();
  recent.unshift(entry);
  if (recent.length > MAX_RECENT) recent.splice(MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  syncRecentEntryToSupabase(entry);
}

export function clearRecent(): void {
  localStorage.removeItem(RECENT_KEY);
  deleteAllRecentFromSupabase();
}

async function syncRecentEntryToSupabase(entry: RecentEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('recent_messages').upsert({
      user_id:      user.id,
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
    const remote: RecentEntry[] = data.map(r => ({
      customerName: r.customer_name,
      phoneNumber:  r.phone_number,
      email:        r.email ?? undefined,
      status:       r.status,
      delayReason:  r.delay_reason ?? null,
      courier:      r.courier ?? null,
      channel:      r.channel as RecentEntry['channel'],
      message:      r.message,
      timestamp:    r.sent_at,
    }));
    const merged = mergeRecent(getRecent(), remote);
    localStorage.setItem(RECENT_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return getRecent();
  }
}

// ── Last used courier ─────────────────────────────────────────────────────────

export function getLastCourier(): string | null {
  try {
    return localStorage.getItem(LAST_COURIER_KEY);
  } catch {
    return null;
  }
}

export function saveLastCourier(courier: string): void {
  localStorage.setItem(LAST_COURIER_KEY, courier);
}

// ── Note history (per status) ─────────────────────────────────────────────────

export function getNoteHistory(statusKey: string): string[] {
  try {
    const data = localStorage.getItem(NOTE_HISTORY_KEY);
    const all = data ? JSON.parse(data) : {};
    return Array.isArray(all[statusKey]) ? all[statusKey] : [];
  } catch {
    return [];
  }
}

export function addNoteHistory(statusKey: string, note: string): void {
  try {
    const data = localStorage.getItem(NOTE_HISTORY_KEY);
    const all = data ? JSON.parse(data) : {};
    const history: string[] = Array.isArray(all[statusKey]) ? all[statusKey] : [];
    const deduped = history.filter((n) => n !== note);
    all[statusKey] = [note, ...deduped].slice(0, MAX_NOTE_HISTORY);
    localStorage.setItem(NOTE_HISTORY_KEY, JSON.stringify(all));
  } catch {}
}

// ── Stats ─────────────────────────────────────────────────────────────────────

const TOTAL_SENT_KEY     = 'orderping_total_sent';
const LAST_MILESTONE_KEY = 'orderping_last_milestone';

export function getTotalSent(): number {
  try {
    const raw = localStorage.getItem(TOTAL_SENT_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}

export function incrementTotalSent(): number {
  const next = getTotalSent() + 1;
  localStorage.setItem(TOTAL_SENT_KEY, String(next));
  return next;
}

export function getLastMilestone(): number {
  try {
    const raw = localStorage.getItem(LAST_MILESTONE_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}

export function setLastMilestone(n: number): void {
  localStorage.setItem(LAST_MILESTONE_KEY, String(n));
}

// ── Session tracking ──────────────────────────────────────────────────────────

const LAST_OPEN_KEY   = 'orderping_last_open';
const WEEK_REPORT_KEY = 'orderping_week_report';

export function getLastOpen(): number {
  try {
    const raw = localStorage.getItem(LAST_OPEN_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}

export function setLastOpen(): void {
  localStorage.setItem(LAST_OPEN_KEY, String(Date.now()));
}

export function getWeekReportDismissed(): string {
  try { return localStorage.getItem(WEEK_REPORT_KEY) ?? ''; }
  catch { return ''; }
}

export function setWeekReportDismissed(weekKey: string): void {
  localStorage.setItem(WEEK_REPORT_KEY, weekKey);
}

// ── Draft ─────────────────────────────────────────────────────────────────────

export interface FormDraft {
  name:             string;
  phone:            string;
  email:            string;
  status:           string | null;
  receivedNote:     string | null;
  delayReason:      string | null;
  dispatchDate:     string | null;
  readyNote:        string | null;
  preOrderNote:     string | null;
  tone:             string;
  courier:          string | null;
  customCourierName: string;
  waybill:          string;
  message:          string;
  orderItems:       string;
}

const DRAFT_KEY = 'orderping_draft';

export function getDraft(): FormDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveDraft(draft: FormDraft): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
}

export function clearDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}
