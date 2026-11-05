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
