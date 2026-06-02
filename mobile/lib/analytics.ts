import type PostHog from 'posthog-react-native';

const POSTHOG_KEY  = process.env.EXPO_PUBLIC_POSTHOG_KEY  ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

let client: PostHog | null = null;

function getClient(): PostHog | null {
  // No key configured (e.g. production builds without analytics) → never touch the native module.
  if (!POSTHOG_KEY) return null;
  if (!client) {
    try {
      // Lazy require so the posthog-react-native NATIVE module is only loaded when analytics
      // is actually configured. A static import would crash on any build that ships the JS
      // (e.g. an OTA update) without the native module embedded.
      const PostHogCtor = require('posthog-react-native').default;
      client = new PostHogCtor(POSTHOG_KEY, {
        host:    POSTHOG_HOST,
        // Disable in dev — comment out this line to test tracking locally
        disabled: __DEV__,
      });
    } catch {
      return null;
    }
  }
  return client;
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  // PostHog expects JSON-serializable values; values originate as plain JSON, so cast at the boundary.
  getClient()?.identify(userId, traits as Record<string, any> | undefined);
}

export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  getClient()?.capture(event, properties as Record<string, any> | undefined);
}

export function resetUser(): void {
  getClient()?.reset();
}
