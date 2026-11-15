// Payment rows sorted by date, earliest first. Rows without a date go last; rows on the same
// date keep the order they were entered in. Returns a new array.
export const sortPaymentsByDate = (payments = []) =>
  payments
    .map((payment, index) => ({ payment, index }))
    .sort((a, b) => {
      const da = a.payment?.paidAt || '';
      const db = b.payment?.paidAt || '';
      if (da !== db) {
        if (!da) return 1;
        if (!db) return -1;
        return da < db ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map(({ payment }) => payment);

/**
 * Merge direct payments and selected advance receipts into a single, chronologically-sorted
 * list of payment entries suitable for the invoice preview HTML and the payload.
 *
 * Each advance entry is mapped to a payment-shaped object with `source: 'ADVANCE'` and
 * carries its original `paidAt` (the receipt's `transactionDate`), `mode` (the receipt's
 * `paymentMethod`), `reference`, and an optional `sourceCustomerName` for cross-customer
 * advance billing.
 *
 * @param {Array<{ mode: string, amount: number|string, paidAt?: string, reference?: string }>} directPayments
 * @param {Array<{
 *   advanceEntryId: string,
 *   sourceCustomerId: string,
 *   sourceCustomerName?: string,
 *   transactionDate?: string,
 *   paymentMethod?: string,
 *   reference?: string,
 *   applyAmount: number,
 * }>} selectedAdvances
 * @returns {Array<{ mode: string, amount: number, paidAt?: string, reference?: string, source: 'DIRECT'|'ADVANCE', sourceCustomerName?: string }>}
 */
export const buildMergedInvoicePayments = (directPayments = [], selectedAdvances = []) => {
  const directRows = directPayments.map((p) => ({
    mode: p.mode,
    amount: parseFloat(p.amount) || 0,
    paidAt: p.paidAt,
    reference: p.reference,
    source: 'DIRECT',
  }));

  const advanceRows = selectedAdvances
    .filter((a) => (parseFloat(a.applyAmount) || 0) > 0)
    .map((a) => ({
      mode: a.paymentMethod || 'CREDIT',
      amount: parseFloat(a.applyAmount) || 0,
      paidAt: a.transactionDate,
      reference: a.reference,
      source: 'ADVANCE',
      sourceCustomerName: a.sourceCustomerName,
    }));

  return sortPaymentsByDate([...directRows, ...advanceRows]);
};

/**
 * Calculate the total paid amount across both direct payments and selected advance receipts.
 * This is the single source of truth for the bottom bar, preview HTML, and overpayment checks.
 *
 * @param {Array<{ amount: number|string }>} directPayments
 * @param {Array<{ applyAmount: number|string }>} selectedAdvances
 * @returns {number}
 */
export const getTotalPaidWithAdvances = (directPayments = [], selectedAdvances = []) => {
  const directTotal = directPayments.reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0,
  );
  const advanceTotal = selectedAdvances.reduce(
    (sum, a) => sum + (parseFloat(a.applyAmount) || 0),
    0,
  );
  return directTotal + advanceTotal;
};

/**
 * Calculate just the advance-sourced portion of payments.
 *
 * @param {Array<{ applyAmount: number|string }>} selectedAdvances
 * @returns {number}
 */
export const getTotalAdvanceApplied = (selectedAdvances = []) =>
  selectedAdvances.reduce(
    (sum, a) => sum + (parseFloat(a.applyAmount) || 0),
    0,
  );

/**
 * Build the `advanceAllocations` array expected by the backend for atomic invoice creation.
 *
 * @param {Array<{ advanceEntryId: string, sourceCustomerId: string, applyAmount: number|string }>} selectedAdvances
 * @returns {Array<{ advanceEntryId: string, sourceCustomerId: string, amount: number }>}
 */
export const buildAdvanceAllocations = (selectedAdvances = []) =>
  selectedAdvances
    .filter((a) => (parseFloat(a.applyAmount) || 0) > 0)
    .map((a) => ({
      advanceEntryId: a.advanceEntryId,
      sourceCustomerId: a.sourceCustomerId,
      amount: parseFloat(a.applyAmount) || 0,
    }));
