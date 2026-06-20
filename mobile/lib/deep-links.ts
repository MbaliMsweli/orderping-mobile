import { Linking, Platform } from 'react-native';
import { buildWhatsAppLink, buildSMSLink, buildEmailLink } from '@shared/deep-links';

// All three return false (instead of throwing) when the target app/scheme isn't
// available on the device, so callers can show an Alert instead of a silent no-op.

export async function openWhatsApp(phone: string, message: string): Promise<boolean> {
  try {
    await Linking.openURL(buildWhatsAppLink(phone, message)); // wa.me always resolves via browser fallback
    return true;
  } catch {
    return false;
  }
}

export async function openSMS(phone: string, message: string): Promise<boolean> {
  const separator = Platform.OS === 'ios' ? '&' : '?';
  const url = buildSMSLink(phone, message, separator);
  const supported = await Linking.canOpenURL(url);
  if (!supported) return false;
  await Linking.openURL(url);
  return true;
}

export async function openEmail(email: string, businessName: string, message: string): Promise<boolean> {
  const url = buildEmailLink(email, businessName, message);
  const supported = await Linking.canOpenURL(url);
  if (!supported) return false;
  await Linking.openURL(url);
  return true;
}
