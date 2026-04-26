/**
 * Single source of truth for all invoice calculations.
 * Used by Calculation Hub, preview hydration, and HTML templates.
 */

export const parsePurity = (purityLabel = '22K') => {
  const label = (purityLabel || '22K').toString().toUpperCase();
  const isKarat = label.includes('K');
  const num = parseFloat(label.replace(/[Kk]/, ''));
  
  if (isNaN(num)) return { purityValue: 22, purityBasis: 24 };

  return {
    purityValue: num,
    purityBasis: isKarat ? 24 : 1000,
  };
};

export const calcItemAmount = (item) => {
  const quantity = parseFloat(item.quantity || 1);
  // Per user request: Metal rate is already for the specific carat, so no conversion needed.
  const effectiveRate = parseFloat(item.rate || item.metalRate || 0);
  const netWeight = parseFloat(item.grossWeight || 0) - parseFloat(item.stoneWeight || 0);
  const makingChargesRaw = parseFloat(item.makingCharges || 0);
  const makingChargesType = item.makingChargesType || 'FLAT_PER_ITEM';
  const makingChargesAmount =
    makingChargesType === 'PER_GRAM' ? makingChargesRaw * netWeight :
    makingChargesType === 'PERCENTAGE_ON_METAL' ? (effectiveRate * netWeight) * (makingChargesRaw / 100) :
    makingChargesRaw * quantity; // FLAT_PER_ITEM multiplied by quantity
  const stoneCharges = parseFloat(item.stoneCharges || 0);
  
  const isHallmarked = !!item.huid;
  const hallmarkCharge = isHallmarked ? parseFloat(item.hallmarkCharge || 0) : 0;
  
  return {
    effectiveRate,
    netWeight,
    makingChargesAmount,
    hallmarkCharge,
    amount: (effectiveRate * netWeight) + makingChargesAmount + stoneCharges + hallmarkCharge,
  };
};

export const calcInvoiceTotals = (items, cgstRate, sgstRate, paidAmount = 0) => {
  let subtotal = 0;
  const hydratedItems = items.map(item => {
    const { effectiveRate, netWeight, amount, hallmarkCharge } = calcItemAmount(item);
    subtotal += amount;
    return { ...item, effectiveRate, netWeight, amount, hallmarkCharge };
  });

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
