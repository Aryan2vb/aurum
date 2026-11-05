// Digits only, with India's country code added when the number has none.
export const normalizeWhatsAppPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
};

export const buildInvoiceWhatsAppMessage = ({ customerName, invoiceNumber, amount, firmName, invoiceUrl }) => {
  const greeting = customerName ? `Hi ${customerName}` : 'Hello';
  const total = Number(amount);
  const amountText = Number.isFinite(total) && total > 0
    ? ` of ₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '';
  const from = firmName ? ` from ${firmName}` : '';
  const lines = [`${greeting}, please find your invoice ${invoiceNumber || ''}${amountText}${from}.`.replace(/\s+\./, '.')];
  if (invoiceUrl) lines.push('', `View your invoice: ${invoiceUrl}`);
  lines.push('', 'Thank you!');
  return lines.join('\n');
};

export const buildWhatsAppUrl = (phone, message) => {
  const normalized = normalizeWhatsAppPhone(phone);
  const base = normalized ? `https://wa.me/${normalized}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
};
