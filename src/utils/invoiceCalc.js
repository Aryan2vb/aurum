/**
 * Single source of truth for all invoice calculations.
 * Used by Calculation Hub, preview hydration, and HTML templates.
 */

export const parsePurity = (purityLabel = '22K') => {
  const isKarat = purityLabel.toUpperCase().includes('K');
  const num = parseFloat(purityLabel.replace(/[Kk]/, ''));
  return {
    purityValue: isKarat ? num : num / 10,
    purityBasis: isKarat ? 24 : 1000,
  };
};

export const calcItemAmount = (item) => {
  const { purityValue, purityBasis } = parsePurity(item.purity || item.purityLabel || '22K');
  const effectiveRate = parseFloat(item.rate || item.metalRate || 0) * (purityValue / purityBasis);
  const netWeight = parseFloat(item.grossWeight || 0) - parseFloat(item.stoneWeight || 0);
  const makingChargesRaw = parseFloat(item.makingCharges || 0);
  const makingChargesType = item.makingChargesType || 'FLAT_PER_ITEM';
  const makingChargesAmount =
    makingChargesType === 'PER_GRAM' ? makingChargesRaw * netWeight :
    makingChargesType === 'PERCENTAGE_ON_METAL' ? (effectiveRate * netWeight) * (makingChargesRaw / 100) :
    makingChargesRaw; // FLAT_PER_ITEM
  const stoneCharges = parseFloat(item.stoneCharges || 0);
  return {
    effectiveRate,
    netWeight,
    makingChargesAmount,
    amount: (effectiveRate * netWeight) + makingChargesAmount + stoneCharges,
  };
};

export const calcInvoiceTotals = (items, hallmarkCharges, cgstRate, sgstRate, paidAmount = 0) => {
  let subtotal = 0;
  const hydratedItems = items.map(item => {
    const { effectiveRate, netWeight, amount } = calcItemAmount(item);
    subtotal += amount;
    return { ...item, effectiveRate, netWeight, amount };
  });

  subtotal += parseFloat(hallmarkCharges || 0);
  const cgst = Math.round(subtotal * ((cgstRate || 0) / 100) * 100) / 100;
  const sgst = Math.round(subtotal * ((sgstRate || 0) / 100) * 100) / 100;
  const gross = subtotal + cgst + sgst;
  const total = Math.round(gross);
  const roundOff = total - gross;

  return {
    hydratedItems,
    subtotal,
    cgst,
    sgst,
    taxable: subtotal,
    roundOff,
    total,
    outstanding: total - (parseFloat(paidAmount) || 0),
  };
};
