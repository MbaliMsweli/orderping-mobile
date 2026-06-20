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
      try {
        // getUser() validates the JWT server-side; getSession() only reads local cache
        const [cachedProfile, { data: { user } }] = await Promise.all([
          getProfile(),
          supabase.auth.getUser(),
        ]);

        if (!user) {
          router.replace('/(auth)');
          return;
        }

        if (cachedProfile) {
          if (!user.is_anonymous) syncProfileToSupabase(cachedProfile);
          router.replace('/(main)');
        } else if (user.is_anonymous) {
          router.replace('/(setup)');
        } else {
          const remoteProfile = await fetchProfileFromSupabase();
          router.replace(remoteProfile ? '/(main)' : '/(setup)');
        }
      } catch {
        // Network/auth failure during the check — fail safe rather than hang on the spinner forever.
        router.replace('/(auth)');
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
