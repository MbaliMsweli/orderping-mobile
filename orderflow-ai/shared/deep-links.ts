// Pure, framework-agnostic URL builders shared by mobile (react-native Linking)
// and web (window.open). Keeping this logic in one place avoids the two platforms
// drifting on phone normalization / separators / subject text.

function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const number = digits.startsWith('0') ? '27' + digits.slice(1)
    : digits.startsWith('27') ? digits
    : '27' + digits;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// iOS Messages requires `&body=`; every other platform (Android, web) uses `?body=`.
export function buildSMSLink(phone: string, message: string, separator: '?' | '&' = '?'): string {
  const safePhone = sanitizePhone(phone);
  return `sms:${safePhone}${separator}body=${encodeURIComponent(message)}`;
}

export function buildEmailLink(email: string, businessName: string, message: string): string {
  const safeEmail = encodeURIComponent(email.trim());
  const subject = encodeURIComponent(`Order update from ${businessName}`);
  const body = encodeURIComponent(message);
  return `mailto:${safeEmail}?subject=${subject}&body=${body}`;
}
