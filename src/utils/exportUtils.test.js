import { flattenInvoiceData, flattenInvoiceDataByPayment, flattenAdvanceData, ADVANCE_COLUMNS } from './exportUtils';

describe('flattenAdvanceData', () => {
  it('flattens customer advance summary with all required columns', () => {
    const row = {
      customerId: 'cust-1',
      customerName: 'Aarav Patel',
      customerCode: 'CUST-001',
      phone: '9876543210',
      availableBalance: '5000.00',
      totalReceived: '15000.00',
      totalApplied: '8000.00',
      totalRefunded: '2000.00',
      totalTransferOut: '0.00',
      totalTransferIn: '0.00',
      firstReceivedAt: '2026-01-15T10:00:00Z',
      transactions: [
        { date: '2026-01-15T10:00:00Z', type: 'ADVANCE_RECEIVED', amount: 15000 },
        { date: '2026-03-20T14:30:00Z', type: 'ADVANCE_APPLIED', amount: 8000 },
      ],
    };

    const flattened = flattenAdvanceData(row);

    expect(flattened['Customer Name']).toBe('Aarav Patel');
    expect(flattened['Customer Code']).toBe('CUST-001');
    expect(flattened['Phone']).toBe('9876543210');
    expect(flattened['Balance Status']).toBe('Available');
    expect(flattened['Total Received']).toBe('15000.00');
    expect(flattened['Applied to Invoices']).toBe('8000.00');
    expect(flattened['Refunded']).toBe('2000.00');
    expect(flattened['Transferred Out']).toBe('0.00');
    expect(flattened['Transferred In']).toBe('0.00');
    expect(flattened['Available Balance']).toBe('5000.00');
    expect(flattened['First Received Date']).toBe('15 JAN 2026');
    expect(flattened['Last Activity Date']).toBe('20 MAR 2026');

    // All keys in ADVANCE_COLUMNS should be present in the flattened object
    ADVANCE_COLUMNS.forEach((col) => {
      expect(flattened).toHaveProperty(col);
    });
  });

  it('reports Settled status when available balance is zero', () => {
    const row = {
      customerName: 'Priya Sharma',
      availableBalance: 0,
      totalReceived: 5000,
      totalApplied: 5000,
    };

    const flattened = flattenAdvanceData(row);
    expect(flattened['Balance Status']).toBe('Settled');
    expect(flattened['Available Balance']).toBe('0.00');
  });

  it('derives last activity from lastReceivedAt when transactions array is empty', () => {
    const row = {
      customerName: 'Vikram Mehta',
      lastReceivedAt: '2026-04-10T11:00:00Z',
    };

    const flattened = flattenAdvanceData(row);
    expect(flattened['Last Activity Date']).toBe('10 APR 2026');
  });
});

describe('flattenInvoiceData', () => {
  it('keeps common title prefixes with the first name column', () => {
    const rows = flattenInvoiceData({
      invoiceNumber: 'MJ/60/26-27',
      invoiceDate: '2026-05-05',
      buyerSnapshot: {
        data: {
          name: 'MR. MANOJ SINGH',
          address: 'LAIN',
          phone: '7069121539',
        },
      },
      items: [
        {
          slNo: 1,
          description: 'CHOKAR',
          hsnSac: '711319',
          metalType: 'GOLD',
          netWeight: 1.96,
          metalRate: 13000,
        },
      ],
    });

    expect(rows[0]['Customer Name']).toBe('MR. MANOJ');
    expect(rows[0]['Last Name']).toBe('SINGH');
  });
});

describe('flattenInvoiceDataByPayment & payment mode bucketing', () => {
  const sampleInvoice = {
    invoiceNumber: 'INV/10/26-27',
    invoiceDate: '2026-11-10',
    totalAmount: 45000,
    paidAmount: 45000,
    buyerSnapshot: { data: { name: 'Priya Sharma', address: 'MG Road', phone: '9999999999' } },
    items: [
      { slNo: 1, description: 'Gold Ring', hsnSac: '7113', metalType: 'GOLD', netWeight: 5, metalRate: 7000, taxableAmount: 43689.32 },
    ],
    payments: [
      { mode: 'UPI', amount: 10000, paidAt: '2026-01-10', source: 'ADVANCE', sourceCustomerName: 'Sita Devi', reference: 'UTR-1' },
      { mode: 'CASH', amount: 10000, paidAt: '2026-02-10', source: 'ADVANCE', sourceCustomerName: 'Sita Devi' },
      { mode: 'CASH', amount: 25000, paidAt: '2026-11-10', source: 'DIRECT' },
    ],
  };

  it('buckets advance-backed UPI and CASH payments into UPI and Cash columns', () => {
    const rows = flattenInvoiceData(sampleInvoice);
    expect(rows[0]['UPI']).toBe('10000.00');
    expect(rows[0]['Cash']).toBe('35000.00');
    expect(rows[0]['Other']).toBe('0.00');
  });

  it('outputs one row per payment installment preserving original date, mode, and source', () => {
    const rows = flattenInvoiceDataByPayment(sampleInvoice);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r['Payment Date'])).toEqual(['10 JAN 2026', '10 FEB 2026', '10 NOV 2026']);
    expect(rows.map((r) => r['Payment Mode'])).toEqual(['UPI', 'Cash', 'Cash']);
    expect(rows.map((r) => r['Payment Source'])).toEqual(['Advance (Sita Devi)', 'Advance (Sita Devi)', 'Direct']);
    expect(rows.map((r) => r['Payment Amount'])).toEqual(['10000.00', '10000.00', '25000.00']);
    expect(rows[0]['Payment Ref']).toBe('UTR-1');
  });
});
