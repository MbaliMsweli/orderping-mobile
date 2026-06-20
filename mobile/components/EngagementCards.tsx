import { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Colors } from '@/constants/colors';
import { relativeTime } from '@/lib/format';
import { STATUS_BADGES } from '@/lib/status-config';
import { setWeekReportDismissed } from '@/lib/storage';
import { getWeekKey } from '@/lib/engagement';
import type { RecentEntry, BusinessProfile } from '@/lib/storage';
import type { ForgottenCustomer, WeekSummary } from '@/lib/engagement';

interface Props {
  // Guest
  showGuestGate:          boolean;
  isGuest:                boolean;
  guestSent:              number;
  guestBannerDismissed:   boolean;
  setGuestBannerDismissed:(v: boolean) => void;
  onGuestAuth:            () => void;
  // Stats
  todayCount:             number;
  // Weekly card
  showWeekCard:           boolean;
  setShowWeekCard:        (v: boolean) => void;
  weekSummary:            WeekSummary | null;
  // Welcome back
  showWelcomeBack:        boolean;
  setShowWelcomeBack:     (v: boolean) => void;
  hoursAway:              number;
  forgotten:              ForgottenCustomer[];
  // Reminder
  lastEntry:              RecentEntry | null;
  profile:                BusinessProfile | null;
  // Callbacks to pre-fill the form
  onSelectForgotten:      (name: string, phone: string, email: string) => void;
}

const REMINDER_VISIBLE_LIMIT = 5;

function EngagementCards({
  showGuestGate, isGuest, guestSent, guestBannerDismissed, setGuestBannerDismissed, onGuestAuth,
  todayCount,
  showWeekCard, setShowWeekCard, weekSummary,
  showWelcomeBack, setShowWelcomeBack, hoursAway, forgotten,
  lastEntry, profile,
  onSelectForgotten,
}: Props) {
  return (
    <>
      {/* Guest gate modal */}
      <Modal visible={showGuestGate} transparent animationType="fade">
        <View style={s.gateOverlay}>
          <View style={s.gateCard}>
            <Text style={s.gateEmoji}>🔒</Text>
            <Text style={s.gateTitle}>You've used your 10 free updates</Text>
            <Text style={s.gateBody}>
              Sign up free to keep going — your data and history stay exactly as they are.
            </Text>
            <TouchableOpacity style={s.gateSignUp} onPress={onGuestAuth} activeOpacity={0.85}>
              <Text style={s.gateSignUpText}>Sign Up Free →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.gateSignIn} onPress={onGuestAuth} activeOpacity={0.8}>
              <Text style={s.gateSignInText}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Guest banner */}
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
            <TouchableOpacity onPress={onGuestAuth}>
              <Text style={s.guestBannerLink}>Sign up →</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setGuestBannerDismissed(true)} style={s.guestBannerClose}>
            <Text style={s.dismiss}>✕</Text>
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
              <Text style={s.dismiss}>✕</Text>
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
            <Text style={s.dismiss}>✕</Text>
          </TouchableOpacity>
          <Text style={s.welcomeTitle}>👋 Welcome back{profile?.businessName ? `, ${profile.businessName.split(' ')[0]}` : ''}!</Text>
          <Text style={s.welcomeSub}>You've been away {hoursAway} day{hoursAway !== 1 ? 's' : ''}.</Text>
          {forgotten.length > 0 && (
            <Text style={s.welcomePending}>{forgotten.length} customer{forgotten.length !== 1 ? 's' : ''} may need an update.</Text>
          )}
        </View>
      )}

      {/* Reminder / all-good */}
      {lastEntry && (
        forgotten.length > 0 ? (
          <View style={s.reminderCard}>
            <Text style={s.reminderLastLine}>
              Last update: <Text style={s.reminderLastName}>{lastEntry.customerName}</Text>
              {' '}<Text style={s.reminderLastMeta}>({STATUS_BADGES[lastEntry.status]?.label ?? lastEntry.status} · {relativeTime(lastEntry.timestamp)})</Text>
            </Text>
            <Text style={s.reminderQuestion}>Are you sure you're not missing anyone? 👀</Text>
            {forgotten.slice(0, REMINDER_VISIBLE_LIMIT).map((c) => (
              <TouchableOpacity
                key={c.phoneNumber}
                style={s.reminderRow}
                onPress={() => onSelectForgotten(c.customerName, c.phoneNumber, c.email ?? '')}
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
            {forgotten.length > REMINDER_VISIBLE_LIMIT && (
              <Text style={s.reminderMore}>
                +{forgotten.length - REMINDER_VISIBLE_LIMIT} more — open Recent to see everyone
              </Text>
            )}
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
    </>
  );
}

export default memo(EngagementCards);

const s = StyleSheet.create({
  // Guest gate modal
  gateOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  gateCard:       { backgroundColor: Colors.surface, borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', maxWidth: 340, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  gateEmoji:      { fontSize: 44, marginBottom: 16 },
  gateTitle:      { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 },
  gateBody:       { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  gateSignUp:     { width: '100%', backgroundColor: Colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 10, minHeight: 54, justifyContent: 'center', shadowColor: Colors.primary, shadowOpacity: 0.35, shadowRadius: 12, elevation: 4 },
  gateSignUpText: { color: 'white', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  gateSignIn:     { width: '100%', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 16, padding: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  gateSignInText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },

  // Guest banner
  guestBanner:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A', borderRadius: 14, marginHorizontal: 16, marginTop: 16, padding: 14 },
  guestBannerWarn:     { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' },
  guestBannerBody:     { flex: 1 },
  guestBannerText:     { fontSize: 13, color: '#92400E', marginBottom: 4 },
  guestBannerWarnText: { color: '#9A3412' },
  guestBannerLink:     { fontSize: 13, fontWeight: '700', color: '#D97706' },
  guestBannerClose:    { paddingLeft: 12 },
  dismiss:             { fontSize: 16, color: Colors.textMuted, paddingHorizontal: 4 },

  // Stats
  statsCard:   { backgroundColor: '#EEF4FF', marginHorizontal: 16, marginTop: 16, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 24, alignItems: 'center', borderWidth: 1, borderColor: '#C7D9FF' },
  statsRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statsBigNum: { fontSize: 48, fontWeight: '800', color: Colors.primary, lineHeight: 54, letterSpacing: -1 },
  statsTrend:  { fontSize: 26, marginTop: 2 },
  statsLabel:  { fontSize: 13, color: Colors.primary, fontWeight: '600', letterSpacing: 0.2, marginTop: 4, opacity: 0.7 },

  // Weekly card
  weekCard:       { backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 18, marginHorizontal: 16, marginTop: 16, padding: 18 },
  weekCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  weekCardTitle:  { fontSize: 16, fontWeight: '700', color: '#1E40AF', letterSpacing: -0.1 },
  weekCardStats:  { flexDirection: 'row', justifyContent: 'space-around' },
  weekStat:       { alignItems: 'center' },
  weekStatNum:    { fontSize: 28, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5 },
  weekStatLabel:  { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginTop: 4, letterSpacing: 0.6 },

  // Welcome back
  welcomeCard:    { backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#BBF7D0', borderRadius: 18, marginHorizontal: 16, marginTop: 16, padding: 18 },
  welcomeClose:   { position: 'absolute', top: 14, right: 14 },
  welcomeTitle:   { fontSize: 16, fontWeight: '700', color: '#166534', marginBottom: 4, letterSpacing: -0.1 },
  welcomeSub:     { fontSize: 14, fontWeight: '400', color: '#15803D', lineHeight: 21, marginBottom: 6 },
  welcomePending: { fontSize: 13, fontWeight: '600', color: '#166534' },

  // Reminder
  reminderCard:     { backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#FED7AA', borderRadius: 18, marginHorizontal: 16, marginTop: 16, padding: 18 },
  reminderLastLine: { fontSize: 13, fontWeight: '400', color: '#92400E', marginBottom: 10, lineHeight: 20 },
  reminderLastName: { fontWeight: '700', color: '#78350F' },
  reminderLastMeta: { fontWeight: '400', color: '#B45309' },
  reminderQuestion: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 12 },
  reminderRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 8 },
  reminderName:     { fontSize: 14, fontWeight: '600', color: '#78350F' },
  reminderMeta:     { fontSize: 12, fontWeight: '500', color: '#B45309', marginTop: 2 },
  reminderArrow:    { fontSize: 16, color: '#B45309', fontWeight: '600' },
  reminderMore:     { fontSize: 12, fontWeight: '600', color: '#B45309', textAlign: 'center', marginTop: 4 },

  // All good
  allGoodCard:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 20, marginHorizontal: 16, marginTop: 16, paddingVertical: 16, paddingHorizontal: 18, shadowColor: '#16A34A', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  allGoodIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#86EFAC', alignItems: 'center', justifyContent: 'center' },
  allGoodIconText: { fontSize: 18, color: '#16A34A', fontWeight: '800', lineHeight: 22 },
  allGoodMain:     { fontSize: 15, fontWeight: '600', color: '#15803D', marginBottom: 3, letterSpacing: -0.1 },
  allGoodSub:      { fontSize: 13, fontWeight: '400', color: Colors.textMuted, lineHeight: 18 },
});
