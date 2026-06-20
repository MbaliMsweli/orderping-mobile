import { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { getRecent, type RecentEntry } from '@/lib/storage';
import { detectFrustration, type FrustrationResult } from '@/lib/frustration';
import { getForgottenCustomers, type ForgottenCustomer, type WeekSummary } from '@/lib/engagement';

export function useEngagement({ phoneNumber }: { phoneNumber: string }) {
  // Stats + reminder
  const [todayCount, setTodayCount]     = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [milestone, setMilestone]       = useState<number | null>(null);
  const [lastEntry, setLastEntry]       = useState<RecentEntry | null>(null);
  const [forgotten, setForgotten]       = useState<ForgottenCustomer[]>([]);

  // Retention cards
  const [weekSummary, setWeekSummary]           = useState<WeekSummary | null>(null);
  const [showWeekCard, setShowWeekCard]         = useState(false);
  const [hoursAway, setHoursAway]               = useState(0);
  const [showWelcomeBack, setShowWelcomeBack]   = useState(false);

  // Recent messages view
  const [showRecent, setShowRecent]     = useState(false);
  const [recentList, setRecentList]     = useState<RecentEntry[]>([]);
  const [recentFilter, setRecentFilter] = useState('all');
  // Stable key (phoneNumber|timestamp) rather than array index, so an expanded
  // card stays correctly associated when the list re-filters or re-sorts.
  const [expandedKey, setExpandedKey]   = useState<string | null>(null);
  const [searchQuery, setSearchQuery]   = useState('');

  const filteredRecent = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recentList.filter(e => {
      const matchesFilter = recentFilter === 'all' || e.status === recentFilter;
      const matchesSearch = !q || e.customerName.toLowerCase().includes(q) || e.phoneNumber.includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [recentList, recentFilter, searchQuery]);

  // Mood detection — derived value, no extra render cycle needed
  const frustration: FrustrationResult = useMemo(() => {
    if (!phoneNumber.trim() || recentList.length === 0)
      return { level: 'none', signals: [], context: '' };
    return detectFrustration(phoneNumber.trim(), recentList);
  }, [phoneNumber, recentList]);

  // Guest mode
  const [isGuest, setIsGuest]                         = useState(false);
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false);
  const [guestSent, setGuestSent]                     = useState(0);
  const [showGuestGate, setShowGuestGate]             = useState(false);

  // Show milestone alert then clear
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

  // Refresh recent list when the Recent tab opens
  useEffect(() => {
    if (showRecent) getRecent().then(setRecentList);
  }, [showRecent]);

  return {
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
  };
}
