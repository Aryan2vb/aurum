// Digits only, with India's country code added when the number has none.
export const normalizeWhatsAppPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
};

export const buildInvoiceWhatsAppMessage = ({ customerName, invoiceNumber, amount, firmName, pdfUrl, attachedNote }) => {
  const greeting = customerName ? `Hi ${customerName}` : 'Hello';
  const total = Number(amount);
  const amountText = Number.isFinite(total) && total > 0
    ? ` of ₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '';
  const from = firmName ? ` from ${firmName}` : '';
  const lines = [`${greeting}, please find your invoice ${invoiceNumber || ''}${amountText}${from}.`.replace(/\s+\./, '.')];
  if (pdfUrl) lines.push('', `Download PDF: ${pdfUrl}`);
  if (attachedNote) lines.push('', 'The invoice PDF is attached.');
  lines.push('', 'Thank you!');
  return lines.join('\n');
};

export const buildWhatsAppUrl = (phone, message) => {
  const normalized = normalizeWhatsAppPhone(phone);
  const base = normalized ? `https://wa.me/${normalized}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
};

// True on phones and tablets, where the share sheet lists WhatsApp directly. On desktop (a Mac's
// share sheet offers AirDrop, Mail, ...) we open the WhatsApp chat instead. iPadOS reports "Macintosh".
export const isMobileDevice = (nav = typeof navigator !== 'undefined' ? navigator : {}) => {
  if (nav.userAgentData?.mobile) return true;
  const ua = nav.userAgent || '';
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && (nav.maxTouchPoints || 0) > 1;
};
