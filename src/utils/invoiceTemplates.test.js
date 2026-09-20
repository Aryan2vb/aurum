import {
  generateInvoiceHtml,
  generateJewelleryInvoiceHtml,
  generateModernInvoiceHtml,
  getInvoiceDocumentTitle,
  INVOICE_TEMPLATES,
  normalizeTemplateType,
  resolveInvoiceTemplate,
} from './invoiceTemplates';

describe('getInvoiceDocumentTitle', () => {
  it('includes the customer name before the invoice number', () => {
    expect(getInvoiceDocumentTitle({
      buyer: { name: 'Customer Name' },
      metadata: { invoiceNo: 'RK_13_26-27' },
    })).toBe('Tax Invoice - Customer Name - RK_13_26-27');
  });

  it('keeps the existing title format when the customer name is missing', () => {
    expect(getInvoiceDocumentTitle({
      buyer: {},
      metadata: { invoiceNo: 'RK_13_26-27' },
    })).toBe('Tax Invoice - RK_13_26-27');
  });
});

describe('invoice payment dates', () => {
  const invoiceData = {
    company: {},
    buyer: {},
    metadata: {},
    items: [],
    taxes: { cgstRate: 0, cgstAmount: 0, sgstRate: 0, sgstAmount: 0 },
    hsnSummary: [],
    roundOff: 0,
    totalAmount: 100,
    payments: [{ mode: 'CASH', amount: 100, paidAt: '2026-05-22' }],
  };

  test.each([
    ['classic', generateInvoiceHtml],
    ['modern', generateModernInvoiceHtml],
    ['jewellery', generateJewelleryInvoiceHtml],
  ])('shows the selected payment date in the %s template', (_name, generateHtml) => {
    expect(generateHtml(invoiceData)).toContain('CASH: ₹100.00 · 22/05/26');
  });
});


describe('invoice format helpers', () => {
  it('lists the three formats, standard first', () => {
    expect(INVOICE_TEMPLATES.map((t) => t.value)).toEqual(['standard', 'modern', 'jewellery']);
  });

  it('folds the "classic" (editor) and "default" (settings) aliases into standard', () => {
    expect(normalizeTemplateType('classic')).toBe('standard');
    expect(normalizeTemplateType('default')).toBe('standard');
    expect(normalizeTemplateType('standard')).toBe('standard');
    expect(normalizeTemplateType('jewellery')).toBe('jewellery');
    expect(normalizeTemplateType('modern')).toBe('modern');
    expect(normalizeTemplateType(undefined)).toBeUndefined();
  });

  describe('resolveInvoiceTemplate', () => {
    it('opens an existing invoice in its own saved format, not the org default', () => {
      expect(resolveInvoiceTemplate('standard', 'jewellery')).toBe('standard');
      expect(resolveInvoiceTemplate('jewellery', 'default')).toBe('jewellery');
      expect(resolveInvoiceTemplate('classic', 'jewellery')).toBe('standard');
    });

    it('uses the org default for a new invoice (nothing saved yet)', () => {
      expect(resolveInvoiceTemplate(null, 'jewellery')).toBe('jewellery');
      expect(resolveInvoiceTemplate(undefined, 'default')).toBe('standard');
    });

    it('falls back to standard when neither is set', () => {
      expect(resolveInvoiceTemplate(null, null)).toBe('standard');
    });
  });
});

// Width of every row of the items table, counting cells carried down by a rowspan
// (the merged payments cell), so a misaligned row shows up.
const rowWidths = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const carried = [];
  return [...doc.querySelectorAll('.items-table tr')].map((tr) => {
    let width = carried.reduce((sum, c) => sum + c.span, 0);
    const added = [];
    [...tr.children].forEach((cell) => {
      width += cell.colSpan || 1;
      if (cell.rowSpan > 1) added.push({ span: cell.colSpan || 1, remaining: cell.rowSpan - 1 });
    });
    carried.forEach((c) => { c.remaining -= 1; });
    for (let i = carried.length - 1; i >= 0; i -= 1) if (carried[i].remaining <= 0) carried.splice(i, 1);
    carried.push(...added);
    return width;
  });
};

describe('standard invoice purity column', () => {
  const data = (items, extra = {}) => ({
    company: {},
    buyer: {},
    metadata: {},
    items,
    taxes: { cgstRate: 1.5, cgstAmount: 1.5, sgstRate: 1.5, sgstAmount: 1.5 },
    hsnSummary: [],
    roundOff: 0,
    totalAmount: 103,
    amtBalance: 0,
    ...extra,
  });
  const item = (over = {}) => ({
    slNo: 1, description: 'Gold Ring', hsnSac: '7113', grossWeight: 5, netWeight: 4.8,
    metalRate: 6000, rate: 6000, quantity: 1, amount: 28800, ...over,
  });

  it('has a Purity header and prints each item purity', () => {
    const html = generateInvoiceHtml(data([item({ purity: '22K' }), item({ slNo: 2, purity: '24K' })]));
    expect(html).toContain('>Purity</th>');
    expect(html).toContain('<td class="text-center">22K</td>');
    expect(html).toContain('<td class="text-center">24K</td>');
  });

  it.each([undefined, '', 'None', 'NONE', '-'])('prints a dash when purity is %p', (purity) => {
    expect(generateInvoiceHtml(data([item({ purity })]))).toContain('<td class="text-center">-</td>');
  });

  it('keeps every row of the items table the same width', () => {
    const html = generateInvoiceHtml(
      data([item({ purity: '22K' })], {
        payments: [{ mode: 'CASH', amount: 103, paidAt: '2025-04-01T00:00:00.000Z' }],
        taxes: { cgstRate: 1.5, cgstAmount: 1.5, sgstRate: 1.5, sgstAmount: 1.5, igstRate: 3, igstAmount: 3 },
      }),
    );
    const widths = rowWidths(html);
    expect(widths.length).toBeGreaterThan(8);
    expect(new Set(widths)).toEqual(new Set([8]));
  });

  it('stays aligned in the cash-received layout too', () => {
    const html = generateInvoiceHtml(data([item({ purity: '22K' })], { cashReceived: 50 }));
    expect(new Set(rowWidths(html))).toEqual(new Set([8]));
  });
});


describe('standard invoice payment placement', () => {
  const payments = [
    { mode: 'UPI', amount: 50000, paidAt: '2025-04-01T00:00:00.000Z' },
    { mode: 'CASH', amount: 20000, paidAt: '2025-04-02T00:00:00.000Z' },
  ];
  const data = (extra = {}) => ({
    company: {}, buyer: {}, metadata: {},
    items: [{ slNo: 1, description: 'Gold Ring', hsnSac: '7113', grossWeight: 5, netWeight: 4.8,
      metalRate: 6000, rate: 6000, quantity: 1, amount: 28800, purity: '22K' }],
    taxes: { cgstRate: 1.5, cgstAmount: 1.5, sgstRate: 1.5, sgstAmount: 1.5 },
    hsnSummary: [], roundOff: 0, totalAmount: 103, amtBalance: 33, ...extra,
  });
  const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

  it('lists each payment in a merged cell on the left of the tax block', () => {
    const cell = parse(generateInvoiceHtml(data({ payments }))).querySelector('.items-table td.payments-cell');
    expect(cell).not.toBeNull();
    expect(cell.textContent).toContain('UPI');
    expect(cell.textContent).toContain('CASH');
    expect(cell.rowSpan).toBe(4); // taxable value + CGST + SGST + round off
    expect(cell.colSpan).toBe(3);
  });

  it('shows only the payment lines, without a "Payment Received" heading', () => {
    const html = generateInvoiceHtml(data({ payments }));
    expect(html).not.toContain('Payment Received');
    expect(parse(html).querySelector('td.payments-cell').firstElementChild.textContent).toContain('UPI');
  });

  it('puts the payments cell in the Taxable Value row, before its label', () => {
    const firstTaxRow = parse(generateInvoiceHtml(data({ payments }))).querySelector('.items-table tr.tax-row');
    const cells = [...firstTaxRow.children];
    expect(cells[0].classList.contains('payments-cell')).toBe(true);
    expect(cells[1].textContent).toBe('Taxable Value:');
  });

  it('no longer prints full-width payment rows between Total and Balance Due', () => {
    const rows = [...parse(generateInvoiceHtml(data({ payments }))).querySelectorAll('.items-table tr')];
    const total = rows.findIndex((r) => r.classList.contains('total-row'));
    const balance = rows.findIndex((r) => r.textContent.includes('Balance Due'));
    expect(rows.slice(total + 1, balance).map((r) => r.textContent)).toEqual([]);
  });

  it('keeps the full-width tax layout when there are no payments', () => {
    const doc = parse(generateInvoiceHtml(data()));
    expect(doc.querySelector('.items-table td.payments-cell')).toBeNull();
    expect(doc.querySelector('.items-table tr.tax-row td').colSpan).toBe(7);
  });

  it('adds a merged row for IGST when present and stays aligned', () => {
    const html = generateInvoiceHtml(data({
      payments,
      taxes: { cgstRate: 1.5, cgstAmount: 1.5, sgstRate: 1.5, sgstAmount: 1.5, igstRate: 3, igstAmount: 3 },
    }));
    expect(parse(html).querySelector('td.payments-cell').rowSpan).toBe(5);
    expect(new Set(rowWidths(html))).toEqual(new Set([8]));
  });
});
