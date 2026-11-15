/**
 * Everything that added to a customer's advance balance:
 * deposits + transfers in + net corrections.
 * With Applied and Returned/sent this adds up to the available balance.
 */
export const getAdvanceTotalIn = (r = {}) =>
  Number(r.totalReceived || 0) +
  Number(r.totalTransferIn || 0) +
  Number(r.totalCorrectionCredit || 0) -
  Number(r.totalCorrectionDebit || 0);
