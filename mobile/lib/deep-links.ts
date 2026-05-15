import { Linking, Platform } from 'react-native';

function formatWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '27' + digits.slice(1);
  if (digits.startsWith('27')) return digits;
  return '27' + digits;
}

export function openWhatsApp(phone: string, message: string): void {
  const number  = formatWhatsAppNumber(phone);
  const encoded = encodeURIComponent(message);
  Linking.openURL(`https://wa.me/${number}?text=${encoded}`);
}

export function openSMS(phone: string, message: string): void {
  const encoded   = encodeURIComponent(message);
  const separator = Platform.OS === 'ios' ? '&' : '?';
  Linking.openURL(`sms:${phone}${separator}body=${encoded}`);
}

export function openEmail(email: string, businessName: string, message: string): void {
  const subject = encodeURIComponent(`Order update from ${businessName}`);
  const body    = encodeURIComponent(message);
  Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
}
