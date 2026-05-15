export function buildWhatsAppLink(phone: string, message: string): string {
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  const wa = clean.startsWith('0') ? '27' + clean.slice(1) : clean;
  return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
}

export function buildSMSLink(phone: string, message: string): string {
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  return `sms:${clean}?body=${encodeURIComponent(message)}`;
}

export function buildEmailLink(email: string, businessName: string, message: string): string {
  const subject = encodeURIComponent(`Order Update — ${businessName}`);
  const body = encodeURIComponent(message);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
