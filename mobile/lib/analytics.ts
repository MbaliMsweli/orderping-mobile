import PostHog from 'posthog-react-native';

const POSTHOG_KEY  = process.env.EXPO_PUBLIC_POSTHOG_KEY  ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!POSTHOG_KEY) return null;
  if (!client) {
    client = new PostHog(POSTHOG_KEY, {
      host:    POSTHOG_HOST,
      // Disable in dev — comment out this line to test tracking locally
      disabled: __DEV__,
    });
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
