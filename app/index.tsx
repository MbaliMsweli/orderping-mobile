import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getProfile, fetchProfileFromSupabase, syncProfileToSupabase } from '@/lib/storage';
import { Colors } from '@/constants/colors';

export default function Index() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Read local cache first — avoids a visible spinner on every cold open
      const [cachedProfile, { data }] = await Promise.all([
        getProfile(),
        supabase.auth.getSession(),
      ]);

      if (!data.session) {
        router.replace('/(auth)');
        return;
      }

      if (cachedProfile) {
        // Navigate immediately from cache; sync to Supabase in the background
        syncProfileToSupabase(cachedProfile);
        router.replace('/(main)');
      } else {
        const remoteProfile = await fetchProfileFromSupabase();
        router.replace(remoteProfile ? '/(main)' : '/(setup)');
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <Text style={{ fontSize: 32, marginBottom: 24 }}>
        <Text style={{ fontWeight: '600', color: Colors.text }}>Order</Text>
        <Text style={{ fontWeight: '800', color: Colors.primary }}>Ping</Text>
      </Text>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
